---
name: openapi-explorer
description: 从本地或远程 Swagger 2.0、OpenAPI 3.x JSON/YAML 规范中查找接口详情，包括参数、请求体、响应、Schema 和认证要求。适用于阅读和定位 API 文档；不适用于 Postman、GraphQL、AsyncAPI 或实际发送 API 请求。
---

# OpenAPI 文档探索器

使用本技能目录下的 `scripts/openapi-explorer.mjs` 按需检查 API 规范。发布脚本是自包含的 Node.js bundle，不需要安装 npm 依赖。

> **脚本路径说明**：根据技能安装位置执行对应路径，例如：
> - 项目内技能目录：`node <当前技能目录>/scripts/openapi-explorer.mjs`（如 `node skills/openapi-explorer/scripts/openapi-explorer.mjs`）
> - Agent 全局或工作区目录（如 `.agents/skills/`、`.cursor/skills/`、`~/.claude/skills/`）：请使用当前 `SKILL.md` 所在目录下的 `scripts/openapi-explorer.mjs`。

## 工作流程

1. 定位文档。用户给出文件或网址时传入 `--spec <path-or-url>`；否则工具会自动在当前目录、常见子目录（`docs/`, `api/`, `specs/` 等）及其父级中查找规范文件。
2. 运行 `info`，确认规范版本并了解文档规模。
3. 使用 `tags`、`list` 或 `search` 缩小候选接口范围。
4. 只对相关接口运行 `operation <path> [method]`。
5. 需要字段级模型信息时，再运行 `schema <name>`。

直接检查时优先使用文本输出。需要程序化筛选或继续生成其他产物时使用 `--format json`。除非任务确实需要更多内容，否则保留默认的结果数量和 Schema 展开深度。全局选项（`--spec`, `--format`, `--limit`, `--depth`）可以放在命令前或命令后任意位置。

## 示例

```bash
# 查看概况（全局参数可置于命令前后任意位置）
node <skill-dir>/scripts/openapi-explorer.mjs info --spec ./openapi.yaml
# 搜索接口（支持多关键词）
node <skill-dir>/scripts/openapi-explorer.mjs search "创建 用户" --spec ./openapi.yaml
# 查看具体接口详情（路径支持自动容错）
node <skill-dir>/scripts/openapi-explorer.mjs operation "/users/{id}" get --spec ./openapi.yaml
# 查看数据模型（支持直接传入 #/components/schemas/Name 格式）
node <skill-dir>/scripts/openapi-explorer.mjs schema User --spec ./openapi.yaml
```

工具支持 Swagger 2.0、OpenAPI 3.0/3.1、JSON、YAML、本地文件、HTTP(S) 地址、内部 JSON Pointer 引用和相对外部 JSON Pointer 引用。完整参数与行为请阅读[命令参考](references/commands.md)。

## 运行要求

- Node.js 18 或更高版本

当文档无法解析或引用无法解析时，报告工具返回的准确错误以及涉及的文档或引用，不要猜测缺失的 API 信息。
