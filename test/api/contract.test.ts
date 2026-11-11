import * as Ajv2020Module from 'ajv/dist/2020.js';
import type { FastifyInstance } from 'fastify';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../server/app.js';

type JsonSchema = Record<string, unknown>;

// ajv ships the 2020 build as CJS with an ESM-style declaration, which TS 7's
// NodeNext interop surfaces as the module namespace, so unwrap the class manually.
type CompiledValidator = ((data: unknown) => boolean) & { errors: unknown };
type Ajv2020Like = new (options?: { strict?: boolean }) => {
  compile: (schema: JsonSchema) => CompiledValidator;
};

const Ajv2020 = (
  Ajv2020Module as unknown as { default: new (options?: { strict?: boolean }) => unknown }
).default as Ajv2020Like;

type Operation = {
  responses: Record<string, { content?: Record<string, { schema?: JsonSchema }> }>;
};

// The OpenAPI document is generated from TypeSpec, so validating live server
// responses against it catches drift between the server and the contract.
const openapi = JSON.parse(
  readFileSync(resolve(import.meta.dirname, '../../packages/api/generated/openapi.json'), 'utf8'),
) as { paths: Record<string, Record<string, Operation>> };

// Parameterless GET operations for now; extend with request payloads as the API grows.
const getOperations = Object.entries(openapi.paths)
  .filter(([, methods]) => methods.get !== undefined)
  .map(([path]) => ({ method: 'GET' as const, path }));

// ajv compiles schemas standalone, so inline the document-local `#/...` refs first.
function dereference(value: unknown, root: unknown, depth = 0): unknown {
  if (depth > 20 || value === null || typeof value !== 'object') {
    return value;
  }
  const ref = (value as Record<string, unknown>).$ref;
  if (typeof ref === 'string' && ref.startsWith('#/')) {
    let target: unknown = root;
    for (const segment of ref.slice(2).split('/')) {
      target = (target as Record<string, unknown>)?.[
        segment.replaceAll('~1', '/').replaceAll('~0', '~')
      ];
    }
    return dereference(target, root, depth + 1);
  }
  if (Array.isArray(value)) {
    return value.map((item) => dereference(item, root, depth + 1));
  }
  const copy: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    copy[key] = dereference(item, root, depth + 1);
  }
  return copy;
}

describe('API contract', () => {
  let app: FastifyInstance;
  const ajv = new Ajv2020({ strict: false });

  beforeAll(async () => {
    app = await buildApp({ serveClient: false, logger: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(getOperations)(
    '$method $path matches the generated OpenAPI contract',
    async ({ path }) => {
      const operation = openapi.paths[path]?.get;
      expect(operation, `GET ${path} is missing from the OpenAPI document`).toBeDefined();

      const response = await app.inject({ method: 'GET', url: path });
      const documented = operation?.responses[String(response.statusCode)];
      expect(
        documented,
        `GET ${path} returned undocumented status ${response.statusCode}`,
      ).toBeDefined();

      const schema = dereference(documented?.content?.['application/json']?.schema, openapi) as
        | JsonSchema
        | undefined;
      if (schema && typeof schema.type === 'string') {
        const validate = ajv.compile(schema);
        expect(validate(response.json()), JSON.stringify(validate.errors)).toBe(true);
      }
    },
  );
});
