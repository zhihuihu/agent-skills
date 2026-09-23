# Agent Skills

遵循 [skills.sh](https://skills.sh) 规范的可复用 Agent 技能集合。

## 安装

安装仓库中的全部技能：

```bash
npx skills add zhihuihu/agent-skills
```

只安装 OpenAPI Explorer：

```bash
npx skills add zhihuihu/agent-skills --skill openapi-explorer
```

更多安装方式请参阅[安装指南](INSTALLATION.md)。

## 可用技能

### openapi-explorer

按需查询 Swagger 2.0 和 OpenAPI 3.x 文档，避免把完整规范一次性放入 Agent 上下文。

- 读取本地文件或 HTTP(S) 地址中的 JSON、YAML 文档。
- 以自包含 Node.js 单文件运行，无需安装运行时 npm 依赖。
- 搜索路径、HTTP 方法、摘要、operationId、Tag、参数、请求体和响应。
- 查看合并后的路径级与操作级参数、请求体、响应、服务器和安全要求。
- 展开内部及相对外部 JSON Pointer `$ref`，支持循环引用检测和深度限制。
- 限制宽泛查询的结果数量，再按需查看详情。

请参阅[快速开始](GETTING_STARTED.md)和[技能说明](skills/openapi-explorer/SKILL.md)。

## 仓库结构

```text
skills/
  openapi-explorer/
    SKILL.md
    agents/openai.yaml
    examples/petstore.yaml
    references/commands.md
    scripts/openapi-explorer.mjs
    src/openapi-explorer.mjs
    tests/openapi-explorer.test.mjs
```

## 许可证

MIT
