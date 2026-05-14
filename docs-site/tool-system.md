# Tool System

> Langcli 工具系统：40+ 内置工具的完整分类和实现

## 1. Tool Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Tool Registry                                           │
│ - toolDefinitions: Map<string, ToolDefinition>          │
│ - findToolByName(name): ToolDefinition                  │
│ - toolMatchesName(tool, name): boolean                  │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Tool Categories                                         │
│ - File Operations (Read/Edit/Write)                    │
│ - Shell Execution (Bash)                               │
│ - Web (Fetch/Search)                                   │
│ - Agent (Sub-agent spawning)                           │
│ - Communication (SendMessage/Brief)                    │
│ - Task Management (Todo/Task)                          │
│ - Scheduling (Cron)                                    │
│ - Session (Worktree)                                   │
└─────────────────────────────────────────────────────────┘
```

## 2. Tool Interface

```typescript
// src/Tool.ts
export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };

  call(args: any, context: ToolContext): Promise<ToolResult>;
  render?(result: ToolResult): React.ReactNode;  // 可选的渲染组件
}

export interface ToolContext {
  cwd: string;
  projectRoot: string;
  sessionId: string;
  permissions: Permission[];
  tokenCount: number;
}
```

## 3. Always Available Tools

### BashTool

```typescript
// src/tools/BashTool/
export class BashTool implements Tool {
  name = 'Bash';
  description = 'Execute shell commands in a sandboxed environment';

  inputSchema = {
    type: 'object',
    properties: {
      command: { type: 'string', description: 'Shell command to execute' },
      timeout: { type: 'number', description: 'Timeout in seconds', default: 60 },
    },
    required: ['command'],
  };

  async call(args: { command: string; timeout?: number }, ctx: ToolContext) {
    // 1. 权限检查
    if (!ctx.permissions.has('bash')) {
      return { error: 'Permission denied', requiresApproval: true };
    }

    // 2. 执行命令
    const result = await Bun.spawn(args.command, {
      cwd: ctx.cwd,
      timeout: (args.timeout || 60) * 1000,
    });

    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode,
    };
  }
}
```

### FileEditTool

```typescript
// src/tools/FileEditTool/
export class FileEditTool implements Tool {
  name = 'Edit';
  description = 'Edit a file by replacing specific content';

  inputSchema = {
    type: 'object',
    properties: {
      file_path: { type: 'string' },
      old_string: { type: 'string', description: 'Text to find and replace' },
      new_string: { type: 'string', description: 'Replacement text' },
    },
    required: ['file_path', 'old_string', 'new_string'],
  };

  async call(args, ctx) {
    const content = await fs.readFile(args.file_path, 'utf-8');

    // 验证 old_string 存在
    if (!content.includes(args.old_string)) {
      return { error: 'old_string not found in file' };
    }

    // 替换
    const newContent = content.replace(args.old_string, args.new_string);
    await fs.writeFile(args.file_path, newContent);

    // 生成 diff
    const diff = generateDiff(content, newContent);

    return { success: true, diff, linesChanged: countLines(diff) };
  }
}
```

### FileWriteTool

```typescript
// src/tools/FileWriteTool/
export class FileWriteTool implements Tool {
  name = 'Write';
  description = 'Create or overwrite a file with content';

  inputSchema = {
    type: 'object',
    properties: {
      file_path: { type: 'string' },
      content: { type: 'string' },
    },
    required: ['file_path', 'content'],
  };

  async call(args, ctx) {
    // 确保目录存在
    await fs.mkdir(dirname(args.file_path), { recursive: true });

    // 写入文件
    await fs.writeFile(args.file_path, args.content);

    return {
      success: true,
      path: args.file_path,
      bytes: Buffer.byteLength(args.content),
    };
  }
}
```

### WebFetchTool

```typescript
// src/tools/WebFetchTool/
export class WebFetchTool implements Tool {
  name = 'WebFetch';
  description = 'Fetch a URL and convert to markdown for AI consumption';

  inputSchema = {
    type: 'object',
    properties: {
      url: { type: 'string' },
      prompt: { type: 'string', description: 'What to extract from the page' },
    },
    required: ['url'],
  };

  async call(args, ctx) {
    // 1. 获取页面
    const response = await fetch(args.url);
    const html = await response.text();

    // 2. 转换为 markdown
    const markdown = await htmlToMarkdown(html);

    // 3. 摘要（如果需要）
    if (args.prompt) {
      const summary = await summarize(markdown, args.prompt);
      return { content: summary, url: args.url };
    }

    return { content: markdown, url: args.url };
  }
}
```

### AgentTool

```typescript
// src/tools/AgentTool/
export class AgentTool implements Tool {
  name = 'Agent';
  description = 'Spawn a sub-agent to handle complex tasks';

  inputSchema = {
    type: 'object',
    properties: {
      task: { type: 'string', description: 'Task description for sub-agent' },
      mode: { type: 'string', enum: ['fork', 'async', 'background', 'remote'] },
      model: { type: 'string', description: 'Model to use (optional)' },
    },
    required: ['task'],
  };

  async call(args, ctx) {
    switch (args.mode) {
      case 'fork':
        return await this.spawnForkAgent(args.task, ctx);

      case 'async':
        return await this.spawnAsyncAgent(args.task, ctx);

      case 'background':
        return this.spawnBackgroundAgent(args.task, ctx);

      case 'remote':
        return await this.spawnRemoteAgent(args.task, ctx);

      default:
        return await this.spawnForkAgent(args.task, ctx);
    }
  }

  private async spawnForkAgent(task: string, ctx: ToolContext) {
    // Fork: 在当前会话中执行，共享上下文
    const result = await query({
      prompt: task,
      context: ctx,
    });
    return { result };
  }
}
```

## 4. Conditionally Enabled Tools

| Tool | Enable Condition |
|------|------------------|
| GlobTool | 当未嵌入 bfs/ugrep 时 (默认启用) |
| GrepTool | 同上 |
| TaskCreateTool | 当 `isTodoV2Enabled()` 为 true |
| TaskGetTool | 同上 |
| TaskUpdateTool | 同上 |
| TaskListTool | 同上 |
| TeamCreateTool | 当 `isAgentSwarmsEnabled()` 为 true |

## 5. Tool Permission Flow

```
Tool Call Request
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│ Permission Check                                        │
│ - 检查工具权限模式 (plan/auto/manual)                  │
│ - 检查路径规则                                          │
│ - 检查 ML 分类器                                        │
└─────────────────────────────────────────────────────────┘
    │
    ├── Deny ──► 返回错误
    │
    └── Allow ──► 继续执行
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│ Tool Execution                                          │
│ - 调用 tool.call()                                      │
│ - 捕获结果或错误                                        │
└─────────────────────────────────────────────────────────┘
    │
    ▼
Render Result (React Component 或 文本)
```