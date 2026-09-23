# 命令参考

全局选项可以放在命令之前或之后：

```text
--spec PATH_OR_URL   本地 JSON/YAML 文件或 HTTP(S) 地址
--format text|json   输出格式，默认：text
--limit N            list/search 最大结果数，默认：50；0 表示不限制
--depth N            Schema 引用展开深度，默认：3
```

没有传入 `--spec` 时，工具会在当前目录、常见子目录（`docs/`、`doc/`、`api/`、`apis/`、`specs/`、`spec/`、`src/main/resources/`）及其父级目录中自动查找：

```text
openapi.yaml, openapi.yml, openapi.json
swagger.yaml, swagger.yml, swagger.json
api-docs.json
```

## 命令

### `info`

显示识别到的规范版本、API 名称与版本、服务器地址、接口与 Schema 数量，以及安全方案名称。

### `tags`

列出 Tag 及其接口数量。即使文档没有顶层 `tags`，工具也会统计各接口使用的 Tag。

### `list [--tag TAG] [--method METHOD]`

列出接口，可按精确 Tag 或 HTTP 方法筛选。

### `search QUERY [--tag TAG] [--method METHOD]`

进行不区分大小写的 AND 搜索。搜索范围包括路径、HTTP 方法、摘要、描述、operationId、Tag、参数、请求体和响应。支持多关键词查询（如 `search "创建 用户"` 或 `search 创建 用户`）。

### `operation PATH [METHOD]`

显示一个接口的路径级与操作级参数、请求体、响应、服务器地址和安全要求。只有当路径下仅有一个操作时，才可以省略 HTTP 方法。支持路径容错（如省略开头的 `/` 或末尾带 `/` 时会自动匹配）。

### `schema NAME`

显示 `components.schemas` 或 Swagger 2.0 `definitions` 中的命名 Schema。Schema 名称不区分大小写，且支持传入带有 JSON Pointer 前缀的格式（如 `#/components/schemas/Pet` 将自动提取 `Pet`）。JSON Pointer 引用会展开到 `--depth` 指定的深度；循环引用标记为 `recursive: true`；OpenAPI 3.0 的 `nullable: true` 会标记为 `?`。

## 运行方式

发布脚本已经包含 YAML 解析器，不需要执行 `npm install`：

```bash
node skills/openapi-explorer/scripts/openapi-explorer.mjs --help
```

读取远程文档或远程外部引用时，运行环境需要允许网络访问。
