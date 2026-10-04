/**
 * Shared contract for the first-party /mobile/turnstile page.
 *
 * The page is deliberately a small, same-origin Turnstile host. It never
 * receives credentials or session tokens. Bridge payloads are untrusted
 * until the native side verifies the page origin and current instance tuple.
 */

export const TURNSTILE_BRIDGE_VERSION = 1 as const;
export const TURNSTILE_PAGE_VERSION = 'bridge-v1' as const;
export const TURNSTILE_COMPONENT_ID = 'cloudflare-turnstile-explicit' as const;
export const TURNSTILE_PAGE_PATH = '/mobile/turnstile' as const;
export const TURNSTILE_TOKEN_MAX_LENGTH = 2048;
/** Refresh a token before the provider's documented five-minute lifetime. */
export const TURNSTILE_LOCAL_REFRESH_MS = 240_000;

export type TurnstileAction = 'login' | 'register' | 'forgot_password';
export type TurnstileBridgeType =
  | 'ready'
  | 'success'
  | 'error'
  | 'expired'
  | 'before-interactive'
  | 'after-interactive'
  | 'unsupported'
  | 'disabled';

export type TurnstileBridgeMessage = {
  version: typeof TURNSTILE_BRIDGE_VERSION;
  type: TurnstileBridgeType;
  requestId: string;
  nonce: string;
  action: TurnstileAction;
  token?: string;
  errorCode?: string;
};

export type ParsedTurnstileMessage =
  | { kind: 'ready' }
  | { kind: 'token'; token: string }
  | { kind: 'error'; errorCode: string }
  | { kind: 'expired' }
  | { kind: 'before-interactive' }
  | { kind: 'after-interactive' }
  | { kind: 'unsupported'; errorCode?: string }
  | { kind: 'disabled' }
  | null;

export type TurnstileStatus = 'loading' | 'disabled' | 'waiting' | 'ready' | 'token' | 'error';
export type TurnstilePresentation = 'inline' | 'silent';

export type TurnstileBridgeContext = {
  origin: string;
  requestId: string;
  nonce: string;
  action: TurnstileAction;
};

export function isUsableTurnstileToken(token: string | undefined | null): token is string {
  return typeof token === 'string'
    && token.length >= 20
    && token.length <= TURNSTILE_TOKEN_MAX_LENGTH
    && token.trim() === token;
}

export function canSubmitTurnstile(status: TurnstileStatus, token: string | undefined | null): boolean {
  if (status === 'disabled') return true;
  return status === 'token' && isUsableTurnstileToken(token);
}

/**
 * The native transport is created only after a user submits the form. Silent
 * mode changes presentation only; it never makes an enabled provider optional.
 */
export function shouldRenderTurnstileTransport(
  presentation: TurnstilePresentation,
  enabled: boolean | null,
  challengeRequested: boolean,
): boolean {
  return enabled === true && challengeRequested;
}

/**
 * The WebView key must include the local instance counter. A fragment-only URL
 * update is not guaranteed to remount the document on every WKWebView version.
 */
export function buildTurnstileWebViewKey(action: TurnstileAction, resetKey: number, instanceKey: number): string {
  return `${action}-${resetKey}-${instanceKey}`;
}

function isAction(value: unknown): value is TurnstileAction {
  return value === 'login' || value === 'register' || value === 'forgot_password';
}

function isBridgeType(value: unknown): value is TurnstileBridgeType {
  return value === 'ready'
    || value === 'success'
    || value === 'error'
    || value === 'expired'
    || value === 'before-interactive'
    || value === 'after-interactive'
    || value === 'unsupported'
    || value === 'disabled';
}

function isSafeIdentifier(value: unknown): value is string {
  return typeof value === 'string' && value.length >= 8 && value.length <= 128 && /^[A-Za-z0-9._~-]+$/.test(value);
}

/** Validate every field, including non-success messages, against this page instance. */
export function parseTurnstilePageMessage(raw: string, context: TurnstileBridgeContext): ParsedTurnstileMessage {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 8192) return null;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (value.version !== TURNSTILE_BRIDGE_VERSION
      || !isBridgeType(value.type)
      || !isSafeIdentifier(value.requestId)
      || !isSafeIdentifier(value.nonce)
      || !isAction(value.action)
      || value.requestId !== context.requestId
      || value.nonce !== context.nonce
      || value.action !== context.action) return null;

    if (value.type === 'success') {
      const token = typeof value.token === 'string' ? value.token : null;
      return isUsableTurnstileToken(token) ? { kind: 'token', token } : null;
    }
    if (value.type === 'error') {
      const errorCode = typeof value.errorCode === 'string' && value.errorCode.length <= 128 ? value.errorCode : 'unknown';
      return { kind: 'error', errorCode };
    }
    if (value.type === 'unsupported') {
      return { kind: 'unsupported', ...(typeof value.errorCode === 'string' && value.errorCode.length <= 128 ? { errorCode: value.errorCode } : {}) };
    }
    if (value.type === 'ready') return { kind: 'ready' };
    if (value.type === 'expired') return { kind: 'expired' };
    if (value.type === 'before-interactive') return { kind: 'before-interactive' };
    if (value.type === 'after-interactive') return { kind: 'after-interactive' };
    return { kind: 'disabled' };
  } catch {
    return null;
  }
}

export function createTurnstileBridgeContext(origin: string, action: TurnstileAction, resetKey: number): TurnstileBridgeContext {
  const random = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
  return { origin, action, requestId: `v1-${action}-${resetKey}-${random()}`, nonce: random() };
}

export function buildTurnstilePageUrl(context: TurnstileBridgeContext): string {
  const fragment = new URLSearchParams({
    version: String(TURNSTILE_BRIDGE_VERSION),
    requestId: context.requestId,
    nonce: context.nonce,
    action: context.action,
  });
  return `${context.origin}${TURNSTILE_PAGE_PATH}#${fragment.toString()}`;
}
