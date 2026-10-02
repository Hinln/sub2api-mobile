import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { getPublicSettings } from '@/src/services/auth';
import { sessionState } from '@/src/auth/session';
import { theme } from '@/src/theme';

const ALLOWED_ACTIONS = new Set(['login', 'register', 'forgot_password']);

function createNonce() {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') crypto.getRandomValues(bytes);
  else for (let i = 0; i < bytes.length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export function TurnstileGate({ action, resetKey, onToken }: { action: 'login' | 'register' | 'forgot_password'; resetKey?: number; onToken: (token: string, nonce: string) => void }) {
  const nonce = useMemo(createNonce, [resetKey]);
  const [siteKey, setSiteKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const origin = sessionState.baseUrl;

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
  if (!siteKey) return null;
  if (error) return <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{error}</Text>;

  const bridgeUrl = `${origin}/mobile/captcha/turnstile?nonce=${encodeURIComponent(nonce)}&action=${encodeURIComponent(action)}`;
  function onMessage(event: WebViewMessageEvent) {
    try {
      const value = JSON.parse(event.nativeEvent.data) as { type?: string; nonce?: string; action?: string; token?: string; origin?: string };
      const messageOrigin = typeof value.origin === 'string' ? value.origin : '';
      if (messageOrigin !== origin || value.type !== 'turnstile_token' || value.nonce !== nonce || value.action !== action || typeof value.token !== 'string' || value.token.length < 20) return;
      onToken(value.token, nonce);
    } catch { /* Ignore messages that are not the bridge contract. */ }
  }
  function allowNavigation(request: WebViewNavigation) {
    try {
      const url = new URL(request.url);
      return url.origin === origin || url.origin === 'https://challenges.cloudflare.com' || url.protocol === 'about:';
    } catch { return false; }
  }

  return <View style={{ marginTop: 14, overflow: 'hidden', borderRadius: 12, borderWidth: 1, borderColor: theme.border, minHeight: 110 }}><WebView source={{ uri: bridgeUrl }} originWhitelist={[origin, 'https://challenges.cloudflare.com', 'about:blank']} javaScriptEnabled domStorageEnabled onMessage={onMessage} onShouldStartLoadWithRequest={allowNavigation} onError={() => setError('安全验证页面加载失败，请检查网络')} accessibilityLabel="turnstile-webview" /></View>;
}
