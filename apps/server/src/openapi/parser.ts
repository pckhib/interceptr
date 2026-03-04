import * as OpenAPIParser from '@readme/openapi-parser';
import type { EndpointConfig, SpecMetadata, SpecResponse } from '@interceptr/shared';

interface OpenAPISpec {
  info: { title: string; version: string };
  paths?: Record<string, Record<string, any>>;
}

export type ParsedEndpoint = Omit<EndpointConfig, 'specId'>;

export async function parseOpenAPISpec(
  specInput: string | object,
): Promise<{ metadata: SpecMetadata; endpoints: ParsedEndpoint[] }> {
  const spec = typeof specInput === 'string' ? JSON.parse(specInput) : specInput;
  const dereferenced = (await OpenAPIParser.dereference(structuredClone(spec))) as unknown as OpenAPISpec;
  await OpenAPIParser.validate(structuredClone(spec));

  const endpoints: ParsedEndpoint[] = [];
  const paths = dereferenced.paths ?? {};

  for (const [path, methods] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(methods)) {
      if (['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(method)) {
        const upperMethod = method.toUpperCase();
        const id = `${upperMethod}:${path}`;
        
        const responses: SpecResponse[] = [];
        if (operation.responses) {
          for (const [statusCodeStr, response] of Object.entries(operation.responses)) {
            const statusCode = parseInt(statusCodeStr, 10);
            if (isNaN(statusCode)) continue;

            let body = '';
            let schema: object | undefined;
            const content = (response as any).content;
            if (content && content['application/json']) {
              const jsonContent = content['application/json'];
              if (jsonContent.example) {
                body = JSON.stringify(jsonContent.example, null, 2);
              } else if (jsonContent.examples) {
                const firstExample = Object.values(jsonContent.examples)[0] as any;
                body = JSON.stringify(firstExample.value || firstExample, null, 2);
              } else if (jsonContent.schema) {
                body = JSON.stringify(generateExampleFromSchema(jsonContent.schema), null, 2);
              }
              if (jsonContent.schema) {
                schema = safeClone(jsonContent.schema);
              }
            }

            responses.push({
              statusCode,
              name: (response as any).description || `Status ${statusCode}`,
              description: (response as any).description,
              body,
              headers: {},
              schema,
            });
          }
        }

        endpoints.push({
          id,
          method: upperMethod,
          path,
          operationId: operation.operationId,
          summary: operation.summary,
          tags: operation.tags ?? [],
          mode: 'passthrough',
          responses,
        });
      }
    }
  }

  const metadata: SpecMetadata = {
    title: dereferenced.info.title,
    version: dereferenced.info.version,
    endpointCount: endpoints.length,
    uploadedAt: new Date().toISOString(),
  };

  return { metadata, endpoints };
}

function safeClone(value: any): object | undefined {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return undefined;
  }
}

function generateExampleFromSchema(schema: any): any {
  if (schema.example) return schema.example;
  if (schema.default !== undefined) return schema.default;

  if (schema.type === 'object') {
    const obj: any = {};
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        obj[key] = generateExampleFromSchema(prop);
      }
    }
    return obj;
  } else if (schema.type === 'array') {
    return [generateExampleFromSchema(schema.items || {})];
  } else if (schema.type === 'string') {
    return schema.format === 'date-time' ? new Date().toISOString() : 'string';
  } else if (schema.type === 'number' || schema.type === 'integer') {
    return 0;
  } else if (schema.type === 'boolean') {
    return true;
  }

  if (schema.oneOf || schema.anyOf || schema.allOf) {
    const sub = schema.oneOf?.[0] || schema.anyOf?.[0] || schema.allOf?.[0];
    if (sub) return generateExampleFromSchema(sub);
  }

  return null;
}
