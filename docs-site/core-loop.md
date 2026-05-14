# Core Loop

> query.ts + QueryEngine 实现流式 API 调用和工具调用循环

## 1. Query Loop

```typescript
// src/query.ts
export async function* query(
  request: QueryRequest
): AsyncGenerator<QueryEvent> {
  // 1. 构建请求参数
  const params = buildRequestParams(request);

  // 2. 调用 API (streaming)
  const stream = await langrouterClient.messages.stream({
    model: request.model || config.defaultModel,
    messages: params.messages,
    system: params.system,
    tools: params.tools,
  });

  // 3. 处理流事件
  for await (const event of stream) {
    switch (event.type) {
      case 'content_block_start':
        yield { type: 'text_start', content: event.content };
        break;

      case 'content_block_delta':
        if (event.delta.type === 'text_delta') {
          yield { type: 'text_delta', content: event.delta.text };
        } else if (event.delta.type === 'input_json_delta') {
          yield { type: 'tool_call', delta: event.delta.partial_json };
        }
        break;

      case 'content_block_stop':
        const toolCalls = event.content.map(block => {
          if (block.type === 'tool_use') {
            return parseToolCall(block);
          }
        }).filter(Boolean);

        // 4. 执行工具
        if (toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            const result = await executeTool(toolCall);
            yield { type: 'tool_result', toolCallId: toolCall.id, result };

            // 5. 将结果加入对话
            params.messages.push(createToolMessage(toolCall, result));
          }

          // 6. 继续循环
          yield* query({ ...request, messages: params.messages });
        }
        break;

      case 'message_delta':
        yield { type: 'usage', usage: event.usage };
        break;
    }
  }
}
```

## 2. QueryEngine

```typescript
// src/QueryEngine.ts
export class QueryEngine {
  private session: Session;
  private compaction: Compaction;

  async *run(request: UserRequest): AsyncGenerator<Message> {
    // 1. 检查上下文大小
    if (this.compaction.shouldCompact()) {
      yield* this.compact();
    }

    // 2. 构建上下文
    const context = await this.buildContext(request);

    // 3. 调用 query
    for await (const event of query({ request, context })) {
      if (event.type === 'text_delta') {
        yield this.renderText(event.content);
      } else if (event.type === 'tool_result') {
        yield this.renderToolResult(event);
      }
    }

    // 4. 更新会话
    this.session.appendMessage(request.prompt);
  }

  private async buildContext(request: UserRequest): Promise<Context> {
    return {
      system: await this.buildSystemPrompt(),
      messages: this.session.getHistory(),
      tools: toolRegistry.getDefinitions(),
      documents: await this.loadOpenFiles(),
      memories: await this.searchMemories(request.prompt),
    };
  }

  private async compact(): Promise<void> {
    const summary = await this.summarizeHistory();
    this.session.setHistory([
      { role: 'system', content: `[Summary: ${summary}]` },
      ...this.session.getHistory().slice(-4),
    ]);
  }
}
```

## 3. 自动压缩

```typescript
// src/context.ts (Compaction)
export class ContextCompaction {
  // Reactive compression
  shouldCompact(): boolean {
    const tokenCount = this.countTokens(this.messages);
    return tokenCount > this.maxTokens * 0.9;
  }

  // Micro compression (压缩最小的历史片段)
  async microCompact(): Promise<void> {
    const smallest = this.findSmallestMessage();
    smallest.content = `[Earlier: ${this.countTokens(smallest)} tokens]`;
  }

  // Trimmed compression (移除最老的 tool results)
  async trimCompact(): Promise<void> {
    const toolResults = this.messages.filter(m => m.role === 'tool');
    const toRemove = toolResults.slice(0, Math.floor(toolResults.length / 2));
    this.messages = this.messages.filter(m => !toRemove.includes(m));
  }
}
```

## 4. 会话管理

```typescript
// Session 管理
export class Session {
  private id: string;
  private messages: Message[];
  private turnCount: number;

  constructor(id: string) {
    this.id = id;
    this.messages = [];
    this.turnCount = 0;
  }

  appendMessage(prompt: string): void {
    this.messages.push({ role: 'user', content: prompt });
    this.turnCount++;
  }

  appendAssistant(content: string): void {
    this.messages.push({ role: 'assistant', content });
  }

  getHistory(): Message[] {
    return this.messages;
  }

  async save(): Promise<void> {
    await fs.writeJSON(
      `${sessionDir}/${this.id}.json`,
      { id: this.id, messages: this.messages, turnCount: this.turnCount }
    );
  }

  static async load(id: string): Promise<Session> {
    const data = await fs.readJSON(`${sessionDir}/${id}.json`);
    return new Session(data.id, data.messages, data.turnCount);
  }
}
```