# Langcli Design

Design documentation site for [langcli/langcli](https://github.com/langcli/langcli) — a Claude Code compatible AI coding assistant with LangRouter integration.

**GitHub Repository**: https://github.com/yeluo45/langcli-design

## Project Structure

```
langcli-design/
├── docs-site/                 # VitePress documentation site
│   ├── .vitepress/
│   │   ├── config.mjs         # VitePress configuration (blue theme)
│   │   ├── theme/             # Custom theme
│   │   └── public/            # Static assets
│   ├── index.md               # Home page
│   ├── architecture.md         # Architecture overview
│   ├── core-loop.md           # Core query loop
│   ├── tool-system.md        # Tool system (40+ tools)
│   └── session-permission.md  # Session and permission management
├── .github/
│   └── workflows/
│       └── deploy.yml         # GitHub Pages deployment
└── package.json
```

## Quick Start

```bash
cd docs-site
pnpm install
pnpm run dev      # Development preview
pnpm run build    # Production build
pnpm run preview  # Preview build
```

## Live Site

https://yeluo45.github.io/langcli-design/

## Content

| Document | Description |
|----------|-------------|
| [Architecture](https://yeluo45.github.io/langcli-design/architecture) | Complete architecture overview |
| [Core Loop](https://yeluo45.github.io/langcli-design/core-loop) | QueryEngine + query implementation |
| [Tool System](https://yeluo45.github.io/langcli-design/tool-system) | 40+ built-in tools |
| [Session & Permission](https://yeluo45.github.io/langcli-design/session-permission) | Session management + permission system |

## Key Features

| Feature | Description |
|---------|-------------|
| Claude Code Compatible | 100% compatible with Claude Code usage |
| LangRouter Integration | Support Claude OPUS 4.6, Deepseek v4, GLM 5.1, Kimi K2.6, Minimax M2.5 |
| In-Session Model Switch | Switch models without interrupting context |
| Tool System | 40+ tools including Bash, File, Web, Agent |
| Permission System | Three modes + ML classifier |
| Auto Compaction | Context compression for long conversations |

## Provider Models

| Provider | Models |
|----------|--------|
| LangRouter | claude-opus-4.6, deepseek-v4-flash, deepseek-v4-pro, glm-5.1, kimi-k2.6, minimax-m2.5 |
| Anthropic | claude-3-5-sonnet, claude-3-opus |
| AWS Bedrock | Claude models on AWS |
| Google Vertex | Claude models on GCP |

## License

Langcli is open source under the MIT license.