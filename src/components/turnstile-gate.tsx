import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { WebView, type WebView as WebViewInstance, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { getPublicSettings } from '@/src/services/auth';
import { sessionState } from '@/src/auth/session';
import { theme } from '@/src/theme';
import {
  buildTurnstileInlinePageHtml,
  buildTurnstileInlinePageScript,
  buildTurnstileWebViewKey,
  createTurnstileBridgeContext,
  parseTurnstilePageMessage,
  TURNSTILE_LOCAL_REFRESH_MS,
  TURNSTILE_PAGE_PATH,
  TURNSTILE_PAGE_VERSION,
  shouldRenderTurnstileTransport,
  type TurnstileAction,
  type TurnstilePresentation,
  type TurnstileStatus,
} from '@/src/lib/turnstile';
import { recordTurnstileDiagnostic } from '@/src/lib/turnstile-diagnostics';

const ALLOWED_ACTIONS = new Set<TurnstileAction>(['login', 'register', 'forgot_password']);

type GateProps = {
  action: TurnstileAction;
  resetKey?: number;
  /** The native submit action reveals the dedicated challenge surface. */
  consentRequestKey?: number;
  /**
   * Keep the challenge transport out of the auth form. The dedicated page is
   * still mounted after submit and its real token is still required by the
   * server; this only controls the native presentation. Interactive provider
   * challenges cannot be completed while silent, so callers should retain the
   * inline mode for flows where a human challenge must be shown.
   */
  mode?: TurnstilePresentation;
  onToken: (token: string) => void;
  onStatus?: (status: TurnstileStatus) => void;
};

type ShouldStartLoadRequest = WebViewNavigation & { isTopFrame?: boolean };

export function TurnstileGate({ action, resetKey = 0, consentRequestKey = 0, mode = 'inline', onToken, onStatus }: GateProps) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [siteKey, setSiteKey] = useState('');
  const [error, setError] = useState('');
  const [widgetReady, setWidgetReady] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [requiresInteraction, setRequiresInteraction] = useState(false);
  const [challengeRequested, setChallengeRequested] = useState(consentRequestKey > 0);
  const onStatusRef = useRef(onStatus);
  const onTokenRef = useRef(onToken);
  const webViewRef = useRef<WebViewInstance>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tokenExpiryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consumedRef = useRef(false);
  const widgetReadyRef = useRef(false);
  const [instanceKey, setInstanceKey] = useState(0);
  const context = useMemo(() => createTurnstileBridgeContext(sessionState.baseUrl, action, resetKey + instanceKey), [action, instanceKey, resetKey]);
  const startedAtRef = useRef(Date.now());

  useEffect(() => { onStatusRef.current = onStatus; }, [onStatus]);
  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);
  useEffect(() => { setChallengeRequested(consentRequestKey > 0); }, [consentRequestKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setEnabled(null);
    setSiteKey('');
    setError('');
    setWidgetReady(false);
    widgetReadyRef.current = false;
    setInteractive(false);
    setRequiresInteraction(false);
    consumedRef.current = false;
    onTokenRef.current('');
    startedAtRef.current = Date.now();
    recordTurnstileDiagnostic({ phase: 'config-read', action, requestId: context.requestId, status: 'started' });
    onStatusRef.current?.('loading');
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (tokenExpiryRef.current) clearTimeout(tokenExpiryRef.current);
    tokenExpiryRef.current = null;

    void getPublicSettings().then((settings) => {
      if (!active) return;
      if (settings.turnstile_enabled === false) {
        if (settings.aliyun_captcha_enabled === true || settings.tencent_captcha_enabled === true) {
          setError('当前启用的安全验证供应商不受 APP 支持，请联系管理员。');
          recordTurnstileDiagnostic({ phase: 'config-read', action, requestId: context.requestId, status: 'unsupported-provider' });
          onStatusRef.current?.('error');
        } else {
          setEnabled(false);
          recordTurnstileDiagnostic({ phase: 'config-read', action, requestId: context.requestId, status: 'disabled', durationMs: Date.now() - startedAtRef.current });
          onStatusRef.current?.('disabled');
        }
        return;
      }
      if (settings.turnstile_enabled === true && typeof settings.turnstile_site_key === 'string' && settings.turnstile_site_key.trim()) {
        setSiteKey(settings.turnstile_site_key.trim());
        setEnabled(true);
        recordTurnstileDiagnostic({ phase: 'config-read', action, requestId: context.requestId, status: 'enabled', durationMs: Date.now() - startedAtRef.current });
        onStatusRef.current?.('waiting');
        return;
      }
      setEnabled(null);
      setError('安全验证配置异常，请联系管理员。');
      recordTurnstileDiagnostic({ phase: 'config-read', action, requestId: context.requestId, status: 'invalid', errorCode: 'config_invalid', durationMs: Date.now() - startedAtRef.current });
      onStatusRef.current?.('error');
    }).catch(() => {
      if (!active) return;
      setEnabled(null);
      setError('无法读取安全验证设置，请检查网络后重试。');
      recordTurnstileDiagnostic({ phase: 'config-read', action, requestId: context.requestId, status: 'failed', errorCode: 'settings_request_failed', durationMs: Date.now() - startedAtRef.current });
      onStatusRef.current?.('error');
    }).finally(() => { if (active) setLoading(false); });

    return () => {
      active = false;
      widgetReadyRef.current = false;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      if (tokenExpiryRef.current) clearTimeout(tokenExpiryRef.current);
      tokenExpiryRef.current = null;
    };
  }, [action, context.requestId, resetKey]);

  function scheduleTimeout() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      if (!widgetReadyRef.current && !consumedRef.current) {
        setError('官方安全验证组件未加载，请检查网络后重试。');
        recordTurnstileDiagnostic({ phase: 'error', action, requestId: context.requestId, status: 'timeout', errorCode: 'page_load_timeout', durationMs: Date.now() - startedAtRef.current });
        onStatusRef.current?.('error');
      }
    }, 30_000);
  }

  function onMessage(event: WebViewMessageEvent) {
    // onMessage.url is the main document URL on supported RN WebView versions.
    // It is still checked in addition to the payload tuple; the payload cannot
    // authenticate an arbitrary page by claiming an origin.
    try {
      const rawUrl = event.nativeEvent.url?.trim() ?? '';
      // WKWebView reports an empty/about:blank frame URL for some
      // loadHTMLString documents even when baseURL is an HTTPS origin. The
      // navigation policy below prevents a foreign top-level document; the
      // request tuple is still checked by parseTurnstilePageMessage.
      if (rawUrl && rawUrl !== 'about:blank' && rawUrl !== 'about:srcdoc') {
        const messageUrl = new URL(rawUrl);
        if (messageUrl.origin !== context.origin || messageUrl.pathname !== '/mobile/turnstile') {
          recordTurnstileDiagnostic({ phase: 'bridge', action, requestId: context.requestId, status: 'rejected-source-origin-or-path' });
          return;
        }
      }
    } catch {
      recordTurnstileDiagnostic({ phase: 'bridge', action, requestId: context.requestId, status: 'rejected-source-url' });
      return;
    }
    const message = parseTurnstilePageMessage(event.nativeEvent.data, context);
    if (!message) {
      recordTurnstileDiagnostic({ phase: 'bridge', action, requestId: context.requestId, status: 'rejected-context-or-version' });
      return;
    }
    if (consumedRef.current && message.kind === 'token') {
      recordTurnstileDiagnostic({ phase: 'bridge', action, requestId: context.requestId, status: 'stale-token-rejected' });
      return;
    }
    if (message.kind === 'ready') {
      widgetReadyRef.current = true;
      setWidgetReady(true);
      setInteractive(false);
      setError('');
      recordTurnstileDiagnostic({ phase: 'widget-ready', action, requestId: context.requestId, status: 'ready', pageVersion: TURNSTILE_PAGE_VERSION, durationMs: Date.now() - startedAtRef.current });
      onStatusRef.current?.('ready');
      return;
    }
    if (message.kind === 'before-interactive') {
      // Managed Turnstile is invisible for the normal risk-passed path. If
      // Cloudflare explicitly asks for a human challenge, reveal the real
      // widget so it remains solvable instead of silently hanging.
      setRequiresInteraction(true);
      setInteractive(true);
      recordTurnstileDiagnostic({ phase: 'interaction', action, requestId: context.requestId, status: 'before-interactive' });
      onStatusRef.current?.('waiting');
      return;
    }
    if (message.kind === 'after-interactive') {
      setInteractive(true);
      recordTurnstileDiagnostic({ phase: 'interaction', action, requestId: context.requestId, status: 'after-interactive' });
      onStatusRef.current?.('ready');
      return;
    }
    if (message.kind === 'token') {
      consumedRef.current = true;
      widgetReadyRef.current = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      setWidgetReady(true);
      setInteractive(true);
      setRequiresInteraction(false);
      setError('');
      if (tokenExpiryRef.current) clearTimeout(tokenExpiryRef.current);
      tokenExpiryRef.current = setTimeout(() => {
        tokenExpiryRef.current = null;
        if (!consumedRef.current) return;
        consumedRef.current = false;
        onTokenRef.current('');
        setInteractive(false);
        setWidgetReady(false);
        setError('安全验证已接近有效期，请重新完成验证。');
        recordTurnstileDiagnostic({ phase: 'token', action, requestId: context.requestId, status: 'local-expired', errorCode: 'token_refresh_required', durationMs: TURNSTILE_LOCAL_REFRESH_MS });
        onStatusRef.current?.('ready');
        setInstanceKey((value) => value + 1);
      }, TURNSTILE_LOCAL_REFRESH_MS);
      recordTurnstileDiagnostic({ phase: 'token', action, requestId: context.requestId, status: 'received' });
      onStatusRef.current?.('token');
      onTokenRef.current(message.token);
      return;
    }
    if (message.kind === 'expired') {
      consumedRef.current = false;
      onTokenRef.current('');
      // An expired token cannot be submitted. Hide a previously revealed
      // managed challenge until the next explicit submit mounts a fresh
      // instance; this also prevents an old instance from covering the form.
      setRequiresInteraction(false);
      setInteractive(false);
      setError('安全验证已过期，请重新完成验证。');
      if (tokenExpiryRef.current) clearTimeout(tokenExpiryRef.current);
      tokenExpiryRef.current = null;
      recordTurnstileDiagnostic({ phase: 'token', action, requestId: context.requestId, status: 'expired', errorCode: 'provider_expired' });
      onStatusRef.current?.('ready');
      return;
    }
    if (message.kind === 'disabled') {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
      widgetReadyRef.current = false;
      setRequiresInteraction(false);
      setInteractive(false);
      setEnabled(false);
      recordTurnstileDiagnostic({ phase: 'config-read', action, requestId: context.requestId, status: 'disabled' });
      onStatusRef.current?.('disabled');
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    // A provider error callback is a different failure from a page/SDK load
    // failure. Preserve the rendered widget state so the native surface does
    // not claim that the component never loaded when Cloudflare already did.
    const providerHadWidget = widgetReadyRef.current;
    widgetReadyRef.current = providerHadWidget;
    setWidgetReady(providerHadWidget);
    setRequiresInteraction(false);
    setInteractive(false);
    consumedRef.current = false;
    onTokenRef.current('');
    setError(message.kind === 'unsupported'
      ? '当前设备不支持安全验证，请更新系统后重试。'
      : providerHadWidget
        ? `安全验证返回错误（${message.errorCode}），请重新完成验证。`
        : `安全验证加载失败（${message.errorCode}），请重试。`);
    recordTurnstileDiagnostic({ phase: message.kind === 'unsupported' ? 'error' : 'error', action, requestId: context.requestId, status: providerHadWidget ? 'provider-error' : message.kind, errorCode: message.kind === 'unsupported' ? message.errorCode : message.errorCode });
    onStatusRef.current?.('error');
  }

  function allowNavigation(request: ShouldStartLoadRequest) {
    try {
      const url = new URL(request.url);
      if (url.protocol === 'about:' && (url.href === 'about:blank' || url.href === 'about:srcdoc')) return true;
      if (url.origin === context.origin) return url.pathname === '/mobile/turnstile';
      // Cloudflare is allowed for iframe/subresource navigation only. A
      // challenge origin must never replace the trusted top-level document.
      // react-native-webview 13.15.0 exposes isTopFrame on iOS, while
      // Android may omit it for subframe requests. Unknown is safe here only
      // for the explicitly allowed Cloudflare origin; a true top-frame value
      // is always rejected so the trusted page cannot be replaced.
      return url.origin === 'https://challenges.cloudflare.com' && request.isTopFrame !== true;
    } catch {
      return false;
    }
  }

  function isMainDocumentUrl(value: string | undefined) {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.origin === context.origin && url.pathname === '/mobile/turnstile';
    } catch {
      return true;
    }
  }

  if (Platform.OS === 'web' || !ALLOWED_ACTIONS.has(action)) return null;
  const silent = mode === 'silent';
  if (loading) return silent ? null : <View style={{ minHeight: 72, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.primary} /></View>;
  if (silent) {
    // No status card is rendered in the auth flow. Keeping this transport
    // mounted only after an explicit submit avoids a persistent verification
    // box while preserving the same-origin WebView and bridge checks.
    if (!shouldRenderTurnstileTransport(mode, enabled, challengeRequested)) return null;
    // Keep a normal widget viewport so the provider can render its managed
    // challenge. It stays in the native tree (to avoid clipped/offscreen
    // WebView optimizations), but remains transparent and non-interactive
    // until Cloudflare explicitly requests a human challenge. At that point
    // requiresInteraction reveals this same widget so the user can complete
    // it. The token still must come from the official callback and server
    // Siteverify.
    return <View pointerEvents={requiresInteraction ? 'auto' : 'none'} style={{ position: 'absolute', left: 0, top: 0, width: 320, height: 180, opacity: requiresInteraction ? 1 : 0, zIndex: requiresInteraction ? 20 : 0 }}>
      <WebView
        key={buildTurnstileWebViewKey(action, resetKey, instanceKey)}
        ref={webViewRef}
        style={{ width: 320, height: 180 }}
        source={{ html: buildTurnstileInlinePageHtml(context, siteKey), baseUrl: `${context.origin}${TURNSTILE_PAGE_PATH}` }}
        injectedJavaScript={buildTurnstileInlinePageScript(context, siteKey)}
        originWhitelist={[context.origin, 'https://challenges.cloudflare.com', 'about:blank', 'about:srcdoc']}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        onLoadStart={() => {
          recordTurnstileDiagnostic({ phase: 'page-load', action, requestId: context.requestId, status: 'started' });
        }}
        onLoadEnd={() => {
          recordTurnstileDiagnostic({ phase: 'page-load', action, requestId: context.requestId, status: 'loaded', pageVersion: TURNSTILE_PAGE_VERSION, durationMs: Date.now() - startedAtRef.current });
          scheduleTimeout();
        }}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={allowNavigation}
        onError={(event) => {
          if (!isMainDocumentUrl(event.nativeEvent.url)) return;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
          widgetReadyRef.current = false;
          consumedRef.current = false;
          setWidgetReady(false);
          setRequiresInteraction(false);
          setInteractive(false);
          onTokenRef.current('');
          setError('安全验证页面加载失败，请检查网络后重试。');
          recordTurnstileDiagnostic({ phase: 'page-load', action, requestId: context.requestId, status: 'failed', errorCode: 'webview_error' });
          onStatusRef.current?.('error');
        }}
        onHttpError={(event) => {
          if (!isMainDocumentUrl(event.nativeEvent.url)) return;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
          widgetReadyRef.current = false;
          consumedRef.current = false;
          setWidgetReady(false);
          setRequiresInteraction(false);
          setInteractive(false);
          onTokenRef.current('');
          setError(`安全验证页面返回异常（${event.nativeEvent.statusCode}）。`);
          recordTurnstileDiagnostic({ phase: 'page-load', action, requestId: context.requestId, status: 'http-error', httpStatus: event.nativeEvent.statusCode });
          onStatusRef.current?.('error');
        }}
        accessibilityLabel="turnstile-webview"
      />
    </View>;
  }
  if (enabled === false) return <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 12 }}>当前未启用安全验证。</Text>;
  if (enabled !== true) return <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{error || '安全验证暂不可用，请稍后重试。'}</Text>;

  return <View style={{ marginTop: 14 }}>
    <View style={{ minHeight: 58, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border, backgroundColor: theme.cardRaised, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {!widgetReady && !error ? <ActivityIndicator color={theme.primary} /> : null}
      <Text style={{ flex: 1, color: error ? theme.danger : theme.subtext, fontSize: 12, lineHeight: 18 }}>
        {error || (widgetReady
          ? (interactive ? '请完成下方安全验证' : '安全验证已就绪')
          : challengeRequested ? '正在加载安全验证…' : '提交时加载安全验证')}
      </Text>
    </View>
    {challengeRequested ? <View style={{ marginTop: 10, height: 110, overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: '#fff' }}>
      <WebView
        // Include instanceKey so local token expiry creates a fresh document.
        key={buildTurnstileWebViewKey(action, resetKey, instanceKey)}
        ref={webViewRef}
        style={{ height: 110 }}
        source={{ html: buildTurnstileInlinePageHtml(context, siteKey), baseUrl: `${context.origin}${TURNSTILE_PAGE_PATH}` }}
        injectedJavaScript={buildTurnstileInlinePageScript(context, siteKey)}
        originWhitelist={[context.origin, 'https://challenges.cloudflare.com', 'about:blank', 'about:srcdoc']}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        onLoadStart={() => {
          recordTurnstileDiagnostic({ phase: 'page-load', action, requestId: context.requestId, status: 'started' });
        }}
        onLoadEnd={() => {
          recordTurnstileDiagnostic({ phase: 'page-load', action, requestId: context.requestId, status: 'loaded', pageVersion: TURNSTILE_PAGE_VERSION, durationMs: Date.now() - startedAtRef.current });
          scheduleTimeout();
        }}
        onMessage={onMessage}
        onShouldStartLoadWithRequest={allowNavigation}
        onError={(event) => {
          if (!isMainDocumentUrl(event.nativeEvent.url)) return;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
          widgetReadyRef.current = false;
          consumedRef.current = false;
          setWidgetReady(false);
          setInteractive(false);
          onTokenRef.current('');
          setError('安全验证页面加载失败，请检查网络后重试。');
          recordTurnstileDiagnostic({ phase: 'page-load', action, requestId: context.requestId, status: 'failed', errorCode: 'webview_error' });
          onStatusRef.current?.('error');
        }}
        onHttpError={(event) => {
          if (!isMainDocumentUrl(event.nativeEvent.url)) return;
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
          widgetReadyRef.current = false;
          consumedRef.current = false;
          setWidgetReady(false);
          setInteractive(false);
          onTokenRef.current('');
          setError(`安全验证页面返回异常（${event.nativeEvent.statusCode}）。`);
          recordTurnstileDiagnostic({ phase: 'page-load', action, requestId: context.requestId, status: 'http-error', httpStatus: event.nativeEvent.statusCode });
          onStatusRef.current?.('error');
        }}
        accessibilityLabel="turnstile-webview"
      />
    </View> : null}
  </View>;
}
