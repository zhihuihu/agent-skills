# 安装指南

## 使用 skills CLI

安装整个仓库：

```bash
npx skills add zhihuihu/agent-skills
```

只安装 OpenAPI Explorer：

```bash
npx skills add zhihuihu/agent-skills --skill openapi-explorer
```

常用选项：

```bash
npx skills add zhihuihu/agent-skills --list
npx skills add zhihuihu/agent-skills --skill openapi-explorer -g
npx skills add zhihuihu/agent-skills --skill openapi-explorer -y
```

## 手动安装

将 `skills/openapi-explorer` 目录复制到 Agent 的技能目录，然后重启 Agent。

常见的全局目录或工作区目录：

- Antigravity / Gemini CLI：工作区 `.agents/skills/`，全局 `~/.gemini/antigravity/skills/`
- Codex：`~/.codex/skills/`
- Claude Code：`~/.claude/skills/`
- Cursor：`~/.cursor/skills/`

## 运行要求

- Node.js 18 或更高版本

发布脚本已经包含 YAML 解析器，使用者不需要运行 `npm install`。

直接运行：

```bash
node scripts/openapi-explorer.mjs --help
```

仓库开发者修改源码后，可以通过 `npm install && npm run build` 安装构建依赖并重新生成 bundle。

## 验证

```bash
node scripts/openapi-explorer.mjs --help
npm test
```

## 更新或删除

```bash
npx skills check
npx skills update
npx skills remove openapi-explorer
```
