import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

// The payment contract helper imports the shared transport, which imports
// platform modules. Keep this pure contract suite in the Node test runtime
// without asking Vite/Rolldown to parse React Native's Flow source.
import { buildAlipayDeepLink, resolvePaymentAction, resolvePaymentOAuthURL } from '@/src/services/user';

const order = (fields: Record<string, unknown>) => ({
  id: 42,
  amount: 10,
  payment_type: 'stripe',
  out_trade_no: 'sub2_42',
  status: 'pending',
  ...fields,
});

describe('payment action contract', () => {
  it('prefers the server checkout URL and accepts native payment deep links', () => {
    expect(resolvePaymentAction(order({ pay_url: 'https://checkout.example.test/order/42', qr_code: 'weixin://wxpay/42' }))).toEqual({
      url: 'https://checkout.example.test/order/42',
      source: 'pay_url',
    });
    expect(resolvePaymentAction(order({ qr_code: 'alipays://platformapi/startapp?appId=20000067' }))).toEqual({
      url: 'alipays://platformapi/startapp?appId=20000067',
      source: 'qr_code',
    });
  });

  it('does not treat opaque provider payloads or image data as payable URLs', () => {
    expect(resolvePaymentAction(order({ client_secret: 'pi_secret_123', intent_id: 'pi_123', qr_code: 'opaque-qr-payload' }))).toBeUndefined();
    expect(resolvePaymentAction(order({ qr_code: 'data:image/png;base64,abc' }))).toBeUndefined();
    expect(resolvePaymentAction(order({ pay_url: 'javascript:alert(1)' }))).toBeUndefined();
    expect(resolvePaymentAction(order({ pay_url: 'file:///tmp/payment' }))).toBeUndefined();
  });

  it('turns the official mobile Alipay precreate payload into an Alipay deep link', () => {
    const payload = 'https://qr.alipay.com/bax123?x=1&y=2';
    expect(buildAlipayDeepLink(payload)).toBe(`alipays://platformapi/startapp?saId=10000007&qrcode=${encodeURIComponent(payload)}`);
    expect(resolvePaymentAction(order({ payment_type: 'alipay', qr_code: payload, alipay_mobile_precreate_deep_link: true }))).toEqual({
      url: buildAlipayDeepLink(payload),
      source: 'alipay_deep_link',
    });
  });

  it('does not construct an Alipay deep link for another payment method', () => {
    expect(resolvePaymentAction(order({ payment_type: 'wxpay', qr_code: 'opaque-qr-payload', alipay_mobile_precreate_deep_link: true }))).toBeUndefined();
  });

  it('resolves the official relative WeChat OAuth URL against the configured Hub origin', () => {
    expect(resolvePaymentOAuthURL(order({ result_type: 'oauth_required', oauth: { authorize_url: '/api/v1/auth/oauth/wechat/payment/start?scope=snsapi_base' } }), 'https://hub.example.test/')).toEqual({
      url: 'https://hub.example.test/api/v1/auth/oauth/wechat/payment/start?scope=snsapi_base',
      source: 'oauth_required',
    });
    expect(resolvePaymentOAuthURL(order({ result_type: 'oauth_required', oauth: { authorize_url: '//evil.example.test/auth' } }), 'https://hub.example.test')).toBeUndefined();
  });
});
