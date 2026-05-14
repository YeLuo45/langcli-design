import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Langcli Design",
  description: "Langcli 终端 AI 编程助手设计文档 — Claude Code Compatible + LangRouter Integration",

  head: [
    ["link", { rel: "icon", href: "/favicon.svg" }],
    ["meta", { name: "theme-color", content: "#3b82f6" }],
    ["meta", { name: "description", content: "Langcli design documentation - Claude Code compatible AI coding assistant" }],
  ],

  base: "/langcli-design/",

  themeConfig: {
    logo: "/favicon.svg",
    nav: [
      { text: "Home", link: "/" },
      { text: "Architecture", link: "/architecture" },
      { text: "Core Loop", link: "/core-loop" },
      { text: "Providers", link: "/providers" },
    ],
    sidebar: [
      { text: "Introduction", items: [
        { text: "Overview", link: "/architecture" },
        { text: "Core Loop", link: "/core-loop" },
        { text: "Providers", link: "/providers" },
      ]},
      { text: "Tools", items: [
        { text: "Tool System", link: "/tool-system" },
        { text: "BashTool", link: "/bash-tool" },
        { text: "File Tools", link: "/file-tools" },
      ]},
      { text: "Features", items: [
        { text: "Session Management", link: "/session" },
        { text: "Permission System", link: "/permission" },
        { text: "MCP Integration", link: "/mcp" },
      ]},
    ],
    socialLinks: [
      { icon: "github", link: "https://github.com/langcli/langcli" },
    ],
  },

  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
  },
});