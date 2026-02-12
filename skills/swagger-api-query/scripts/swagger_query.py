#!/usr/bin/env python3
"""
Swagger/OpenAPI 文档查询工具
用于高效查询大型 API 文档，避免一次性加载浪费 token。
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

SUPPORTED_METHODS = {"get", "post", "put", "delete", "patch"}


def schema_to_string(schema: Dict[str, Any]) -> str:
    """将 Schema 简要转换为可读字符串。"""
    if not schema:
        return ""
    if "$ref" in schema:
        return schema["$ref"]

    if "oneOf" in schema:
        items = ", ".join(schema_to_string(item) for item in schema.get("oneOf", []))
        return f"oneOf({items})"
    if "allOf" in schema:
        items = ", ".join(schema_to_string(item) for item in schema.get("allOf", []))
        return f"allOf({items})"
    if "anyOf" in schema:
        items = ", ".join(schema_to_string(item) for item in schema.get("anyOf", []))
        return f"anyOf({items})"

    if schema.get("type") == "array":
        item_schema = schema.get("items", {})
        return f"array<{schema_to_string(item_schema) or 'object'}>"

    schema_type = schema.get("type", "object")
    schema_format = schema.get("format")
    enum_values = schema.get("enum", [])
    base = schema_type if not schema_format else f"{schema_type}({schema_format})"
    if enum_values:
        enum_desc = ", ".join(map(str, enum_values))
        return f"{base}; enum[{enum_desc}]"
    return base


class SwaggerQuery:
    def __init__(self, spec_file: Optional[str] = None):
        self.spec_path = self._resolve_spec_path(spec_file)
        self.data = self._load_spec(self.spec_path)
        self.paths = self.data.get("paths", {})
        self.tags = self.data.get("tags", [])
        self.components = self.data.get("components", {})

    def _resolve_spec_path(self, spec_file: Optional[str]) -> Path:
        if spec_file:
            explicit = Path(spec_file).expanduser().resolve()
            if not explicit.exists():
                raise FileNotFoundError(f"未找到 API 文档文件: {explicit}")
            return explicit

        candidates: List[Path] = []
        seen: set[str] = set()
        start_dirs = [Path.cwd(), Path(__file__).resolve().parent]

        for base in start_dirs:
            for directory in [base, *base.parents]:
                candidate = (directory / "api-docs.json").resolve()
                key = str(candidate).lower()
                if key in seen:
                    continue
                seen.add(key)
                candidates.append(candidate)
                if candidate.exists():
                    return candidate

        checked = "\n".join(f"- {path}" for path in candidates)
        raise FileNotFoundError(
            "未找到 api-docs.json。请通过 --spec 显式指定路径。\n"
            f"已检查位置:\n{checked}"
        )

    @staticmethod
    def _load_spec(spec_path: Path) -> Dict[str, Any]:
        try:
            with open(spec_path, "r", encoding="utf-8-sig") as f:
                return json.load(f)
        except json.JSONDecodeError as exc:
            raise ValueError(f"API 文档 JSON 解析失败: {spec_path} (line {exc.lineno}, col {exc.colno})") from exc

    def list_tags(self) -> Dict[str, Any]:
        tags_data = []
        for idx, tag in enumerate(self.tags, 1):
            tags_data.append({
                "index": idx,
                "name": tag.get("name", ""),
                "description": tag.get("description", ""),
            })
        return {"spec": str(self.spec_path), "tags": tags_data}

    def list_all_apis(self) -> Dict[str, Any]:
        apis = []
        for path, methods in self.paths.items():
            for method, details in methods.items():
                if method not in SUPPORTED_METHODS:
                    continue
                apis.append({
                    "method": method.upper(),
                    "path": path,
                    "tags": details.get("tags", ["未分类"]),
                    "summary": details.get("summary", "无描述"),
                    "operationId": details.get("operationId", ""),
                })
        return {"spec": str(self.spec_path), "count": len(apis), "apis": apis}

    def search_by_tag(self, tag_name: str) -> Dict[str, Any]:
        matches = []
        for path, methods in self.paths.items():
            for method, details in methods.items():
                if method not in SUPPORTED_METHODS:
                    continue
                tags = details.get("tags", [])
                if tag_name not in tags:
                    continue
                matches.append({
                    "method": method.upper(),
                    "path": path,
                    "tags": tags,
                    "summary": details.get("summary", "无描述"),
                })
        return {"spec": str(self.spec_path), "query": tag_name, "count": len(matches), "apis": matches}

    def search_by_keyword(self, keyword: str) -> Dict[str, Any]:
        matches = []
        keyword_lower = keyword.lower()
        for path, methods in self.paths.items():
            for method, details in methods.items():
                if method not in SUPPORTED_METHODS:
                    continue
                summary = details.get("summary", "")
                description = details.get("description", "")
                tags = details.get("tags", [])
                if (
                    keyword_lower in path.lower()
                    or keyword_lower in summary.lower()
                    or keyword_lower in description.lower()
                    or any(keyword_lower in tag.lower() for tag in tags)
                ):
                    matches.append({
                        "method": method.upper(),
                        "path": path,
                        "tags": tags,
                        "summary": summary or "无描述",
                    })
        return {"spec": str(self.spec_path), "query": keyword, "count": len(matches), "apis": matches}

    def get_api_detail(self, path: str, method: Optional[str] = None) -> Dict[str, Any]:
        if path not in self.paths:
            raise ValueError(f"未找到路径: {path}")

        methods_data = self.paths[path]
        available_methods = [m for m in methods_data.keys() if m in SUPPORTED_METHODS]
        if not available_methods:
            raise ValueError(f"路径 {path} 下没有支持的方法")

        if method is None:
            if len(available_methods) == 1:
                method = available_methods[0]
            else:
                methods = ", ".join(available_methods)
                raise ValueError(f"该路径有多个方法: {methods}。请补充方法参数。")

        method = method.lower()
        if method not in methods_data:
            raise ValueError(f"路径 {path} 没有 {method.upper()} 方法")

        details = methods_data[method]
        detail_result: Dict[str, Any] = {
            "spec": str(self.spec_path),
            "method": method.upper(),
            "path": path,
            "tags": details.get("tags", []),
            "summary": details.get("summary", ""),
            "description": details.get("description", ""),
            "operationId": details.get("operationId", ""),
            "parameters": [],
            "requestBody": [],
            "responses": [],
        }

        for param in details.get("parameters", []) or []:
            param_schema = param.get("schema", {})
            detail_result["parameters"].append({
                "name": param.get("name", ""),
                "in": param.get("in", ""),
                "required": bool(param.get("required", False)),
                "description": param.get("description", ""),
                "schema": schema_to_string(param_schema),
            })

        req_body = details.get("requestBody", {})
        for content_type, content_data in (req_body.get("content", {}) or {}).items():
            schema = content_data.get("schema", {})
            detail_result["requestBody"].append({
                "contentType": content_type,
                "description": req_body.get("description", ""),
                "schema": schema_to_string(schema),
            })

        responses = details.get("responses", {}) or {}
        for status_code, response in responses.items():
            base = {"statusCode": status_code, "description": response.get("description", ""), "content": []}
            for content_type, content_data in (response.get("content", {}) or {}).items():
                base["content"].append({
                    "contentType": content_type,
                    "schema": schema_to_string(content_data.get("schema", {})),
                })
            detail_result["responses"].append(base)

        return detail_result

    def get_schema(self, schema_name: str) -> Dict[str, Any]:
        schemas = self.components.get("schemas", {})
        if schema_name not in schemas:
            raise ValueError(f"未找到 Schema: {schema_name}")

        schema = schemas[schema_name]
        result: Dict[str, Any] = {
            "spec": str(self.spec_path),
            "name": schema_name,
            "description": schema.get("description", ""),
            "required": schema.get("required", []),
            "properties": [],
        }

        for prop_name, prop_data in (schema.get("properties", {}) or {}).items():
            result["properties"].append({
                "name": prop_name,
                "schema": schema_to_string(prop_data),
                "description": prop_data.get("description", ""),
            })
        return result


def render_text(command: str, data: Dict[str, Any]) -> str:
    lines: List[str] = []
    spec = data.get("spec", "")
    if spec:
        lines.append(f"文档: {spec}")
        lines.append("")

    if command == "list-tags":
        lines.append("=== 接口分类 ===")
        lines.append("")
        tags = data.get("tags", [])
        if not tags:
            lines.append("(无标签)")
        for item in tags:
            lines.append(f"{item['index']}. {item['name']}")
            if item.get("description"):
                lines.append(f"   描述: {item['description']}")
        return "\n".join(lines)

    if command == "list-all":
        lines.append("=== 接口索引 ===")
        lines.append("")
        apis = data.get("apis", [])
        for idx, api in enumerate(apis, 1):
            lines.append(f"{idx}. [{api['method']}] {api['path']}")
            lines.append(f"   标签: {', '.join(api.get('tags', []))}")
            lines.append(f"   摘要: {api.get('summary', '')}")
            if api.get("operationId"):
                lines.append(f"   ID: {api['operationId']}")
            lines.append("")
        if not apis:
            lines.append("(无接口)")
        return "\n".join(lines)

    if command in {"tag", "search"}:
        title = "标签" if command == "tag" else "关键词"
        lines.append(f"=== 按{title}查询：{data.get('query', '')} ===")
        lines.append("")
        apis = data.get("apis", [])
        for api in apis:
            lines.append(f"[{api['method']}] {api['path']}")
            lines.append(f"  标签: {', '.join(api.get('tags', []))}")
            lines.append(f"  摘要: {api.get('summary', '')}")
            lines.append("")
        if not apis:
            lines.append("未找到匹配接口")
        return "\n".join(lines)

    if command == "detail":
        lines.append(f"=== [{data.get('method', '')}] {data.get('path', '')} ===")
        lines.append("")
        if data.get("tags"):
            lines.append(f"标签: {', '.join(data['tags'])}")
        if data.get("summary"):
            lines.append(f"摘要: {data['summary']}")
        if data.get("description"):
            lines.append(f"描述: {data['description']}")
        if data.get("operationId"):
            lines.append(f"操作ID: {data['operationId']}")

        if data.get("parameters"):
            lines.append("")
            lines.append("参数:")
            for param in data["parameters"]:
                required = "必填" if param["required"] else "可选"
                lines.append(f"  - {param['name']} ({param['in']}) [{required}]")
                if param.get("description"):
                    lines.append(f"    说明: {param['description']}")
                if param.get("schema"):
                    lines.append(f"    类型: {param['schema']}")

        if data.get("requestBody"):
            lines.append("")
            lines.append("请求体:")
            for body in data["requestBody"]:
                lines.append(f"  Content-Type: {body['contentType']}")
                if body.get("description"):
                    lines.append(f"    说明: {body['description']}")
                if body.get("schema"):
                    lines.append(f"    Schema: {body['schema']}")

        if data.get("responses"):
            lines.append("")
            lines.append("响应:")
            for resp in data["responses"]:
                lines.append(f"  {resp['statusCode']}: {resp.get('description', '')}")
                for content in resp.get("content", []):
                    if content.get("schema"):
                        lines.append(f"    {content['contentType']}: {content['schema']}")
        return "\n".join(lines)

    if command == "schema":
        lines.append(f"=== Schema: {data.get('name', '')} ===")
        lines.append("")
        if data.get("description"):
            lines.append(f"描述: {data['description']}")
            lines.append("")
        lines.append("属性:")
        properties = data.get("properties", [])
        for prop in properties:
            lines.append(f"  - {prop['name']}: {prop.get('schema', '')}")
            if prop.get("description"):
                lines.append(f"    {prop['description']}")
        if not properties:
            lines.append("  (无属性)")
        if data.get("required"):
            lines.append("")
            lines.append(f"必填字段: {', '.join(data['required'])}")
        return "\n".join(lines)

    return json.dumps(data, ensure_ascii=False, indent=2)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Swagger/OpenAPI 文档查询工具")
    parser.add_argument("--spec", help="OpenAPI/Swagger JSON 文件路径（默认自动查找 api-docs.json）")
    parser.add_argument("--format", choices=["text", "json"], default="text", help="输出格式")

    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("list-tags", help="列出所有标签")
    subparsers.add_parser("list-all", help="列出所有接口索引")

    tag_parser = subparsers.add_parser("tag", help="按标签查询接口")
    tag_parser.add_argument("tag_name", help="标签名")

    search_parser = subparsers.add_parser("search", help="按关键词搜索接口")
    search_parser.add_argument("keyword", help="关键词")

    detail_parser = subparsers.add_parser("detail", help="查看接口详情")
    detail_parser.add_argument("path", help="接口路径")
    detail_parser.add_argument("method", nargs="?", help="HTTP 方法（可选）")

    schema_parser = subparsers.add_parser("schema", help="查看 Schema 定义")
    schema_parser.add_argument("schema_name", help="Schema 名称")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        query = SwaggerQuery(spec_file=args.spec)

        if args.command == "list-tags":
            result = query.list_tags()
        elif args.command == "list-all":
            result = query.list_all_apis()
        elif args.command == "tag":
            result = query.search_by_tag(args.tag_name)
        elif args.command == "search":
            result = query.search_by_keyword(args.keyword)
        elif args.command == "detail":
            result = query.get_api_detail(args.path, args.method)
        elif args.command == "schema":
            result = query.get_schema(args.schema_name)
        else:
            raise ValueError("无效命令")
    except (FileNotFoundError, ValueError) as exc:
        print(f"错误: {exc}", file=sys.stderr)
        return 1

    if args.format == "json":
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print(render_text(args.command, result))
    return 0


if __name__ == "__main__":
    sys.exit(main())
