import { APP_VERSION } from '@/src/config/vexlune';
import type { TurnstileAction } from '@/src/lib/turnstile';

/**
 * A deliberately small, development-only diagnostic channel for the native
 * Turnstile flow. The payload is structured so a local console can correlate
 * one page instance without ever containing credentials, cookies or tokens.
 */
export type TurnstileDiagnosticPhase =
  | 'config-read'
  | 'page-load'
  | 'sdk-load'
  | 'widget-ready'
  | 'interaction'
  | 'token'
  | 'business-submit'
  | 'backend-reject'
  | 'edge-challenge'
  | 'error';

export type TurnstileDiagnostic = {
  phase: TurnstileDiagnosticPhase;
  action?: TurnstileAction;
  requestId?: string;
  status?: string;
  httpStatus?: number;
  errorCode?: string;
  durationMs?: number;
};

function diagnosticsEnabled() {
  const devFlag = (globalThis as { __DEV__?: boolean }).__DEV__;
  return devFlag !== false && process.env.NODE_ENV !== 'production';
}

function safeIdentifier(value: string | undefined) {
  if (!value) return undefined;
  return /^[A-Za-z0-9._~-]{8,128}$/.test(value) ? value : undefined;
}

function safeErrorCode(value: string | undefined) {
  if (!value) return undefined;
  return value.replace(/(?:token|secret|password|cookie|authorization)/gi, 'redacted')
    .replace(/[^A-Za-z0-9._:-]/g, '_').slice(0, 128) || undefined;
}

export function recordTurnstileDiagnostic(event: TurnstileDiagnostic) {
  if (!diagnosticsEnabled()) return;
  const platform = (globalThis as { navigator?: { product?: string } }).navigator?.product ?? 'native';
  const payload = {
    scope: 'turnstile',
    appVersion: APP_VERSION,
    platform,
    timestamp: new Date().toISOString(),
    phase: event.phase,
    ...(event.action ? { action: event.action } : {}),
    ...(safeIdentifier(event.requestId) ? { requestId: event.requestId } : {}),
    ...(event.status ? { status: event.status } : {}),
    ...(typeof event.httpStatus === 'number' ? { httpStatus: event.httpStatus } : {}),
    ...(safeErrorCode(event.errorCode) ? { errorCode: safeErrorCode(event.errorCode) } : {}),
    ...(typeof event.durationMs === 'number' ? { durationMs: Math.max(0, Math.round(event.durationMs)) } : {}),
  };
  console.info(`[turnstile] ${JSON.stringify(payload)}`);
}
