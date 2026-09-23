# 快速开始

## 安装

```bash
npx skills add zhihuihu/agent-skills --skill openapi-explorer
```

运行环境需要 Node.js 18 或更高版本。发布脚本已经包含 YAML 解析器，不需要安装运行时 npm 依赖。

## 向 Agent 提问

示例：

- “查找 `openapi.yaml` 中创建用户的接口。”
- “解释 `POST /orders` 的请求体和响应。”
- “列出这份 Swagger 文档中与认证有关的接口。”
- “追踪 `OrderResponse` Schema 的字段。”
- “查看 `https://example.com/openapi.json` 中的接口。”

## 直接运行工具

```bash
node skills/openapi-explorer/scripts/openapi-explorer.mjs --spec ./openapi.yaml info
node skills/openapi-explorer/scripts/openapi-explorer.mjs --spec ./openapi.yaml tags
node skills/openapi-explorer/scripts/openapi-explorer.mjs --spec ./openapi.yaml search "创建 用户"
node skills/openapi-explorer/scripts/openapi-explorer.mjs --spec ./openapi.yaml operation "/users/{id}" get
node skills/openapi-explorer/scripts/openapi-explorer.mjs --spec ./openapi.yaml schema User
```

在命令中添加 `--format json`（置于命令前或命令后均可）可获得结构化输出。使用 `--limit` 控制列表数量，使用 `--depth` 控制 Schema 展开深度。可以直接使用仓库内提供的样例测试：`node skills/openapi-explorer/scripts/openapi-explorer.mjs info --spec skills/openapi-explorer/examples/petstore.yaml`。

完整选项请参阅[命令参考](skills/openapi-explorer/references/commands.md)，或运行：

```bash
node skills/openapi-explorer/scripts/openapi-explorer.mjs --help
```

## 支持的文档

- Swagger 2.0
- OpenAPI 3.0 和 3.1
- JSON 和 YAML
- 本地文件和 HTTP(S) 地址
- 内部及相对外部 JSON Pointer 引用

本技能不处理 Postman Collection、GraphQL Schema、AsyncAPI 文档，也不负责实际发送 API 请求。
