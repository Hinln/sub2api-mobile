import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { WebView, type WebView as WebViewInstance, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { getPublicSettings } from '@/src/services/auth';
import { sessionState } from '@/src/auth/session';
import { theme } from '@/src/theme';
import { createTurnstileNonce, parseTurnstileBridgeMessage, TURNSTILE_BRIDGE_PROBE_SCRIPT } from '@/src/lib/turnstile';

const ALLOWED_ACTIONS = new Set(['login', 'register', 'forgot_password']);

export function TurnstileGate({ action, resetKey, onToken }: { action: 'login' | 'register' | 'forgot_password'; resetKey?: number; onToken: (token: string, nonce: string) => void }) {
  const nonce = useMemo(createTurnstileNonce, [resetKey]);
  const [siteKey, setSiteKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const origin = sessionState.baseUrl;
  const webViewRef = useRef<WebViewInstance>(null);

  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    void getPublicSettings().then((settings) => {
      if (!active) return;
      if (settings.turnstile_enabled && settings.turnstile_site_key) setSiteKey(settings.turnstile_site_key);
      else setSiteKey('');
    }).catch(() => { if (active) setError('无法读取安全验证设置'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [resetKey]);

  if (Platform.OS === 'web' || !ALLOWED_ACTIONS.has(action)) return null;
  if (loading) return <View style={{ minHeight: 72, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.primary} /></View>;
  if (error) return <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{error}</Text>;
  if (!nonce) return <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 }}>当前设备无法生成安全验证随机数，请更新系统后重试。</Text>;
  if (!siteKey) return null;

  const bridgeUrl = `${origin}/mobile/captcha/turnstile?nonce=${encodeURIComponent(nonce)}&action=${encodeURIComponent(action)}`;
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
    const message = parseTurnstileBridgeMessage(event.nativeEvent.data, origin, nonce, action);
    if (!message) return;
    if (message.kind === 'bridge_error') {
      setError('安全验证页面返回了无效内容，请联系管理员。');
      return;
    }
    onToken(message.token, nonce);
  }
  function allowNavigation(request: WebViewNavigation) {
    try {
      const url = new URL(request.url);
      if (url.protocol === 'about:' && url.href === 'about:blank') return true;
      return url.origin === origin || url.origin === 'https://challenges.cloudflare.com' || url.protocol === 'about:';
    } catch { return false; }
  }

  return <View style={{ marginTop: 14, overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: theme.border, minHeight: 110 }}><WebView ref={webViewRef} source={{ uri: bridgeUrl }} originWhitelist={[origin, 'https://challenges.cloudflare.com', 'about:blank']} javaScriptEnabled domStorageEnabled injectedJavaScript={TURNSTILE_BRIDGE_PROBE_SCRIPT} onLoadEnd={() => webViewRef.current?.injectJavaScript(TURNSTILE_BRIDGE_PROBE_SCRIPT)} onMessage={onMessage} onShouldStartLoadWithRequest={allowNavigation} onError={() => setError('安全验证页面加载失败，请检查网络')} onHttpError={() => setError('安全验证页面返回了无效内容，请联系管理员。')} accessibilityLabel="turnstile-webview" /></View>;
}
