import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { WebView, type WebView as WebViewInstance, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { getPublicSettings } from '@/src/services/auth';
import { sessionState } from '@/src/auth/session';
import { theme } from '@/src/theme';
import { parseTurnstilePageMessage, TURNSTILE_PAGE_CAPTURE_SCRIPT, TURNSTILE_PAGE_FOCUS_SCRIPT } from '@/src/lib/turnstile';

const ALLOWED_ACTIONS = new Set(['login', 'register', 'forgot_password']);

export function TurnstileGate({ action, resetKey, onToken }: { action: 'login' | 'register' | 'forgot_password'; resetKey?: number; onToken: (token: string) => void }) {
  const [siteKey, setSiteKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const origin = sessionState.baseUrl;
  const webViewRef = useRef<WebViewInstance>(null);
  const unavailableTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void getPublicSettings().then((settings) => {
      if (!active) return;
      if (settings.turnstile_enabled && settings.turnstile_site_key) setSiteKey(settings.turnstile_site_key);
      else setSiteKey('');
    }).catch(() => { if (active) setError('无法读取安全验证设置'); }).finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      if (unavailableTimer.current) clearTimeout(unavailableTimer.current);
      unavailableTimer.current = null;
    };
  }, [resetKey]);

  if (Platform.OS === 'web' || !ALLOWED_ACTIONS.has(action)) return null;
  if (loading) return <View style={{ minHeight: 72, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.primary} /></View>;
  if (error) return <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{error}</Text>;
  if (!siteKey) return null;

  // The official web client owns the Turnstile widget. Loading its auth page
  // keeps the challenge on the first-party hostname and avoids depending on a
  // private backend bridge that is absent from official releases.
  const pagePath = action === 'register' ? '/register' : action === 'forgot_password' ? '/forgot-password' : '/login';
  const pageUrl = `${origin}${pagePath}`;
  function onMessage(event: WebViewMessageEvent) {
    try {
      if (new URL(event.nativeEvent.url).origin !== origin) {
        setError('安全验证消息来源无效，请重试。');
        return;
      }
    } catch {
      setError('安全验证消息来源无效，请重试。');
      return;
    }
    const message = parseTurnstilePageMessage(event.nativeEvent.data, origin);
    if (!message) return;
    if (message.kind === 'unavailable') {
      if (unavailableTimer.current) clearTimeout(unavailableTimer.current);
      unavailableTimer.current = null;
      setError('官方安全验证组件未加载，请稍后重试。');
      return;
    }
    if (unavailableTimer.current) clearTimeout(unavailableTimer.current);
    unavailableTimer.current = null;
    onToken(message.token);
  }
  function allowNavigation(request: WebViewNavigation) {
    try {
      const url = new URL(request.url);
      if (url.protocol === 'about:' && url.href === 'about:blank') return true;
      return url.origin === origin || url.origin === 'https://challenges.cloudflare.com';
    } catch { return false; }
  }

  function onLoadEnd() {
    webViewRef.current?.injectJavaScript(TURNSTILE_PAGE_FOCUS_SCRIPT);
    if (unavailableTimer.current) clearTimeout(unavailableTimer.current);
    // A provider page can load successfully while its Turnstile script is
    // blocked by network policy. Fail closed after a bounded wait instead of
    // leaving the login form with a challenge that can never produce a token.
    unavailableTimer.current = setTimeout(() => {
      unavailableTimer.current = null;
      setError('官方安全验证组件未加载，请检查网络后重试。');
    }, 45_000);
  }
  return <View style={{ marginTop: 14, overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: theme.border, minHeight: 110 }}><WebView key={`${action}-${resetKey ?? 0}`} ref={webViewRef} source={{ uri: pageUrl }} originWhitelist={[origin, 'https://challenges.cloudflare.com', 'about:blank']} javaScriptEnabled domStorageEnabled injectedJavaScriptBeforeContentLoaded={TURNSTILE_PAGE_CAPTURE_SCRIPT} injectedJavaScript={TURNSTILE_PAGE_FOCUS_SCRIPT} onLoadEnd={onLoadEnd} onMessage={onMessage} onShouldStartLoadWithRequest={allowNavigation} onError={() => setError('安全验证页面加载失败，请检查网络')} onHttpError={() => setError('安全验证页面返回了无效内容，请联系管理员。')} accessibilityLabel="turnstile-webview" /></View>;
}
