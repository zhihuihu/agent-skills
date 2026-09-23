import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

import { OpenAPIExplorer, SpecError, schemaBrief, discoverSpec } from '../scripts/openapi-explorer.mjs'

const OPENAPI_31 = {
  openapi: '3.1.0',
  info: { title: 'Pet API', version: '1.0' },
  servers: [{ url: 'https://api.example.test/v1' }],
  paths: {
    '/pets/{id}': {
      parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
      get: {
        tags: ['pets'],
        operationId: 'getPet',
        summary: 'Get a pet',
        parameters: [{ $ref: '#/components/parameters/Trace' }],
        responses: { 200: { $ref: '#/components/responses/PetResponse' } }
      },
      head: { tags: ['pets'], responses: { 200: { description: 'ok' } } }
    },
    '/pets': {
      post: {
        tags: ['pets'],
        summary: 'Create a pet',
        requestBody: { $ref: '#/components/requestBodies/PetBody' },
        responses: { 201: { description: 'created' } }
      }
    }
  },
  components: {
    parameters: {
      Trace: { name: 'trace', in: 'query', schema: { type: 'boolean' } }
    },
    requestBodies: {
      PetBody: {
        required: true,
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } }
      }
    },
    responses: {
      PetResponse: {
        description: 'ok',
        content: { 'application/json': { schema: { $ref: '#/components/schemas/Pet' } } }
      }
    },
    schemas: {
      Pet: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
          owner: { $ref: '#/components/schemas/Owner' }
        }
      },
      NamedPet: {
        $ref: '#/components/schemas/Pet',
        description: 'A pet with a schema-local description'
      },
      Owner: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          pet: { $ref: '#/components/schemas/Pet' }
        }
      }
    },
    securitySchemes: { bearer: { type: 'http', scheme: 'bearer' } }
  }
}

const SWAGGER_20 = {
  swagger: '2.0',
  info: { title: 'Legacy Pet API', version: '2.0' },
  host: 'legacy.example.test',
  basePath: '/api',
  schemes: ['https'],
  consumes: ['application/json'],
  produces: ['application/json'],
  paths: {
    '/pets': {
      post: {
        tags: ['pets'],
        operationId: 'addPet',
        parameters: [
          { name: 'body', in: 'body', required: true, schema: { $ref: '#/definitions/Pet' } },
          { name: 'dryRun', in: 'query', type: 'boolean' }
        ],
        responses: { 200: { description: 'ok', schema: { $ref: '#/definitions/Pet' } } }
      }
    }
  },
  definitions: {
    Pet: {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer', format: 'int64' } }
    }
  }
}

async function temporaryDirectory() {
  return mkdtemp(path.join(tmpdir(), 'openapi-explorer-'))
}

async function writeJson(directory, name, value) {
  const filename = path.join(directory, name)
  await writeFile(filename, JSON.stringify(value), 'utf8')
  return filename
}

test('OpenAPI info, inferred tags, and standard HTTP methods', async t => {
  const directory = await temporaryDirectory()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const explorer = await OpenAPIExplorer.create(await writeJson(directory, 'openapi.json', OPENAPI_31))
  const info = await explorer.info()
  assert.equal(info.specification, 'OpenAPI 3.1.0')
  assert.equal(info.operationCount, 3)
  assert.deepEqual(info.securitySchemes, ['bearer'])
  assert.equal((await explorer.tags()).tags[0].operationCount, 3)
  assert.deepEqual(new Set((await explorer.listOperations()).operations.map(item => item.method)), new Set(['GET', 'HEAD', 'POST']))
})

test('operation merges path parameters and resolves reusable components', async t => {
  const directory = await temporaryDirectory()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const explorer = await OpenAPIExplorer.create(await writeJson(directory, 'openapi.json', OPENAPI_31))
  const detail = await explorer.operation('/pets/{id}', 'get')
  assert.deepEqual(detail.parameters.map(item => item.name), ['id', 'trace'])
  assert.equal(detail.responses[0].content[0].schema, 'Pet')
  const create = await explorer.operation('/pets', 'post')
  assert.equal(create.requestBodies[0].required, true)
  assert.equal(create.requestBodies[0].schema, 'Pet')
})

test('search matches operation IDs and multiple terms', async t => {
  const directory = await temporaryDirectory()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const explorer = await OpenAPIExplorer.create(await writeJson(directory, 'openapi.json', OPENAPI_31))
  const result = await explorer.search('getPet pets')
  assert.equal(result.count, 1)
  assert.equal(result.operations[0].method, 'GET')
})

test('schema expansion preserves siblings and stops cycles', async t => {
  const directory = await temporaryDirectory()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const explorer = await OpenAPIExplorer.create(await writeJson(directory, 'openapi.json', OPENAPI_31), { depth: 4 })
  const pet = (await explorer.schema('pet')).schema
  assert.ok(pet.properties.owner)
  assert.equal(pet.properties.owner.properties.pet.recursive, true)
  const named = (await explorer.schema('NamedPet')).schema
  assert.equal(named.description, 'A pet with a schema-local description')
})

test('Swagger 2 body, response, definitions, and server URL', async t => {
  const directory = await temporaryDirectory()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const explorer = await OpenAPIExplorer.create(await writeJson(directory, 'swagger.json', SWAGGER_20))
  assert.equal((await explorer.info()).specification, 'Swagger 2.0')
  const detail = await explorer.operation('/pets', 'post')
  assert.equal(detail.parameters[0].schema, 'boolean')
  assert.equal(detail.requestBodies[0].schema, 'Pet')
  assert.equal(detail.responses[0].content[0].schema, 'Pet')
  assert.deepEqual(detail.servers, ['https://legacy.example.test/api'])
  const petId = (await explorer.schema('Pet')).schema.properties.id
  assert.deepEqual({ type: petId.type, format: petId.format }, { type: 'integer', format: 'int64' })
})

test('YAML and relative external references', async t => {
  const directory = await temporaryDirectory()
  t.after(() => rm(directory, { recursive: true, force: true }))
  await writeFile(path.join(directory, 'models.yaml'), 'Pet:\n  type: object\n  properties:\n    id: {type: string}\n', 'utf8')
  await writeFile(
    path.join(directory, 'openapi.yaml'),
    "openapi: 3.0.3\ninfo: {title: External, version: '1'}\npaths: {}\ncomponents:\n  schemas:\n    Pet:\n      $ref: './models.yaml#/Pet'\n",
    'utf8'
  )
  const explorer = await OpenAPIExplorer.create(path.join(directory, 'openapi.yaml'))
  assert.equal((await explorer.schema('Pet')).schema.properties.id.type, 'string')
})

test('HTTP document and HTTP-relative external reference', async t => {
  const directory = await temporaryDirectory()
  t.after(() => rm(directory, { recursive: true, force: true }))
  await writeFile(path.join(directory, 'models.yaml'), 'Pet:\n  type: object\n  properties:\n    id: {type: string}\n', 'utf8')
  await writeJson(directory, 'openapi.json', {
    openapi: '3.0.3',
    info: { title: 'Remote', version: '1' },
    paths: {},
    components: { schemas: { Pet: { $ref: './models.yaml#/Pet' } } }
  })

  const server = createServer(async (request, response) => {
    try {
      const filename = path.join(directory, new URL(request.url, 'http://localhost').pathname)
      response.end(await readFileSafe(filename))
    } catch {
      response.statusCode = 404
      response.end('not found')
    }
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(() => new Promise(resolve => server.close(resolve)))
  const { port } = server.address()
  const explorer = await OpenAPIExplorer.create(`http://127.0.0.1:${port}/openapi.json`)
  assert.equal((await explorer.schema('Pet')).schema.properties.id.type, 'string')
})

async function readFileSafe(filename) {
  return readFile(filename)
}

test('limits, errors, and bundled CLI', async t => {
  const directory = await temporaryDirectory()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const filename = await writeJson(directory, 'openapi.json', OPENAPI_31)
  const explorer = await OpenAPIExplorer.create(filename, { limit: 1 })
  const result = await explorer.listOperations()
  assert.deepEqual({ count: result.count, returned: result.returned, truncated: result.truncated }, { count: 3, returned: 1, truncated: true })
  await assert.rejects(() => explorer.operation('/missing', 'get'), SpecError)
  await assert.rejects(() => explorer.schema('Missing'), SpecError)

  const bundle = path.resolve('scripts/openapi-explorer.mjs')
  const execution = spawnSync(process.execPath, [bundle, '--spec', filename, '--format', 'json', 'list', '--method', 'GET'], { encoding: 'utf8' })
  assert.equal(execution.status, 0, execution.stderr)
  const output = JSON.parse(execution.stdout)
  assert.equal(output.filters.method, 'get')
  assert.equal(output.count, 1)
})

test('flexible CLI options placement (before and after commands)', async t => {
  const directory = await temporaryDirectory()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const filename = await writeJson(directory, 'openapi.json', OPENAPI_31)
  const bundle = path.resolve('scripts/openapi-explorer.mjs')

  // Global options placed AFTER the command
  const exec1 = spawnSync(process.execPath, [bundle, 'info', '--spec', filename, '--format', 'json'], { encoding: 'utf8' })
  assert.equal(exec1.status, 0, exec1.stderr)
  const info = JSON.parse(exec1.stdout)
  assert.equal(info.specification, 'OpenAPI 3.1.0')

  // Global options mixed with command options placed after
  const exec2 = spawnSync(process.execPath, [bundle, 'list', '--tag', 'pets', '--format', 'json', '--spec', filename], { encoding: 'utf8' })
  assert.equal(exec2.status, 0, exec2.stderr)
  const list = JSON.parse(exec2.stdout)
  assert.equal(list.count, 3)

  // Search with query and flags placed after
  const exec3 = spawnSync(process.execPath, [bundle, 'search', 'getPet', '--method', 'GET', '--format', 'json', '--spec', filename], { encoding: 'utf8' })
  assert.equal(exec3.status, 0, exec3.stderr)
  const search = JSON.parse(exec3.stdout)
  assert.equal(search.count, 1)

  // Schema with depth and format placed after
  const exec4 = spawnSync(process.execPath, [bundle, 'schema', 'Pet', '--depth', '1', '--format', 'json', '--spec', filename], { encoding: 'utf8' })
  assert.equal(exec4.status, 0, exec4.stderr)
  const schema = JSON.parse(exec4.stdout)
  assert.equal(schema.name, 'Pet')
})

test('tolerant path and schema name resolution', async t => {
  const directory = await temporaryDirectory()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const filename = await writeJson(directory, 'openapi.json', OPENAPI_31)
  const explorer = await OpenAPIExplorer.create(filename)

  // Missing leading slash
  const op1 = await explorer.operation('pets/{id}', 'get')
  assert.equal(op1.path, '/pets/{id}')

  // Trailing slash
  const op2 = await explorer.operation('/pets/{id}/', 'get')
  assert.equal(op2.path, '/pets/{id}')

  // Schema name with #/components/schemas/ prefix
  const sc1 = await explorer.schema('#/components/schemas/Pet')
  assert.equal(sc1.name, 'Pet')

  // Schema name with components/schemas/ prefix
  const sc2 = await explorer.schema('components/schemas/Pet')
  assert.equal(sc2.name, 'Pet')
})

test('OpenAPI 3.0 nullable in schemaBrief', () => {
  assert.equal(schemaBrief({ type: 'string', nullable: true }), 'string?')
  assert.equal(schemaBrief({ type: 'integer', format: 'int64', nullable: true }), 'integer(int64)?')
  assert.equal(schemaBrief({ type: ['string', 'null'] }), 'string | null')
})

test('auto discover spec in subdirectories like docs/', async t => {
  const directory = await temporaryDirectory()
  t.after(() => rm(directory, { recursive: true, force: true }))
  const docsDir = path.join(directory, 'docs')
  await mkdir(docsDir, { recursive: true })
  const specFile = await writeJson(docsDir, 'openapi.yaml', OPENAPI_31)
  const discovered = await discoverSpec(directory)
  assert.equal(path.resolve(discovered), path.resolve(specFile))
})
