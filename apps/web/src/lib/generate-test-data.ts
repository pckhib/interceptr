const FIRST_NAMES = ['Alice', 'Bob', 'Carol', 'David', 'Emma', 'Frank', 'Grace', 'Henry', 'Isla', 'James'];
const LAST_NAMES = ['Johnson', 'Smith', 'Williams', 'Brown', 'Davis', 'Miller', 'Wilson', 'Taylor', 'Anderson', 'Thomas'];
const CITIES = ['New York', 'London', 'Berlin', 'Tokyo', 'Sydney', 'Paris', 'Toronto', 'Amsterdam', 'Singapore', 'Dubai'];
const COUNTRIES = ['United States', 'United Kingdom', 'Germany', 'Japan', 'Australia', 'France', 'Canada', 'Netherlands'];
const DOMAINS = ['example.com', 'test.org', 'demo.io', 'sample.net', 'mock.dev'];
const LOREM = ['lorem', 'ipsum', 'dolor', 'sit', 'amet', 'consectetur', 'adipiscing', 'elit', 'sed', 'do', 'eiusmod', 'tempor'];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function isoDate(): string {
  const d = new Date();
  d.setDate(d.getDate() - randInt(0, 365));
  return d.toISOString();
}

function sentence(words = randInt(5, 12)): string {
  return Array.from({ length: words }, () => pick(LOREM)).join(' ');
}

function emailAddr(): string {
  return `${pick(FIRST_NAMES).toLowerCase()}.${pick(LAST_NAMES).toLowerCase()}@${pick(DOMAINS)}`;
}

function urlStr(): string {
  return `https://${pick(DOMAINS)}/${pick(LOREM)}-${randInt(1, 9999)}`;
}

function heuristic(key: string, schema: any): any {
  const k = key.toLowerCase().replace(/[-_ ]/g, '');

  if (['id', 'uid', 'uuid', 'guid'].includes(k) || (k.endsWith('id') && k.length <= 8)) return uuid();
  if (k === 'email' || schema?.format === 'email') return emailAddr();
  if (k.includes('phone') || k.includes('mobile') || k.includes('tel')) return `+1-${randInt(200, 999)}-${randInt(200, 999)}-${randInt(1000, 9999)}`;
  if (k === 'name' || k === 'fullname' || k === 'displayname') return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  if (k === 'firstname' || k === 'givenname') return pick(FIRST_NAMES);
  if (k === 'lastname' || k === 'surname' || k === 'familyname') return pick(LAST_NAMES);
  if (k === 'username' || k === 'login' || k === 'handle') return `${pick(FIRST_NAMES).toLowerCase()}${randInt(10, 99)}`;
  if (k === 'city') return pick(CITIES);
  if (k === 'country') return pick(COUNTRIES);
  if (k === 'zipcode' || k === 'postalcode' || k === 'zip') return `${randInt(10000, 99999)}`;
  if (k === 'address' || k === 'street') return `${randInt(1, 999)} ${pick(LOREM).replace(/^\w/, (c) => c.toUpperCase())} St`;
  if (k === 'color' || k === 'colour') return `#${randInt(0, 0xffffff).toString(16).padStart(6, '0')}`;
  if (k === 'age') return randInt(18, 75);
  if (k.includes('price') || k.includes('amount') || k.includes('cost') || k.includes('salary')) return Math.round(randInt(100, 99900)) / 100;
  if (k.includes('count') || k.includes('quantity') || k.includes('num')) return randInt(1, 100);
  if (k.includes('percent') || k.includes('rate') || k.includes('ratio')) return randInt(0, 100);
  if (k.includes('url') || k.includes('href') || k.includes('link') || k === 'website' || k === 'homepage' || schema?.format === 'uri') return urlStr();
  if (k.includes('description') || k === 'bio' || k === 'summary' || k === 'about' || k === 'details') return sentence();
  if (k.includes('title') || k === 'headline' || k === 'subject') return sentence(randInt(3, 6));
  if (k.includes('text') || k.includes('content') || k.includes('message') || k.includes('comment') || k.includes('note')) return sentence();
  if (k.includes('createdat') || k.includes('updatedat') || k.includes('deletedat') || k.includes('timestamp') || k.includes('date') || schema?.format === 'date-time') return isoDate();
  if (k === 'status') return pick(['active', 'inactive', 'pending', 'completed']);
  if (k === 'role') return pick(['user', 'admin', 'moderator', 'editor']);
  if (k === 'type') return pick(['default', 'primary', 'secondary']);
  if (k === 'locale' || k === 'language' || k === 'lang') return pick(['en-US', 'en-GB', 'de-DE', 'fr-FR', 'ja-JP']);
  if (k === 'timezone' || k === 'tz') return pick(['UTC', 'America/New_York', 'Europe/Berlin', 'Asia/Tokyo']);
  if (k === 'currency') return pick(['USD', 'EUR', 'GBP', 'JPY']);
  if (k === 'version') return `${randInt(1, 5)}.${randInt(0, 9)}.${randInt(0, 99)}`;
  if (k === 'token' || k.includes('apikey') || k.includes('accesstoken') || k.includes('refreshtoken')) {
    return [...Array(32)].map(() => randInt(0, 15).toString(16)).join('');
  }

  return undefined;
}

export function generateTestData(schema: any): any {
  if (!schema) return null;

  if (schema.const !== undefined) return schema.const;
  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;
  if (schema.enum?.length) return pick(schema.enum);

  if (schema.oneOf || schema.anyOf) {
    const variants: any[] = schema.oneOf ?? schema.anyOf;
    return generateTestData(variants[randInt(0, variants.length - 1)]);
  }

  if (schema.allOf) {
    const merged: any = { type: 'object', properties: {} };
    for (const sub of schema.allOf) {
      if (sub.properties) Object.assign(merged.properties, sub.properties);
      if (sub.type) merged.type = sub.type;
    }
    return generateTestData(merged);
  }

  if (schema.type === 'object' || schema.properties) {
    const obj: any = {};
    for (const [key, prop] of Object.entries(schema.properties ?? {})) {
      if ((prop as any).const !== undefined) {
        obj[key] = (prop as any).const;
      } else {
        const h = heuristic(key, prop);
        obj[key] = h !== undefined ? h : generateTestData(prop as any);
      }
    }
    return obj;
  }

  if (schema.type === 'array') {
    const itemSchema = schema.items ?? {};
    return Array.from({ length: randInt(2, 3) }, () => generateTestData(itemSchema));
  }

  if (schema.type === 'string') {
    if (schema.format === 'uuid') return uuid();
    if (schema.format === 'email') return emailAddr();
    if (schema.format === 'date-time') return isoDate();
    if (schema.format === 'date') return isoDate().slice(0, 10);
    if (schema.format === 'uri' || schema.format === 'url') return urlStr();
    if (schema.format === 'hostname') return pick(DOMAINS);
    if (schema.format === 'ipv4') return `${randInt(1, 254)}.${randInt(0, 254)}.${randInt(0, 254)}.${randInt(1, 254)}`;
    return pick(LOREM);
  }

  if (schema.type === 'integer' || schema.type === 'number') {
    const min = schema.minimum ?? 1;
    const max = schema.maximum ?? 9999;
    const val = randInt(min, max);
    return schema.type === 'integer' ? val : Math.round(val * 100) / 100;
  }

  if (schema.type === 'boolean') return Math.random() > 0.5;

  return null;
}
