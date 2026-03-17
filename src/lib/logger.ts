/**
 * Logger centralisé SiteWise.
 * - Désactive debug/info en production (évite fuite d'infos dans les logs Vercel publics)
 * - Ajoute un tag de contexte structuré [LEVEL][context]
 * - Extrait le message réel des erreurs Drizzle (err.cause)
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const IS_PROD = process.env.NODE_ENV === 'production';

function formatError(err: unknown): string {
  if (err instanceof Error) {
    const cause = (err as Error & { cause?: { message?: string } }).cause;
    return cause?.message ? `${err.message} (cause: ${cause.message})` : err.message;
  }
  return String(err);
}

function log(level: LogLevel, context: string, message: string, meta?: unknown): void {
  if (IS_PROD && (level === 'debug' || level === 'info')) return;

  const prefix = `[${level.toUpperCase()}][${context}]`;
  const args = meta !== undefined ? [prefix, message, meta] : [prefix, message];

  if (level === 'error') {
    // eslint-disable-next-line no-console
    console.error(...args);
  } else if (level === 'warn') {
    // eslint-disable-next-line no-console
    console.warn(...args);
  } else {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export const logger = {
  debug: (context: string, message: string, meta?: unknown) =>
    log('debug', context, message, meta),
  info: (context: string, message: string, meta?: unknown) =>
    log('info', context, message, meta),
  warn: (context: string, message: string, meta?: unknown) =>
    log('warn', context, message, meta),
  error: (context: string, err: unknown, meta?: unknown) =>
    log('error', context, formatError(err), meta),
};
