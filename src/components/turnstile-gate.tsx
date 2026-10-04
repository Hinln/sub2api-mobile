import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { WebView, type WebView as WebViewInstance, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { getPublicSettings } from '@/src/services/auth';
import { sessionState } from '@/src/auth/session';
import { theme } from '@/src/theme';
import {
  buildTurnstilePageUrl,
  createTurnstileBridgeContext,
  parseTurnstilePageMessage,
  TURNSTILE_LOCAL_REFRESH_MS,
  type TurnstileAction,
  type TurnstileStatus,
} from '@/src/lib/turnstile';
import { recordTurnstileDiagnostic } from '@/src/lib/turnstile-diagnostics';

const ALLOWED_ACTIONS = new Set<TurnstileAction>(['login', 'register', 'forgot_password']);

type GateProps = {
  action: TurnstileAction;
  resetKey?: number;
  /** The native submit action reveals the dedicated challenge surface. */
  consentRequestKey?: number;
  onToken: (token: string) => void;
  onStatus?: (status: TurnstileStatus) => void;
};

type ShouldStartLoadRequest = WebViewNavigation & { isTopFrame?: boolean };

export function TurnstileGate({ action, resetKey = 0, consentRequestKey = 0, onToken, onStatus }: GateProps) {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [widgetReady, setWidgetReady] = useState(false);
  const [interactive, setInteractive] = useState(false);
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
  const pageUrl = useMemo(() => buildTurnstilePageUrl(context), [context]);
  const startedAtRef = useRef(Date.now());

  useEffect(() => { onStatusRef.current = onStatus; }, [onStatus]);
  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);
  useEffect(() => { setChallengeRequested(consentRequestKey > 0); }, [consentRequestKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setEnabled(null);
    setError('');
    setWidgetReady(false);
    widgetReadyRef.current = false;
    setInteractive(false);
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
      if (new URL(event.nativeEvent.url).origin !== context.origin) return;
    } catch {
      return;
    }
    const message = parseTurnstilePageMessage(event.nativeEvent.data, context);
    if (!message || consumedRef.current && message.kind === 'token') return;
    if (message.kind === 'ready') {
      widgetReadyRef.current = true;
      setWidgetReady(true);
      setInteractive(false);
      setError('');
      recordTurnstileDiagnostic({ phase: 'widget-ready', action, requestId: context.requestId, status: 'ready', durationMs: Date.now() - startedAtRef.current });
      onStatusRef.current?.('ready');
      return;
    }
    if (message.kind === 'before-interactive') {
      setInteractive(false);
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
      setEnabled(false);
      recordTurnstileDiagnostic({ phase: 'config-read', action, requestId: context.requestId, status: 'disabled' });
      onStatusRef.current?.('disabled');
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = null;
    widgetReadyRef.current = false;
    setWidgetReady(false);
    setInteractive(false);
    consumedRef.current = false;
    onTokenRef.current('');
    setError(message.kind === 'unsupported'
      ? '当前设备不支持安全验证，请更新系统后重试。'
      : `安全验证加载失败（${message.errorCode}），请重试。`);
    recordTurnstileDiagnostic({ phase: message.kind === 'unsupported' ? 'error' : 'sdk-load', action, requestId: context.requestId, status: message.kind, errorCode: message.kind === 'unsupported' ? message.errorCode : message.errorCode });
    onStatusRef.current?.('error');
  }

  function allowNavigation(request: ShouldStartLoadRequest) {
    try {
      const url = new URL(request.url);
      if (url.protocol === 'about:' && (url.href === 'about:blank' || url.href === 'about:srcdoc')) return true;
      if (url.origin === context.origin) return url.pathname === '/mobile/turnstile';
      // Cloudflare is allowed for iframe/subresource navigation only. A
      // challenge origin must never replace the trusted top-level document.
      return url.origin === 'https://challenges.cloudflare.com' && request.isTopFrame === false;
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
  if (loading) return <View style={{ minHeight: 72, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.primary} /></View>;
  if (enabled === false) return <Text style={{ color: theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 12 }}>当前未启用安全验证。</Text>;
  if (enabled !== true) return <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{error || '安全验证暂不可用，请稍后重试。'}</Text>;

  return <View style={{ marginTop: 14 }}>
    <View style={{ minHeight: 58, borderRadius: 14, borderWidth: 1, borderColor: error ? theme.danger : theme.border, backgroundColor: theme.cardRaised, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {!widgetReady && !error ? <ActivityIndicator color={theme.primary} /> : null}
      <Text style={{ flex: 1, color: error ? theme.danger : theme.subtext, fontSize: 12, lineHeight: 18 }}>
        {error || (widgetReady ? (interactive ? '请完成下方安全验证' : '安全验证已就绪') : '正在加载安全验证…')}
      </Text>
    </View>
    {challengeRequested ? <View style={{ marginTop: 10, height: 110, overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: '#fff' }}>
      <WebView
        key={`${action}-${resetKey}`}
        ref={webViewRef}
        style={{ height: 110 }}
        source={{ uri: pageUrl }}
        originWhitelist={[context.origin, 'https://challenges.cloudflare.com', 'about:blank', 'about:srcdoc']}
        javaScriptEnabled
        domStorageEnabled
        thirdPartyCookiesEnabled
        sharedCookiesEnabled
        onLoadEnd={scheduleTimeout}
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
