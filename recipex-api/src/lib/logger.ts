type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

const SERVICE = 'recipex-api';

function serializeError(value: unknown): unknown {
  if (!(value instanceof Error)) return value;
  return {
    name: value.name,
    message: value.message,
    stack: value.stack
  };
}

function sanitize(meta?: LogMeta): LogMeta | undefined {
  if (!meta) return undefined;
  return Object.fromEntries(
    Object.entries(meta).map(([key, value]) => [key, key.toLowerCase().includes('error') ? serializeError(value) : value])
  );
}

function write(level: LogLevel, event: string, meta?: LogMeta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    service: SERVICE,
    event,
    ...(meta ? { meta: sanitize(meta) } : {})
  };
  const line = JSON.stringify(entry);

  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
}

export function logInfo(event: string, meta?: LogMeta) {
  write('info', event, meta);
}

export function logWarn(event: string, meta?: LogMeta) {
  write('warn', event, meta);
}

export function logError(event: string, meta?: LogMeta) {
  write('error', event, meta);
}
