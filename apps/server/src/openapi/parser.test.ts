import { describe, it, expect } from 'vitest';
import { parseOpenAPISpec } from './parser.js';

const minimalSpec = {
  openapi: '3.0.0',
  info: { title: 'Test API', version: '2.1.0' },
  paths: {
    '/users': {
      get: {
        operationId: 'listUsers',
        summary: 'List users',
        tags: ['users'],
        responses: {
          '200': { description: 'Success' },
        },
      },
      post: {
        summary: 'Create user',
        tags: ['users'],
        responses: {
          '201': { description: 'Created' },
        },
      },
    },
    '/users/{id}': {
      get: {
        operationId: 'getUser',
        summary: 'Get user',
        tags: ['users'],
        responses: {
          '200': { description: 'OK' },
          '404': { description: 'Not Found' },
        },
      },
      delete: {
        summary: 'Delete user',
        tags: ['users'],
        responses: {
          '204': { description: 'No Content' },
        },
      },
    },
  },
};

describe('parseOpenAPISpec', () => {
  it('returns metadata with title and version from spec info', async () => {
    const { metadata } = await parseOpenAPISpec(minimalSpec);
    expect(metadata.title).toBe('Test API');
    expect(metadata.version).toBe('2.1.0');
  });

  it('sets endpointCount in metadata', async () => {
    const { metadata } = await parseOpenAPISpec(minimalSpec);
    expect(metadata.endpointCount).toBe(4);
  });

  it('sets uploadedAt to a recent ISO timestamp', async () => {
    const before = Date.now();
    const { metadata } = await parseOpenAPISpec(minimalSpec);
    const after = Date.now();
    const uploadedAt = new Date(metadata.uploadedAt).getTime();
    expect(uploadedAt).toBeGreaterThanOrEqual(before);
    expect(uploadedAt).toBeLessThanOrEqual(after);
  });

  it('parses endpoints with correct HTTP methods', async () => {
    const { endpoints } = await parseOpenAPISpec(minimalSpec);
    const methods = endpoints.map((e) => e.method);
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('DELETE');
  });

  it('parses endpoint paths correctly', async () => {
    const { endpoints } = await parseOpenAPISpec(minimalSpec);
    const paths = endpoints.map((e) => e.path);
    expect(paths).toContain('/users');
    expect(paths).toContain('/users/{id}');
  });

  it('extracts operationId when present', async () => {
    const { endpoints } = await parseOpenAPISpec(minimalSpec);
    const getUsers = endpoints.find((e) => e.method === 'GET' && e.path === '/users');
    expect(getUsers?.operationId).toBe('listUsers');
  });

  it('extracts summary', async () => {
    const { endpoints } = await parseOpenAPISpec(minimalSpec);
    const getUsers = endpoints.find((e) => e.method === 'GET' && e.path === '/users');
    expect(getUsers?.summary).toBe('List users');
  });

  it('extracts tags', async () => {
    const { endpoints } = await parseOpenAPISpec(minimalSpec);
    const getUsers = endpoints.find((e) => e.method === 'GET' && e.path === '/users');
    expect(getUsers?.tags).toEqual(['users']);
  });

  it('defaults mode to passthrough', async () => {
    const { endpoints } = await parseOpenAPISpec(minimalSpec);
    for (const ep of endpoints) {
      expect(ep.mode).toBe('passthrough');
    }
  });

  it('parses all responses for an endpoint', async () => {
    const { endpoints } = await parseOpenAPISpec(minimalSpec);
    const getUser = endpoints.find((e) => e.path === '/users/{id}' && e.method === 'GET');
    expect(getUser?.responses).toHaveLength(2);
    const statuses = getUser!.responses!.map((r) => r.statusCode);
    expect(statuses).toContain(200);
    expect(statuses).toContain(404);
  });

  it('uses response description as name', async () => {
    const { endpoints } = await parseOpenAPISpec(minimalSpec);
    const getUser = endpoints.find((e) => e.path === '/users/{id}' && e.method === 'GET');
    const notFound = getUser!.responses!.find((r) => r.statusCode === 404);
    expect(notFound?.name).toBe('Not Found');
  });

  it('extracts inline example from response content', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    example: { id: 1, name: 'Widget' },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    const ep = endpoints[0];
    const res200 = ep.responses!.find((r) => r.statusCode === 200);
    expect(res200?.body).toContain('"id": 1');
    expect(res200?.body).toContain('"name": "Widget"');
  });

  it('generates example from schema when no inline example', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        id: { type: 'integer' },
                        name: { type: 'string' },
                        active: { type: 'boolean' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(body.id).toBe(0);
    expect(body.name).toBe('string');
    expect(body.active).toBe(true);
  });

  it('accepts a JSON string as input', async () => {
    const { metadata } = await parseOpenAPISpec(JSON.stringify(minimalSpec));
    expect(metadata.title).toBe('Test API');
  });

  it('skips non-HTTP-method keys in paths (e.g. parameters)', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          parameters: [{ name: 'X-Custom', in: 'header' }],
          get: {
            responses: { '200': { description: 'OK' } },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    expect(endpoints).toHaveLength(1);
    expect(endpoints[0].method).toBe('GET');
  });

  it('handles a spec with no paths', async () => {
    const spec = { openapi: '3.0.0', info: { title: 'Empty', version: '0' } };
    const { endpoints } = await parseOpenAPISpec(spec);
    expect(endpoints).toHaveLength(0);
  });

  it('skips responses with non-numeric status codes', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              default: { description: 'Default response' },
              '200': { description: 'OK' },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    // 'default' is skipped (NaN), only '200' is included
    expect(endpoints[0].responses).toHaveLength(1);
    expect(endpoints[0].responses![0].statusCode).toBe(200);
  });

  it('uses examples (plural) when no inline example', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    examples: {
                      basic: { value: { id: 42 } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(body.id).toBe(42);
  });

  it('uses the example entry directly when it has no value property', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    examples: {
                      raw: { id: 99 },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(body.id).toBe(99);
  });

  it('generates example from array schema', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toBe('string');
  });

  it('generates date-time string for string schema with date-time format', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: { createdAt: { type: 'string', format: 'date-time' } },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(() => new Date(body.createdAt)).not.toThrow();
    expect(new Date(body.createdAt).getFullYear()).toBeGreaterThan(2000);
  });

  it('uses const value and does not replace it with a generated value', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '422': {
                description: 'Error',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        error_code: { type: 'string', const: 'InvalidBUError' },
                        count: { type: 'integer' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(body.error_code).toBe('InvalidBUError');
    expect(body.count).toBe(0);
  });

  it('returns schema.example when present', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { type: 'object', example: { id: 'from-schema-example' } },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(body.id).toBe('from-schema-example');
  });

  it('returns schema.default when present and no example', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { type: 'string', default: 'default-value' },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(body).toBe('default-value');
  });

  it('generates a single response for a single-variant oneOf schema', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { oneOf: [{ type: 'string' }] },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    expect(endpoints[0].responses).toHaveLength(1);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(body).toBe('string');
  });

  it('generates a single response for a single-variant anyOf schema', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { anyOf: [{ type: 'integer' }] },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    expect(endpoints[0].responses).toHaveLength(1);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(body).toBe(0);
  });

  it('expands multi-variant anyOf into one SpecResponse per variant', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '422': {
                description: 'Validation Error',
                content: {
                  'application/json': {
                    schema: {
                      anyOf: [
                        { type: 'object', properties: { code: { type: 'string' } } },
                        { type: 'object', properties: { message: { type: 'string' } } },
                        { type: 'object', properties: { detail: { type: 'string' } } },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    expect(endpoints[0].responses).toHaveLength(3);
    const statuses = endpoints[0].responses!.map((r) => r.statusCode);
    expect(statuses).toEqual([422, 422, 422]);
  });

  it('expands multi-variant oneOf into one SpecResponse per variant', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: {
                      oneOf: [
                        { type: 'string' },
                        { type: 'integer' },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    expect(endpoints[0].responses).toHaveLength(2);
    expect(JSON.parse(endpoints[0].responses![0].body!)).toBe('string');
    expect(JSON.parse(endpoints[0].responses![1].body!)).toBe(0);
  });

  it('uses variant title in name when available', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '422': {
                description: 'Error',
                content: {
                  'application/json': {
                    schema: {
                      anyOf: [
                        { title: 'NotFoundError', type: 'object' },
                        { title: 'ValidationError', type: 'object' },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    expect(endpoints[0].responses![0].name).toBe('Error — NotFoundError');
    expect(endpoints[0].responses![1].name).toBe('Error — ValidationError');
  });

  it('falls back to indexed name when variant has no title', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '422': {
                description: 'Error',
                content: {
                  'application/json': {
                    schema: {
                      anyOf: [
                        { type: 'object' },
                        { type: 'object' },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    expect(endpoints[0].responses![0].name).toBe('Error (1)');
    expect(endpoints[0].responses![1].name).toBe('Error (2)');
  });

  it('does not expand allOf — treats it as a single composed schema', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { allOf: [{ type: 'boolean' }] },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    expect(endpoints[0].responses).toHaveLength(1);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(body).toBe(true);
  });

  it('returns null for an unknown schema type', async () => {
    const spec = {
      openapi: '3.0.0',
      info: { title: 'T', version: '1' },
      paths: {
        '/items': {
          get: {
            responses: {
              '200': {
                description: 'OK',
                content: {
                  'application/json': {
                    schema: { type: 'unknown-type' },
                  },
                },
              },
            },
          },
        },
      },
    };
    const { endpoints } = await parseOpenAPISpec(spec);
    const body = JSON.parse(endpoints[0].responses![0].body!);
    expect(body).toBeNull();
  });
});
