# Architecture

> Langcli 核心架构：基于 Claude Code 逆向工程 + LangRouter 多模型集成

## 1. Overview

| 指标 | 数值 |
|------|------|
| 运行时 | Bun (>= 1.3.11) |
| 语言 | TypeScript + TSX |
| 工具数 | 40+ |
| 模型提供商 | LangRouter (多模型) |
| 兼容性 | Claude Code 100% |
| 测试覆盖 | 1286 tests / 67 files |

## 2. 模块架构

```
langcli/
├── src/
│   ├── entrypoints/       # CLI 入口点
│   ├── screens/          # REPL 界面 (Ink)
│   ├── services/         # API 层 (Claude/Bedrock/Vertex/Azure)
│   ├── tools/            # 工具实现
│   ├── state/            # Zustand 状态管理
│   ├── context/          # 上下文构建
│   └── ink/              # Ink 终端渲染框架
├── packages/             # 内部包 (workspace:*)
├── docs/                 # 文档
└── tests/                # 测试
```

## 3. 核心数据流

```
┌─────────────────────────────────────────────────────────┐
│ User Input (Terminal)                                   │
│ REPL Screen (Ink/React)                                │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Main.tsx (Commander.js)                                 │
│ - 参数解析                                              │
│ - 服务初始化 (Auth/Analytics/Policy)                   │
│ - 启动 REPL 或 Pipe 模式                               │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ QueryEngine.ts                                          │
│ - 会话状态管理                                          │
│ - 自动压缩 (compaction)                                │
│ - 文件历史快照                                          │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ query.ts (Core Loop)                                   │
│ - API 调用 (streaming)                                 │
│ - 工具调用循环                                          │
│ - 上下文管理                                            │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ LangRouter Provider                                     │
│ - Claude OPUS 4.6                                      │
│ - Deepseek v4 (flash/pro)                             │
│ - GLM 5.1                                              │
│ - Kimi K2.6                                            │
│ - Minimax M2.5                                         │
└────────────────┬──────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│ Tool Execution                                          │
│ - BashTool (shell执行)                                │
│ - FileEditTool (文件编辑)                              │
│ - AgentTool (子代理)                                   │
│ - WebFetchTool / WebSearchTool                        │
└─────────────────────────────────────────────────────────┘
```

## 4. 入口点流程

```typescript
// src/entrypoints/cli.tsx
// 真正的入口点，注入运行时 polyfills

// 1. feature() polyfill (always returns false)
globalThis.feature = (name: string) => false;

// 2. MACRO globals (simulate build-time macros)
globalThis.MACRO = {
  VERSION: '1.0.0',
  BUILD_TIME: Date.now(),
  BUILD_TARGET: 'node',
  BUILD_ENV: 'development',
};

// 3. 运行主程序
import { main } from 'src/main';
main();
```

## 5. Provider 支持

### LangRouter 集成

```typescript
// src/utils/model/providers.ts
const providers = {
  // LangRouter (主provider)
  langrouter: {
    apiKey: process.env.LANGROUTER_API_KEY,
    models: [
      'claude-opus-4.6',
      'deepseek-v4-flash',
      'deepseek-v4-pro',
      'glm-5.1',
      'kimi-k2.6',
      'minimax-m2.5',
    ],
  },

  // Anthropic Direct
  anthropic: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    models: ['claude-3-5-sonnet', 'claude-3-opus'],
  },

  // AWS Bedrock
  bedrock: {
    region: process.env.AWS_REGION,
    credentials: ...,  // AWS credentials
  },

  // Google Vertex
  vertex: {
    project: process.env.GCP_PROJECT,
    credentials: ...,  // GCP credentials
  },
};
```

### 模型切换命令

```bash
# 在会话内切换模型
/switch deepseek-v4-pro

# 查看当前模型
/model

# 设置默认模型
/config set default_model claude-opus-4.6
```

## 6. 状态管理

```typescript
// src/state/AppState.tsx
interface AppState {
  // 会话状态
  sessionId: string;
  conversationHistory: Message[];
  context: Context;

  // 工具状态
  tools: ToolDefinition[];
  permissions: Permission[];

  // MCP 状态
  mcpConnections: McpConnection[];

  // 统计
  tokenCount: number;
  costEstimate: number;
}

// src/state/store.ts (Zustand-style)
const useStore = create((set) => ({
  messages: [],
  addMessage: (msg) => set((state) => ({
    messages: [...state.messages, msg]
  })),
  clearMessages: () => set({ messages: [] }),
}));
```