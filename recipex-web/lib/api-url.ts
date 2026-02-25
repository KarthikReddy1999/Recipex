function ensurePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

const clientBase = trimTrailingSlash(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');
const serverBase = trimTrailingSlash(
  process.env.RECIPEX_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
);

export function buildClientApiUrl(path: string): string {
  return `${clientBase}${ensurePath(path)}`;
}

export function buildServerApiUrl(path: string): string {
  return `${serverBase}${ensurePath(path)}`;
}
