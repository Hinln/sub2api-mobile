import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-secure-store', () => ({}));
vi.mock('react-native', () => ({ Platform: { OS: 'web' } }));

// eslint-disable-next-line import/first
import { parseAccountTestEventStream, testAccount } from '@/src/services/admin';
// eslint-disable-next-line import/first
import { adminConfigState } from '@/src/store/admin-config';

describe('account test event stream', () => {
  beforeEach(() => {
    adminConfigState.baseUrl = 'https://hub.vexlune.com';
    adminConfigState.adminApiKey = 'admin-test-secret';
    vi.restoreAllMocks();
  });

  it('parses content and the terminal success event', () => {
    const raw = [
      'data: {"type":"test_start","model":"gpt-5"}',
      '',
      'data: {"type":"content","text":"Hub connection is healthy."}',
      '',
      'data: {"type":"test_complete","success":true}',
      '',
    ].join('\n');

    expect(parseAccountTestEventStream(raw, 321)).toEqual({
      success: true,
      message: 'Hub connection is healthy.',
      latency_ms: 321,
    });
  });

  it('turns an SSE error event into a visible failed result', () => {
    const raw = 'data: {"type":"error","error":"Invalid API key"}\n\n';
    expect(parseAccountTestEventStream(raw, 120)).toEqual({
      success: false,
      message: 'Invalid API key',
      latency_ms: 120,
    });
  });

  it('posts with the event-stream contract and measures elapsed time', async () => {
    vi.spyOn(Date, 'now').mockReturnValueOnce(1_000).mockReturnValueOnce(1_245);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(
      'data: {"type":"test_complete","success":true}\n\n',
      { status: 200, headers: { 'content-type': 'text/event-stream' } },
    ));

    await expect(testAccount(42)).resolves.toEqual({
      success: true,
      message: 'Hub 已完成真实连通性测试。',
      latency_ms: 245,
    });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hub.vexlune.com/api/v1/admin/accounts/42/test');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Accept')).toBe('text/event-stream');
    expect(new Headers(init?.headers).get('x-api-key')).toBe('admin-test-secret');
  });

  it('rejects a truncated stream without a terminal event', () => {
    expect(() => parseAccountTestEventStream('data: {"type":"test_start"}\n\n')).toThrow('未正常结束');
  });
});
