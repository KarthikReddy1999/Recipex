type LogLevel = 'info' | 'warn' | 'error';

type LogMeta = Record<string, unknown>;

function emit(level: LogLevel, event: string, meta?: LogMeta) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    app: 'recipex-web',
    event,
    ...(meta ? { meta } : {})
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

export function createRequestId(prefix = 'web'): string {
  const id = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()); //why we use cryto.randomUUID() instead of Date.now() is because it provides a more unique identifier, 
  // reducing the chances of collisions in high-concurrency environments.
  // Date.now() can produce the same value if multiple requests are made within the same millisecond,
  // while crypto.randomUUID() generates a universally unique identifier (UUID) that is designed to be unique across space and time.
  return `${prefix}-${id}`;
}

export const webLogger = {
  info(event: string, meta?: LogMeta) {
    emit('info', event, meta);
  },
  warn(event: string, meta?: LogMeta) {
    emit('warn', event, meta);
  },
  error(event: string, meta?: LogMeta) {
    emit('error', event, meta);
  }
};
