import { record } from './tour-types';

export function sourceUrl(value: string): string {
  const url = new URL(value);
  url.username = ''; url.password = ''; url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(servicekey|api[_-]?key|authorization|access[_-]?token|token)$/i.test(key)) url.searchParams.delete(key);
  }
  return url.href;
}
export function sanitize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sanitize);
  if (record(value)) return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !/^(servicekey|api[_-]?key|authorization|access[_-]?token|token)$/i.test(key))
    .map(([key, item]) => [key, sanitize(item)]));
  return value;
}
