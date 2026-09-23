#!/usr/bin/env node

import { readFile, access } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse as parseYaml } from 'yaml'

export const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']
const DEFAULT_SPEC_NAMES = [
  'openapi.yaml', 'openapi.yml', 'openapi.json',
  'swagger.yaml', 'swagger.yml', 'swagger.json', 'api-docs.json'
]
const SCHEMA_KEYS = [
  'type', 'format', 'items', 'enum', 'default', 'example', 'nullable',
  'minimum', 'maximum', 'minLength', 'maxLength', 'pattern', 'minItems',
  'maxItems', 'uniqueItems', 'additionalProperties'
]

export class SpecError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SpecError'
  }
}

function isHttpUrl(value) {
  try {
    const protocol = new URL(value).protocol
    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function safeDecodeComponent(part) {
  try {
    return decodeURIComponent(part)
  } catch {
    return part
  }
}

export class SpecStore {
  constructor() {
    this.cache = new Map()
  }

  normalizeSource(source, relativeTo = null) {
    if (isHttpUrl(source)) return source
    if (relativeTo && isHttpUrl(relativeTo)) return new URL(source, relativeTo).href
    if (path.isAbsolute(source)) return path.resolve(source)
    const base = relativeTo && !isHttpUrl(relativeTo) ? path.dirname(relativeTo) : process.cwd()
    return path.resolve(base, source)
  }

  async load(source, relativeTo = null) {
    const normalized = this.normalizeSource(source, relativeTo)
    if (this.cache.has(normalized)) return [this.cache.get(normalized), normalized]

    let text
    if (isHttpUrl(normalized)) {
      let response
      try {
        response = await fetch(normalized, {
          headers: { 'user-agent': 'openapi-explorer/1' },
          signal: AbortSignal.timeout(20_000)
        })
      } catch (error) {
        throw new SpecError(`无法下载 API 规范：${normalized}：${error.message}`)
      }
      if (!response.ok) {
        throw new SpecError(`无法下载 API 规范：${normalized}：HTTP ${response.status}`)
      }
      text = await response.text()
    } else {
      try {
        text = await readFile(normalized, 'utf8')
      } catch (error) {
        if (error.code === 'ENOENT') throw new SpecError(`未找到 API 规范文件：${normalized}`)
        throw new SpecError(`无法读取 API 规范：${normalized}：${error.message}`)
      }
    }

    const document = this.parse(text.replace(/^\uFEFF/, ''), normalized)
    if (!isObject(document)) throw new SpecError(`API 规范的根节点必须是对象：${normalized}`)
    this.cache.set(normalized, document)
    return [document, normalized]
  }

  parse(text, source) {
    try {
      return JSON.parse(text)
    } catch {
      try {
        return parseYaml(text)
      } catch (error) {
        throw new SpecError(`JSON 或 YAML 格式无效：${source}：${error.message}`)
      }
    }
  }

  async resolveRef(ref, currentSource) {
    const hashIndex = ref.indexOf('#')
    const filePart = hashIndex === -1 ? ref : ref.slice(0, hashIndex)
    const fragment = hashIndex === -1 ? '' : ref.slice(hashIndex + 1)
    let targetSource = currentSource
    if (filePart) [, targetSource] = await this.load(filePart, currentSource)
    const [document, loadedSource] = await this.load(targetSource)
    let value = document

    if (fragment) {
      if (!fragment.startsWith('/')) throw new SpecError(`不支持的 $ref 片段：${ref}`)
      for (const rawPart of fragment.slice(1).split('/')) {
        const part = safeDecodeComponent(rawPart).replaceAll('~1', '/').replaceAll('~0', '~')
        if ((Array.isArray(value) && /^\d+$/.test(part)) || (isObject(value) && Object.hasOwn(value, part))) {
          value = Array.isArray(value) ? value[Number(part)] : value[part]
        } else {
          throw new SpecError(`无法解析 $ref：${ref}，来源：${currentSource}`)
        }
      }
    }
    return [value, loadedSource]
  }

  async resolveObject(value, source) {
    if (!isObject(value) || !value.$ref) return [value, source]
    const [resolved, resolvedSource] = await this.resolveRef(String(value.$ref), source)
    if (!isObject(resolved)) return [resolved, resolvedSource]
    const siblings = Object.fromEntries(Object.entries(value).filter(([key]) => key !== '$ref'))
    return [{ ...resolved, ...siblings }, resolvedSource]
  }
}

async function fileExists(filename) {
  try {
    await access(filename)
    return true
  } catch {
    return false
  }
}

const SEARCH_SUBDIRS = [
  '', 'docs', 'doc', 'api', 'apis', 'specs', 'spec',
  path.join('src', 'main', 'resources')
]

export async function discoverSpec(scriptDirectory = path.dirname(fileURLToPath(import.meta.url))) {
  const checked = []
  const seen = new Set()
  for (const start of [process.cwd(), scriptDirectory]) {
    let directory = path.resolve(start)
    while (true) {
      for (const sub of SEARCH_SUBDIRS) {
        const currentDir = sub ? path.join(directory, sub) : directory
        for (const name of DEFAULT_SPEC_NAMES) {
          const candidate = path.join(currentDir, name)
          const key = candidate.toLocaleLowerCase()
          if (!seen.has(key)) {
            seen.add(key)
            checked.push(candidate)
            if (await fileExists(candidate)) return candidate
          }
        }
      }
      const parent = path.dirname(directory)
      if (parent === directory) break
      directory = parent
    }
  }
  throw new SpecError(`未找到 OpenAPI 文档，请传入 --spec PATH_OR_URL。\n已检查：\n${checked.map(p => `- ${p}`).join('\n')}`)
}

export function schemaBrief(schema) {
  if (schema === true) return 'any'
  if (schema === false) return 'never'
  if (!isObject(schema) || Object.keys(schema).length === 0) return ''
  if (schema.$ref) return String(schema.$ref).split('/').at(-1)
  for (const keyword of ['oneOf', 'anyOf', 'allOf']) {
    if (Array.isArray(schema[keyword])) {
      const summary = `${keyword}<${schema[keyword].map(item => schemaBrief(item) || 'object').join(', ')}>`
      return schema.nullable ? `${summary}?` : summary
    }
  }
  let base
  if (Array.isArray(schema.type)) base = schema.type.join(' | ')
  else base = String(schema.type || (schema.properties ? 'object' : 'any'))
  if (base === 'array') base = `array<${schemaBrief(schema.items || {}) || 'any'}>`
  if (schema.format) base += `(${schema.format})`
  if (Array.isArray(schema.enum)) base += ` enum[${schema.enum.join(', ')}]`
  if (schema.nullable && !base.includes('null') && !base.endsWith('?')) base += '?'
  return base
}

export class OpenAPIExplorer {
  static async create(spec = null, { depth = 3, limit = 50 } = {}) {
    const explorer = new OpenAPIExplorer(depth, limit)
    ;[explorer.data, explorer.source] = await explorer.store.load(spec || await discoverSpec())
    explorer.version = explorer.detectVersion()
    explorer.paths = explorer.data.paths || {}
    if (!isObject(explorer.paths)) throw new SpecError("API 规范中的 'paths' 字段必须是对象")
    return explorer
  }

  constructor(depth, limit) {
    this.store = new SpecStore()
    this.depth = Math.max(0, Number(depth) || 0)
    this.limit = Math.max(0, Number(limit) || 0)
  }

  detectVersion() {
    if (this.data.openapi) {
      const version = String(this.data.openapi)
      if (!version.startsWith('3.')) throw new SpecError(`不支持的 OpenAPI 版本：${version}`)
      return `OpenAPI ${version}`
    }
    if (String(this.data.swagger || '') === '2.0') return 'Swagger 2.0'
    throw new SpecError('文档既不是 Swagger 2.0，也不是 OpenAPI 3.x')
  }

  async operations() {
    const values = []
    for (const [apiPath, rawPathItem] of Object.entries(this.paths)) {
      const [pathItem, pathSource] = await this.store.resolveObject(rawPathItem, this.source)
      if (!isObject(pathItem)) continue
      for (const method of HTTP_METHODS) {
        if (!Object.hasOwn(pathItem, method)) continue
        const [operation, operationSource] = await this.store.resolveObject(pathItem[method], pathSource)
        if (isObject(operation)) values.push({ apiPath, method, operation, pathItem, source: operationSource })
      }
    }
    return values
  }

  apiSummary(apiPath, method, operation) {
    return {
      method: method.toUpperCase(),
      path: apiPath,
      tags: operation.tags || ['未分类'],
      summary: operation.summary || String(operation.description || '').split('\n', 1)[0],
      operationId: operation.operationId || '',
      deprecated: Boolean(operation.deprecated)
    }
  }

  bounded(values) {
    const returnedValues = this.limit === 0 ? values : values.slice(0, this.limit)
    return {
      count: values.length,
      returned: returnedValues.length,
      truncated: returnedValues.length < values.length,
      operations: returnedValues
    }
  }

  async info() {
    const info = this.data.info || {}
    const schemas = this.schemaRegistry()
    const securitySchemes = this.version.startsWith('OpenAPI')
      ? this.data.components?.securitySchemes || {}
      : this.data.securityDefinitions || {}
    return {
      source: this.source,
      specification: this.version,
      title: info.title || '',
      apiVersion: info.version || '',
      description: info.description || '',
      servers: this.servers({}, {}),
      operationCount: (await this.operations()).length,
      schemaCount: Object.keys(schemas).length,
      securitySchemes: isObject(securitySchemes) ? Object.keys(securitySchemes).sort() : []
    }
  }

  async tags() {
    const descriptions = new Map()
    for (const rawTag of this.data.tags || []) {
      const [tag] = await this.store.resolveObject(rawTag, this.source)
      if (isObject(tag) && tag.name) descriptions.set(String(tag.name), String(tag.description || ''))
    }
    const counts = new Map()
    for (const { operation } of await this.operations()) {
      for (const name of operation.tags || ['未分类']) {
        const value = String(name)
        counts.set(value, (counts.get(value) || 0) + 1)
      }
    }
    const names = [...new Set([...descriptions.keys(), ...counts.keys()])].sort((a, b) => a.localeCompare(b))
    return {
      source: this.source,
      tags: names.map(name => ({
        name,
        description: descriptions.get(name) || '',
        operationCount: counts.get(name) || 0
      }))
    }
  }

  async listOperations({ tag = null, method = null } = {}) {
    const values = []
    for (const { apiPath, method: itemMethod, operation } of await this.operations()) {
      const tags = (operation.tags || ['未分类']).map(String)
      if (tag && !tags.some(value => value.toLocaleLowerCase() === tag.toLocaleLowerCase())) continue
      if (method && method.toLocaleLowerCase() !== itemMethod.toLocaleLowerCase()) continue
      values.push(this.apiSummary(apiPath, itemMethod, operation))
    }
    return { source: this.source, filters: { tag, method }, ...this.bounded(values) }
  }

  async search(query, { tag = null, method = null } = {}) {
    const terms = query.split(/\s+/).filter(Boolean).map(term => term.toLocaleLowerCase())
    const values = []
    for (const { apiPath, method: itemMethod, operation, pathItem } of await this.operations()) {
      const tags = (operation.tags || ['未分类']).map(String)
      if (tag && !tags.some(value => value.toLocaleLowerCase() === tag.toLocaleLowerCase())) continue
      if (method && method.toLocaleLowerCase() !== itemMethod.toLocaleLowerCase()) continue
      const fields = [
        apiPath, itemMethod, operation.summary || '', operation.description || '',
        operation.operationId || '', ...tags,
        JSON.stringify(pathItem.parameters || []), JSON.stringify(operation.parameters || []),
        JSON.stringify(operation.requestBody || {}), JSON.stringify(operation.responses || {})
      ]
      const haystack = fields.join(' ').toLocaleLowerCase()
      if (terms.every(term => haystack.includes(term))) values.push(this.apiSummary(apiPath, itemMethod, operation))
    }
    return { source: this.source, query, filters: { tag, method }, ...this.bounded(values) }
  }

  async resolvedParameters(pathItem, operation, source) {
    const merged = new Map()
    for (const raw of [...(pathItem.parameters || []), ...(operation.parameters || [])]) {
      const [parameter, parameterSource] = await this.store.resolveObject(raw, source)
      if (!isObject(parameter)) continue
      merged.set(`${parameter.name || ''}\0${parameter.in || ''}`, [parameter, parameterSource])
    }
    return [...merged.values()]
  }

  parameterSchema(parameter) {
    if (Object.hasOwn(parameter, 'schema')) return parameter.schema
    if (isObject(parameter.content)) {
      const media = Object.values(parameter.content)[0] || {}
      return isObject(media) ? media.schema || {} : {}
    }
    return Object.fromEntries(SCHEMA_KEYS.filter(key => Object.hasOwn(parameter, key)).map(key => [key, parameter[key]]))
  }

  async operation(apiPath, method = null) {
    const all = await this.operations()
    let candidates = all.filter(item => item.apiPath === apiPath)
    if (candidates.length === 0) {
      const normalizedPath = apiPath.startsWith('/') ? apiPath : `/${apiPath}`
      const strippedPath = normalizedPath.endsWith('/') && normalizedPath.length > 1 ? normalizedPath.slice(0, -1) : normalizedPath
      candidates = all.filter(item => item.apiPath === normalizedPath || item.apiPath === strippedPath)
    }
    if (candidates.length === 0) {
      const close = [...new Set(all.filter(item => item.apiPath.toLocaleLowerCase().includes(apiPath.toLocaleLowerCase())).map(item => item.apiPath))]
      const suffix = close.length ? ` 相似路径：${close.slice(0, 5).join(', ')}` : ''
      throw new SpecError(`未找到路径：${apiPath}。${suffix}`)
    }
    const matchedPath = candidates[0].apiPath
    if (method) {
      candidates = candidates.filter(item => item.method === method.toLocaleLowerCase())
      if (candidates.length === 0) {
        const available = all.filter(item => item.apiPath === matchedPath).map(item => item.method.toUpperCase()).join(', ')
        throw new SpecError(`${matchedPath} 没有 ${method.toUpperCase()} 操作。可用方法：${available}`)
      }
    } else if (candidates.length !== 1) {
      throw new SpecError(`${matchedPath} 包含多个操作（${candidates.map(item => item.method.toUpperCase()).join(', ')}），请指定 HTTP 方法`)
    }

    const { method: selectedMethod, operation, pathItem, source } = candidates[0]
    const parameterItems = []
    const requestBodies = []
    for (const [parameter] of await this.resolvedParameters(pathItem, operation, source)) {
      const schema = this.parameterSchema(parameter)
      if (parameter.in === 'body') {
        const contentTypes = operation.consumes || this.data.consumes || ['application/json']
        for (const contentType of contentTypes) {
          requestBodies.push({
            required: Boolean(parameter.required),
            description: parameter.description || '',
            contentType,
            schema: schemaBrief(schema)
          })
        }
        continue
      }
      parameterItems.push({
        name: parameter.name || '',
        in: parameter.in || '',
        required: Boolean(parameter.required),
        description: parameter.description || '',
        schema: schemaBrief(schema),
        style: parameter.style || '',
        explode: parameter.explode ?? null
      })
    }

    if (operation.requestBody) {
      const [body, bodySource] = await this.store.resolveObject(operation.requestBody, source)
      if (isObject(body)) {
        for (const [contentType, rawMedia] of Object.entries(body.content || {})) {
          const [media] = await this.store.resolveObject(rawMedia, bodySource)
          requestBodies.push({
            required: Boolean(body.required),
            description: body.description || '',
            contentType,
            schema: isObject(media) ? schemaBrief(media.schema || {}) : ''
          })
        }
      }
    }

    const responses = []
    for (const [status, rawResponse] of Object.entries(operation.responses || {})) {
      const [response, responseSource] = await this.store.resolveObject(rawResponse, source)
      if (!isObject(response)) continue
      const content = []
      if (isObject(response.content)) {
        for (const [contentType, rawMedia] of Object.entries(response.content)) {
          const [media] = await this.store.resolveObject(rawMedia, responseSource)
          content.push({ contentType, schema: isObject(media) ? schemaBrief(media.schema || {}) : '' })
        }
      } else if (Object.hasOwn(response, 'schema')) {
        for (const contentType of operation.produces || this.data.produces || ['application/json']) {
          content.push({ contentType, schema: schemaBrief(response.schema) })
        }
      }
      responses.push({
        status: String(status),
        description: response.description || '',
        headers: Object.keys(response.headers || {}).sort(),
        content
      })
    }

    return {
      source: this.source,
      ...this.apiSummary(matchedPath, selectedMethod, operation),
      description: operation.description || '',
      externalDocs: operation.externalDocs || {},
      servers: this.servers(pathItem, operation),
      security: operation.security ?? this.data.security ?? [],
      parameters: parameterItems,
      requestBodies,
      responses
    }
  }

  servers(pathItem, operation) {
    if (this.version.startsWith('OpenAPI')) {
      const servers = operation.servers || pathItem.servers || this.data.servers || []
      return servers.filter(isObject).map(item => String(item.url || ''))
    }
    const host = this.data.host || ''
    if (!host) return []
    const basePath = this.data.basePath || ''
    const schemes = this.data.schemes || ['https']
    return schemes.map(scheme => `${scheme}://${host}${basePath}`)
  }

  schemaRegistry() {
    return this.version.startsWith('OpenAPI')
      ? this.data.components?.schemas || {}
      : this.data.definitions || {}
  }

  async schema(name) {
    const schemas = this.schemaRegistry()
    const cleanName = name.includes('/') ? name.split('/').filter(Boolean).at(-1) : name
    const actualName = Object.keys(schemas).find(key => key.toLocaleLowerCase() === cleanName.toLocaleLowerCase())
    if (!actualName) {
      const matches = Object.keys(schemas).filter(key => key.toLocaleLowerCase().includes(cleanName.toLocaleLowerCase()))
      const suffix = matches.length ? ` 相似 Schema：${matches.slice(0, 8).join(', ')}` : ''
      throw new SpecError(`未找到 Schema：${name}。${suffix}`)
    }
    const prefix = this.version.startsWith('OpenAPI') ? '#/components/schemas/' : '#/definitions/'
    const identity = `${this.source}|${prefix}${actualName}`
    const outline = await this.schemaOutline(schemas[actualName], this.source, this.depth, new Set([identity]))
    return { source: this.source, name: actualName, depth: this.depth, schema: outline }
  }

  async schemaOutline(schema, source, depth, seen) {
    if (typeof schema === 'boolean') return { type: schema ? 'any' : 'never' }
    if (!isObject(schema)) return schema

    if (schema.$ref) {
      const identity = `${source}|${schema.$ref}`
      if (seen.has(identity)) return { ref: schema.$ref, recursive: true }
      if (depth <= 0) return { ref: schema.$ref, summary: schemaBrief(schema) }
      let [resolved, resolvedSource] = await this.store.resolveRef(String(schema.$ref), source)
      if (isObject(resolved)) {
        const siblings = Object.fromEntries(Object.entries(schema).filter(([key]) => key !== '$ref'))
        resolved = { ...resolved, ...siblings }
      }
      const expanded = await this.schemaOutline(resolved, resolvedSource, depth - 1, new Set([...seen, identity]))
      return isObject(expanded) ? { ref: schema.$ref, ...expanded } : { ref: schema.$ref, value: expanded }
    }

    const result = {}
    for (const key of [
      'type', 'format', 'title', 'description', 'nullable', 'readOnly', 'writeOnly',
      'deprecated', 'default', 'example', 'enum', 'const', 'minimum', 'maximum',
      'exclusiveMinimum', 'exclusiveMaximum', 'minLength', 'maxLength', 'pattern',
      'minItems', 'maxItems', 'uniqueItems', 'minProperties', 'maxProperties'
    ]) {
      if (Object.hasOwn(schema, key)) result[key] = schema[key]
    }
    if (!Object.hasOwn(result, 'type')) result.type = schema.properties ? 'object' : schemaBrief(schema)
    if (schema.required?.length) result.required = schema.required
    if (Object.hasOwn(schema, 'items')) {
      result.items = depth
        ? await this.schemaOutline(schema.items, source, depth - 1, seen)
        : { summary: schemaBrief(schema.items) }
    }
    if (Object.hasOwn(schema, 'additionalProperties')) {
      const value = schema.additionalProperties
      result.additionalProperties = isObject(value) && depth
        ? await this.schemaOutline(value, source, depth - 1, seen)
        : value
    }
    if (isObject(schema.properties)) {
      result.properties = {}
      for (const [key, value] of Object.entries(schema.properties)) {
        result.properties[key] = depth
          ? await this.schemaOutline(value, source, depth - 1, seen)
          : { summary: schemaBrief(value) }
      }
    }
    for (const keyword of ['allOf', 'oneOf', 'anyOf']) {
      if (Array.isArray(schema[keyword])) {
        result[keyword] = []
        for (const value of schema[keyword]) {
          result[keyword].push(depth
            ? await this.schemaOutline(value, source, depth - 1, seen)
            : { summary: schemaBrief(value) })
        }
      }
    }
    if (Object.hasOwn(schema, 'not')) result.not = await this.schemaOutline(schema.not, source, depth - 1, seen)
    if (Object.hasOwn(schema, 'discriminator')) result.discriminator = schema.discriminator
    return result
  }
}

export function renderText(command, data) {
  if (command === 'info') {
    return [
      `文档：${data.source}`,
      `规范：${data.specification}`,
      `API：${data.title} ${data.apiVersion}`.trimEnd(),
      `接口数量：${data.operationCount}`,
      `Schema 数量：${data.schemaCount}`,
      `服务器：${data.servers.join(', ') || '（无）'}`,
      `安全方案：${data.securitySchemes.join(', ') || '（无）'}`
    ].join('\n')
  }
  if (command === 'tags') {
    return [`文档 ${data.source} 中的 Tag：`, ...data.tags.map(item =>
      `- ${item.name} (${item.operationCount})${item.description ? `: ${item.description}` : ''}`
    )].join('\n')
  }
  if (command === 'list' || command === 'search') {
    const lines = [`接口（返回 ${data.returned} 个，共 ${data.count} 个）：`]
    for (const item of data.operations) {
      let label = `[${item.method}] ${item.path}`
      if (item.summary) label += ` — ${item.summary}`
      if (item.operationId) label += ` (${item.operationId})`
      lines.push(label)
    }
    if (data.truncated) lines.push('结果已截断；请增大 --limit，或使用 --limit 0 返回全部结果。')
    return lines.join('\n')
  }
  if (command === 'operation') {
    const lines = [`[${data.method}] ${data.path}`]
    for (const [key, label] of [['summary', '摘要'], ['description', '描述'], ['operationId', '操作 ID']]) {
      if (data[key]) lines.push(`${label}: ${data[key]}`)
    }
    if (data.parameters.length) {
      lines.push('参数：')
      for (const item of data.parameters) {
        lines.push(`- ${item.name}（${item.in}，${item.required ? '必填' : '可选'}）：${item.schema}`)
      }
    }
    if (data.requestBodies.length) {
      lines.push('请求体：')
      for (const item of data.requestBodies) lines.push(`- ${item.contentType}: ${item.schema}`)
    }
    lines.push('响应：')
    for (const response of data.responses) {
      lines.push(`- ${response.status}: ${response.description}`)
      for (const content of response.content) lines.push(`  ${content.contentType}: ${content.schema}`)
    }
    return lines.join('\n')
  }
  if (command === 'schema') {
    return `Schema：${data.name}（展开深度：${data.depth}）\n${JSON.stringify(data.schema, null, 2)}`
  }
  return JSON.stringify(data, null, 2)
}

const HELP = `用法：openapi-explorer [全局选项] <命令> [命令选项及参数]

查询 Swagger 2.0 和 OpenAPI 3.x JSON/YAML 文档。

全局选项（可置于命令前或命令后）：
  --spec PATH_OR_URL     本地路径或 HTTP(S) 地址；省略时自动查找常见文件名
  --format text|json     输出格式（默认：text）
  --limit NUMBER         list/search 最大结果数；0 表示不限制（默认：50）
  --depth NUMBER         Schema 引用最大展开深度（默认：3）
  -h, --help             显示帮助

命令：
  info
  tags
  list [--tag TAG] [--method METHOD]
  search QUERY [--tag TAG] [--method METHOD]
  operation PATH [METHOD]
  schema NAME`

function takeOption(args, index, option) {
  if (index + 1 >= args.length) throw new SpecError(`${option} 需要一个值`)
  return args[index + 1]
}

export function parseCli(argv) {
  const args = [...argv]
  const result = { spec: null, format: 'text', limit: 50, depth: 3, command: null, commandArgs: [] }
  const commands = new Set(['info', 'tags', 'list', 'search', 'operation', 'schema'])
  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]
    if (value === '-h' || value === '--help') return { ...result, help: true }
    if (value === '--spec') result.spec = takeOption(args, index++, value)
    else if (value === '--format') result.format = takeOption(args, index++, value)
    else if (value === '--limit') result.limit = Number(takeOption(args, index++, value))
    else if (value === '--depth') result.depth = Number(takeOption(args, index++, value))
    else if (!result.command && commands.has(value)) {
      result.command = value
    } else if (!result.command) {
      if (value.startsWith('-')) throw new SpecError(`未知选项：${value}`)
      throw new SpecError(`未知命令：${value}`)
    } else {
      result.commandArgs.push(value)
    }
  }
  if (!result.command) throw new SpecError('必须提供命令。使用 --help 查看用法。')
  if (!['text', 'json'].includes(result.format)) throw new SpecError('--format 必须是 text 或 json')
  if (!Number.isInteger(result.limit) || result.limit < 0) throw new SpecError('--limit 必须是非负整数')
  if (!Number.isInteger(result.depth) || result.depth < 0) throw new SpecError('--depth 必须是非负整数')
  return result
}

function parseFilters(args) {
  const filters = { tag: null, method: null }
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--tag') filters.tag = takeOption(args, index++, '--tag')
    else if (args[index] === '--method') {
      filters.method = takeOption(args, index++, '--method').toLocaleLowerCase()
      if (!HTTP_METHODS.includes(filters.method)) throw new SpecError(`不支持的 HTTP 方法：${filters.method}`)
    } else throw new SpecError(`未知命令选项：${args[index]}`)
  }
  return filters
}

function parseSearchArgs(args) {
  const queryParts = []
  const filterArgs = []
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--tag') {
      filterArgs.push(args[index])
      filterArgs.push(takeOption(args, index++, '--tag'))
    } else if (args[index] === '--method') {
      filterArgs.push(args[index])
      filterArgs.push(takeOption(args, index++, '--method'))
    } else if (args[index].startsWith('--')) {
      throw new SpecError(`未知命令选项：${args[index]}`)
    } else {
      queryParts.push(args[index])
    }
  }
  const query = queryParts.join(' ').trim()
  if (!query) throw new SpecError('search 需要查询内容')
  return { query, filters: parseFilters(filterArgs) }
}

export async function runCli(argv = process.argv.slice(2)) {
  let options
  try {
    options = parseCli(argv)
    if (options.help) {
      console.log(HELP)
      return 0
    }
    const explorer = await OpenAPIExplorer.create(options.spec, { depth: options.depth, limit: options.limit })
    let result
    if (options.command === 'info' || options.command === 'tags') {
      if (options.commandArgs.length) throw new SpecError(`${options.command} 不接受参数`)
      result = await explorer[options.command]()
    } else if (options.command === 'list') {
      result = await explorer.listOperations(parseFilters(options.commandArgs))
    } else if (options.command === 'search') {
      const { query, filters } = parseSearchArgs(options.commandArgs)
      result = await explorer.search(query, filters)
    } else if (options.command === 'operation') {
      if (!options.commandArgs.length) throw new SpecError('operation 需要接口路径')
      if (options.commandArgs.length > 2) throw new SpecError('operation 只接受 PATH 和可选的 METHOD')
      const method = options.commandArgs[1]?.toLocaleLowerCase() || null
      if (method && !HTTP_METHODS.includes(method)) throw new SpecError(`不支持的 HTTP 方法：${method}`)
      result = await explorer.operation(options.commandArgs[0], method)
    } else if (options.command === 'schema') {
      if (options.commandArgs.length !== 1) throw new SpecError('schema 必须且只能提供一个名称')
      result = await explorer.schema(options.commandArgs[0])
    }
    console.log(options.format === 'json' ? JSON.stringify(result, null, 2) : renderText(options.command, result))
    return 0
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (options?.format === 'json') console.error(JSON.stringify({ error: message }))
    else console.error(`错误：${message}`)
    return 1
  }
}

const invokedAsScript = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
if (invokedAsScript) process.exitCode = await runCli()
