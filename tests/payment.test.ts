import { describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

// The payment contract helper imports the shared transport, which imports
// platform modules. Keep this pure contract suite in the Node test runtime
// without asking Vite/Rolldown to parse React Native's Flow source.
import { resolvePaymentAction } from '@/src/services/user';

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
});
