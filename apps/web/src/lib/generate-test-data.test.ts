import { generateTestData } from './generate-test-data';

describe('generateTestData', () => {
  it('returns null for null schema', () => {
    expect(generateTestData(null)).toBeNull();
  });

  it('returns null for undefined schema', () => {
    expect(generateTestData(undefined)).toBeNull();
  });

  it('returns const value exactly as-is', () => {
    expect(generateTestData({ const: 'InvalidBUError', type: 'string' })).toBe('InvalidBUError');
    expect(generateTestData({ const: 0 })).toBe(0);
    expect(generateTestData({ const: false })).toBe(false);
    expect(generateTestData({ const: null })).toBeNull();
  });

  it('preserves const on a property whose key would match a heuristic', () => {
    const schema = {
      type: 'object',
      properties: {
        type: { type: 'string', const: 'ConflictingBUError' },
        status: { type: 'string', const: 'active_override' },
      },
    };
    const result = generateTestData(schema);
    expect(result.type).toBe('ConflictingBUError');
    expect(result.status).toBe('active_override');
  });

  it('returns example value if present', () => {
    expect(generateTestData({ example: 'hello' })).toBe('hello');
    expect(generateTestData({ example: 0 })).toBe(0);
    expect(generateTestData({ example: false })).toBe(false);
  });

  it('returns default value if present', () => {
    expect(generateTestData({ default: 42 })).toBe(42);
  });

  it('picks from enum', () => {
    const schema = { enum: ['a', 'b', 'c'] };
    const result = generateTestData(schema);
    expect(['a', 'b', 'c']).toContain(result);
  });

  it('handles oneOf by picking a variant', () => {
    const schema = { oneOf: [{ type: 'string' }, { type: 'integer' }] };
    const result = generateTestData(schema);
    expect(result !== null && result !== undefined).toBe(true);
  });

  it('handles anyOf by picking a variant', () => {
    const schema = { anyOf: [{ type: 'string' }] };
    const result = generateTestData(schema);
    expect(typeof result).toBe('string');
  });

  it('handles allOf by merging properties', () => {
    const schema = {
      allOf: [
        { type: 'object', properties: { name: { type: 'string' } } },
        { properties: { age: { type: 'integer' } } },
      ],
    };
    const result = generateTestData(schema);
    expect(result).toHaveProperty('name');
    expect(result).toHaveProperty('age');
  });

  it('handles allOf with type set on sub-schema', () => {
    const schema = {
      allOf: [
        { type: 'object', properties: { id: { type: 'string' } } },
        { type: 'object', properties: { count: { type: 'integer' } } },
      ],
    };
    const result = generateTestData(schema);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('count');
  });

  it('handles object type with properties', () => {
    const schema = {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
      },
    };
    const result = generateTestData(schema);
    expect(result).toHaveProperty('id');
    expect(result).toHaveProperty('name');
  });

  it('handles object via properties without explicit type', () => {
    const schema = {
      properties: {
        value: { type: 'integer' },
      },
    };
    const result = generateTestData(schema);
    expect(result).toHaveProperty('value');
  });

  it('handles array type', () => {
    const schema = { type: 'array', items: { type: 'string' } };
    const result = generateTestData(schema);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('handles array type with no items', () => {
    const schema = { type: 'array' };
    const result = generateTestData(schema);
    expect(Array.isArray(result)).toBe(true);
  });

  it('handles string with uuid format', () => {
    const result = generateTestData({ type: 'string', format: 'uuid' });
    expect(typeof result).toBe('string');
    expect(result).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('handles string with email format', () => {
    const result = generateTestData({ type: 'string', format: 'email' });
    expect(typeof result).toBe('string');
    expect(result).toContain('@');
  });

  it('handles string with date-time format', () => {
    const result = generateTestData({ type: 'string', format: 'date-time' });
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('handles string with date format', () => {
    const result = generateTestData({ type: 'string', format: 'date' });
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('handles string with uri format', () => {
    const result = generateTestData({ type: 'string', format: 'uri' });
    expect(result).toMatch(/^https:\/\//);
  });

  it('handles string with url format', () => {
    const result = generateTestData({ type: 'string', format: 'url' });
    expect(result).toMatch(/^https:\/\//);
  });

  it('handles string with hostname format', () => {
    const result = generateTestData({ type: 'string', format: 'hostname' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles string with ipv4 format', () => {
    const result = generateTestData({ type: 'string', format: 'ipv4' });
    expect(result).toMatch(/^\d+\.\d+\.\d+\.\d+$/);
  });

  it('returns a lorem word for plain string', () => {
    const result = generateTestData({ type: 'string' });
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });

  it('handles integer type', () => {
    const result = generateTestData({ type: 'integer' });
    expect(Number.isInteger(result)).toBe(true);
  });

  it('handles number type', () => {
    const result = generateTestData({ type: 'number' });
    expect(typeof result).toBe('number');
  });

  it('handles integer with min/max', () => {
    const result = generateTestData({ type: 'integer', minimum: 5, maximum: 5 });
    expect(result).toBe(5);
  });

  it('handles number type returns rounded value', () => {
    const result = generateTestData({ type: 'number', minimum: 10, maximum: 10 });
    expect(typeof result).toBe('number');
  });

  it('handles boolean type', () => {
    const result = generateTestData({ type: 'boolean' });
    expect(typeof result).toBe('boolean');
  });

  it('returns null for unknown schema type', () => {
    expect(generateTestData({ type: 'unknown_type' })).toBeNull();
  });
});

describe('generateTestData heuristic keys', () => {
  function obj(key: string, schema: any = {}) {
    return generateTestData({ type: 'object', properties: { [key]: schema } });
  }

  it('generates uuid for id key', () => {
    const result = obj('id');
    expect(result.id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('generates uuid for uid key', () => {
    const result = obj('uid');
    expect(result.uid).toMatch(/^[0-9a-f-]+$/);
  });

  it('generates uuid for short keys ending in "id"', () => {
    const result = obj('userId');
    expect(result.userId).toMatch(/^[0-9a-f-]+$/);
  });

  it('generates email for email key', () => {
    const result = obj('email');
    expect(result.email).toContain('@');
  });

  it('generates email for email schema format', () => {
    const result = obj('contact', { format: 'email' });
    expect(result.contact).toContain('@');
  });

  it('generates phone number for phone key', () => {
    const result = obj('phone');
    expect(result.phone).toMatch(/^\+1-\d{3}-\d{3}-\d{4}$/);
  });

  it('generates phone number for mobile key', () => {
    const result = obj('mobile');
    expect(result.mobile).toMatch(/^\+1-\d{3}-\d{3}-\d{4}$/);
  });

  it('generates full name for name key', () => {
    const result = obj('name');
    expect(result.name).toMatch(/^\w+ \w+$/);
  });

  it('generates first name for firstName key', () => {
    const result = obj('firstName');
    expect(typeof result.firstName).toBe('string');
  });

  it('generates last name for lastName key', () => {
    const result = obj('lastName');
    expect(typeof result.lastName).toBe('string');
  });

  it('generates username for username key', () => {
    const result = obj('username');
    expect(typeof result.username).toBe('string');
    expect(result.username.length).toBeGreaterThan(0);
  });

  it('generates city for city key', () => {
    const result = obj('city');
    expect(typeof result.city).toBe('string');
  });

  it('generates country for country key', () => {
    const result = obj('country');
    expect(typeof result.country).toBe('string');
  });

  it('generates zip code for zipCode key', () => {
    const result = obj('zipCode');
    expect(result.zipCode).toMatch(/^\d{5}$/);
  });

  it('generates address for address key', () => {
    const result = obj('address');
    expect(typeof result.address).toBe('string');
  });

  it('generates color for color key', () => {
    const result = obj('color');
    expect(result.color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('generates color for colour key', () => {
    const result = obj('colour');
    expect(result.colour).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('generates age for age key', () => {
    const result = obj('age');
    expect(result.age).toBeGreaterThanOrEqual(18);
    expect(result.age).toBeLessThanOrEqual(75);
  });

  it('generates price for price key', () => {
    const result = obj('price');
    expect(typeof result.price).toBe('number');
  });

  it('generates count for count key', () => {
    const result = obj('count');
    expect(typeof result.count).toBe('number');
  });

  it('generates percent for percent key', () => {
    const result = obj('percent');
    expect(result.percent).toBeGreaterThanOrEqual(0);
    expect(result.percent).toBeLessThanOrEqual(100);
  });

  it('generates URL for url key', () => {
    const result = obj('url');
    expect(result.url).toMatch(/^https:\/\//);
  });

  it('generates URL for website key', () => {
    const result = obj('website');
    expect(result.website).toMatch(/^https:\/\//);
  });

  it('generates URL for uri schema format', () => {
    const result = obj('link', { format: 'uri' });
    expect(result.link).toMatch(/^https:\/\//);
  });

  it('generates description for description key', () => {
    const result = obj('description');
    expect(typeof result.description).toBe('string');
  });

  it('generates text for bio key', () => {
    const result = obj('bio');
    expect(typeof result.bio).toBe('string');
  });

  it('generates title for title key', () => {
    const result = obj('title');
    expect(typeof result.title).toBe('string');
  });

  it('generates text for text key', () => {
    const result = obj('text');
    expect(typeof result.text).toBe('string');
  });

  it('generates timestamp for createdAt key', () => {
    const result = obj('createdAt');
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('generates timestamp for date-time schema format', () => {
    const result = obj('ts', { format: 'date-time' });
    expect(result.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('generates status for status key', () => {
    const result = obj('status');
    expect(['active', 'inactive', 'pending', 'completed']).toContain(result.status);
  });

  it('generates role for role key', () => {
    const result = obj('role');
    expect(['user', 'admin', 'moderator', 'editor']).toContain(result.role);
  });

  it('generates type for type key', () => {
    const result = obj('type');
    expect(['default', 'primary', 'secondary']).toContain(result.type);
  });

  it('generates locale for locale key', () => {
    const result = obj('locale');
    expect(['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP']).toContain(result.locale);
  });

  it('generates timezone for timezone key', () => {
    const result = obj('timezone');
    expect(['UTC', 'America/New_York', 'Europe/Berlin', 'Asia/Tokyo']).toContain(result.timezone);
  });

  it('generates currency for currency key', () => {
    const result = obj('currency');
    expect(['USD', 'EUR', 'GBP', 'JPY']).toContain(result.currency);
  });

  it('generates version for version key', () => {
    const result = obj('version');
    expect(result.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('generates token for token key', () => {
    const result = obj('token');
    expect(typeof result.token).toBe('string');
    expect(result.token).toHaveLength(32);
  });

  it('generates apiKey value for apiKey key', () => {
    const result = obj('apiKey');
    expect(typeof result.apiKey).toBe('string');
    expect(result.apiKey).toHaveLength(32);
  });

  it('falls back to schema-based generation for unknown keys', () => {
    const result = generateTestData({
      type: 'object',
      properties: {
        unknownField: { type: 'integer', minimum: 42, maximum: 42 },
      },
    });
    expect(result.unknownField).toBe(42);
  });
});
