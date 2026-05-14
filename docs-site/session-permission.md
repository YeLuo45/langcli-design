# Session & Permission

> 会话管理和权限系统

## 1. Session Management

### Session Lifecycle

```typescript
// Session 创建
const session = new Session({
  id: generateSessionId(),
  cwd: process.cwd(),
  projectRoot: await findProjectRoot(),
  model: 'deepseek-v4-pro',
  startTime: Date.now(),
});

// 保存 Session
await session.save();

// 恢复 Session
await session.resume(sessionId);
```

### Session Commands

| Command | Description |
|---------|-------------|
| `/session` | 显示当前会话信息 |
| `/sessions` | 列出所有会话 |
| `/save` | 保存当前会话 |
| `/load <id>` | 加载指定会话 |
| `/resume` | 恢复上一个会话 |
| `/clear` | 清除会话历史 |
| `/export` | 导出会话记录 |

## 2. Permission System

### Permission Modes

| Mode | Behavior | Use Case |
|------|----------|----------|
| `plan` | 显示计划但不执行危险操作 | 高风险操作审查 |
| `auto` | 自动允许安全操作，询问危险操作 | 日常开发 |
| `manual` | 所有操作都需要确认 | 最高安全性 |

### Path Validation Rules

```typescript
const pathRules = [
  // 允许的文件类型
  { pattern: /\.(ts|tsx|js|jsx|py|go|rs)$/, allow: true },

  // 禁止的系统路径
  { pattern: /^\/etc\//, allow: false },
  { pattern: /^\/root\//, allow: false },
  { pattern: /^\/sys\//, allow: false },

  // 限制的写入路径
  { pattern: /^\/home\/.*\.ssh\//, allow: false },

  // 允许的写入路径
  { pattern: /^\/workspace\//, allow: true },
  { pattern: /^\/project\//, allow: true },
];
```

### ML Classifier (YOLO Mode)

```typescript
// 简单 ML 分类器预测操作风险
class YOLOClassifier {
  private model: any;

  async predict(operation: ToolOperation): Promise<boolean> {
    // 特征提取
    const features = this.extractFeatures(operation);

    // 预测
    const score = await this.model.predict(features);

    // 阈值判断
    return score > 0.5;
  }

  private extractFeatures(op: ToolOperation): number[] {
    return [
      op.tool === 'Bash' ? 1 : 0,
      op.command.includes('rm') ? 1 : 0,
      op.command.includes('sudo') ? 1 : 0,
      this.isSystemPath(op.path) ? 1 : 0,
      this.isDangerousCommand(op.command) ? 1 : 0,
    ];
  }

  private isDangerousCommand(cmd: string): boolean {
    const dangerous = ['rm -rf', 'dd', ':(){:|:&};:', '> /dev/sda'];
    return dangerous.some(d => cmd.includes(d));
  }
}
```

## 3. Permission Prompts

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Tool Permission Required                             │
│                                                          │
│ Tool: Bash                                              │
│ Command: rm -rf node_modules/                           │
│ Path: /project/src/node_modules                          │
│                                                          │
│ Risk Level: HIGH                                        │
│                                                          │
│ [a] Allow once                                         │
│ [A] Allow always                                       │
│ [d] Deny once                                          │
│ [D] Deny always                                        │
│ [p] Plan only                                          │
└─────────────────────────────────────────────────────────┘
```

## 4. Settings Configuration

```json
{
  "permissions": {
    "mode": "auto",
    "toolOverrides": {
      "Bash": "manual",
      "FileWrite": "auto",
    },
    "pathRules": [
      { "pattern": "/workspace/**", "allow": true },
      { "pattern": "/etc/**", "allow": false }
    ],
    "yoloMode": false,
  },

  "hooks": {
    "preToolUse": [
      {
        "tool": "Bash",
        "action": "log",
        "config": { "level": "info" }
      }
    ],
    "postToolUse": [
      {
        "tool": "*",
        "action": "notify",
        "config": { "channel": "slack" }
      }
    ]
  }
}
```