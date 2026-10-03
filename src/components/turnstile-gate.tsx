import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Text, View } from 'react-native';
import { WebView, type WebView as WebViewInstance, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import { getPublicSettings } from '@/src/services/auth';
import { sessionState } from '@/src/auth/session';
import { theme } from '@/src/theme';
import { parseTurnstilePageMessage, TURNSTILE_PAGE_ACCEPT_AGREEMENT_SCRIPT, TURNSTILE_PAGE_CAPTURE_SCRIPT, TURNSTILE_PAGE_FOCUS_SCRIPT } from '@/src/lib/turnstile';
import type { LoginAgreementDocument } from '@/src/types/auth';

const ALLOWED_ACTIONS = new Set(['login', 'register', 'forgot_password']);

export function TurnstileGate({ action, resetKey, consentRequestKey = 0, onToken }: { action: 'login' | 'register' | 'forgot_password'; resetKey?: number; consentRequestKey?: number; onToken: (token: string) => void }) {
  const [siteKey, setSiteKey] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [widgetVisible, setWidgetVisible] = useState(false);
  const [agreementRequired, setAgreementRequired] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementDocuments, setAgreementDocuments] = useState<LoginAgreementDocument[]>([]);
  const agreementAcceptedRef = useRef(false);
  const agreementRequiredRef = useRef(false);
  const widgetVisibleRef = useRef(false);
  const origin = sessionState.baseUrl;
  const webViewRef = useRef<WebViewInstance>(null);
  const unavailableTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setWidgetVisible(false);
    widgetVisibleRef.current = false;
    void getPublicSettings().then((settings) => {
      if (!active) return;
      const documents = settings.login_agreement_documents ?? [];
      const agreementEnabled = action !== 'forgot_password' && settings.login_agreement_enabled === true && documents.length > 0;
      // The native bottom notice is the primary consent surface. Show it as
      // soon as the official public settings confirm a current agreement;
      // the first-party WebView remains hidden until the user submits login
      // or registration, which is the consent action for this app.
      setAgreementDocuments(agreementEnabled ? documents : []);
      const accepted = agreementEnabled ? agreementAcceptedRef.current : true;
      agreementAcceptedRef.current = accepted;
      agreementRequiredRef.current = agreementEnabled && !accepted;
      setAgreementAccepted(accepted);
      setAgreementRequired(agreementRequiredRef.current);
      if (settings.turnstile_enabled && settings.turnstile_site_key) setSiteKey(settings.turnstile_site_key);
      else setSiteKey('');
    }).catch(() => { if (active) setError('无法读取安全验证设置'); }).finally(() => { if (active) setLoading(false); });
    return () => {
      active = false;
      if (unavailableTimer.current) clearTimeout(unavailableTimer.current);
      unavailableTimer.current = null;
    };
  }, [action, resetKey]);

  useEffect(() => {
    agreementAcceptedRef.current = agreementAccepted;
  }, [agreementAccepted]);

  useEffect(() => {
    agreementRequiredRef.current = agreementRequired;
  }, [agreementRequired]);

  useEffect(() => {
    widgetVisibleRef.current = widgetVisible;
  }, [widgetVisible]);

  // Login/register is the consent action. The native prompt stays passive;
  // this effect synchronizes the same consent into the first-party page only
  // after the parent form has validated and the user has pressed its button.
  useEffect(() => {
    if (consentRequestKey <= 0 || agreementDocuments.length === 0 || agreementAcceptedRef.current) return;
    agreementAcceptedRef.current = true;
    agreementRequiredRef.current = false;
    setAgreementAccepted(true);
    setAgreementRequired(false);
    setWidgetVisible(false);
    widgetVisibleRef.current = false;
    setError('');
    onToken('');
    webViewRef.current?.injectJavaScript(TURNSTILE_PAGE_ACCEPT_AGREEMENT_SCRIPT);
  }, [agreementDocuments.length, consentRequestKey, onToken]);

  if (Platform.OS === 'web' || !ALLOWED_ACTIONS.has(action)) return null;
  if (loading) return <View style={{ minHeight: 72, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color={theme.primary} /></View>;
  if (!siteKey) return <View><Text style={{ color: error ? theme.danger : theme.subtext, fontSize: 12, lineHeight: 18, marginTop: 12 }}>{error || '当前未启用安全验证。'}</Text></View>;

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
    if (message.kind === 'agreement-required') {
      if (unavailableTimer.current) clearTimeout(unavailableTimer.current);
      unavailableTimer.current = null;
      onToken('');
      setWidgetVisible(false);
      widgetVisibleRef.current = false;
      agreementRequiredRef.current = true;
      setAgreementRequired(true);
      return;
    }
    if (message.kind === 'agreement-accepted') {
      agreementAcceptedRef.current = true;
      agreementRequiredRef.current = false;
      setAgreementAccepted(true);
      setAgreementRequired(false);
      setError('');
      return;
    }
    if (message.kind === 'agreement-accept-failed') {
      agreementAcceptedRef.current = false;
      agreementRequiredRef.current = true;
      setAgreementAccepted(false);
      setAgreementRequired(true);
      setError('服务条款未能同步，请重试登录或注册。');
      return;
    }
    if (message.kind === 'widget-ready') {
      widgetVisibleRef.current = true;
      setWidgetVisible(true);
      webViewRef.current?.injectJavaScript(TURNSTILE_PAGE_FOCUS_SCRIPT);
      return;
    }
    if (message.kind === 'expired') {
      onToken('');
      setError('安全验证已过期，请重新完成验证。');
      return;
    }
    if (message.kind === 'unavailable') {
      if (unavailableTimer.current) clearTimeout(unavailableTimer.current);
      unavailableTimer.current = null;
      widgetVisibleRef.current = false;
      setWidgetVisible(false);
      setError('官方安全验证组件未加载，请稍后重试。');
      return;
    }
    if (unavailableTimer.current) clearTimeout(unavailableTimer.current);
    unavailableTimer.current = null;
    widgetVisibleRef.current = true;
    setWidgetVisible(true);
    setError('');
    onToken(message.token);
  }

  function allowNavigation(request: WebViewNavigation) {
    try {
      const url = new URL(request.url);
      if (url.protocol === 'about:' && url.href === 'about:blank') return true;
      return url.origin === origin || url.origin === 'https://challenges.cloudflare.com';
    } catch { return false; }
  }

  function scheduleUnavailableTimer() {
    if (unavailableTimer.current) clearTimeout(unavailableTimer.current);
    unavailableTimer.current = setTimeout(() => {
      unavailableTimer.current = null;
      if (!widgetVisibleRef.current && !agreementRequiredRef.current) setError('官方安全验证组件未加载，请检查网络后重试。');
    }, 45_000);
  }

  function onLoadEnd() {
    if (agreementAccepted && agreementDocuments.length > 0) webViewRef.current?.injectJavaScript(TURNSTILE_PAGE_ACCEPT_AGREEMENT_SCRIPT);
    // A provider page can load successfully while its Turnstile script is
    // blocked by network policy. Fail closed after a bounded wait instead of
    // leaving the login form with a challenge that can never produce a token.
    scheduleUnavailableTimer();
  }

  return <View style={{ marginTop: 14 }}>
    {/* Agreement is communicated by the native footer. Keep the first-party
        WebView mounted but quiet until the user submits the form; showing a
        second in-form consent card makes the auth surface feel blocked. */}
    {!widgetVisible && !agreementRequired ? <View style={{ minHeight: 56, borderRadius: 14, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.cardRaised, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 }}><ActivityIndicator color={theme.primary} /><Text style={{ flex: 1, color: error ? theme.danger : theme.subtext, fontSize: 12, lineHeight: 18 }}>{error || '正在加载官方安全验证…'}</Text></View> : null}
    {error && widgetVisible ? <Text style={{ color: theme.danger, fontSize: 12, lineHeight: 18, marginTop: 10 }}>{error}</Text> : null}
    <View style={{ marginTop: widgetVisible ? 10 : 1, height: widgetVisible ? 110 : 1, overflow: 'hidden', borderRadius: 12, borderWidth: widgetVisible ? 1 : 0, borderColor: theme.border, opacity: widgetVisible ? 1 : 0.01 }}><WebView key={`${action}-${resetKey ?? 0}`} ref={webViewRef} style={{ height: widgetVisible ? 110 : 1 }} source={{ uri: pageUrl }} originWhitelist={[origin, 'https://challenges.cloudflare.com', 'about:blank']} javaScriptEnabled domStorageEnabled injectedJavaScriptBeforeContentLoaded={TURNSTILE_PAGE_CAPTURE_SCRIPT} onLoadEnd={onLoadEnd} onMessage={onMessage} onShouldStartLoadWithRequest={allowNavigation} onError={() => { widgetVisibleRef.current = false; setWidgetVisible(false); setError('安全验证页面加载失败，请检查网络'); }} onHttpError={() => { widgetVisibleRef.current = false; setWidgetVisible(false); setError('安全验证页面返回了无效内容，请联系管理员。'); }} accessibilityLabel="turnstile-webview" /></View>
  </View>;
}
