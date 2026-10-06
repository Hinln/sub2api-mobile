import { describe, expect, it } from 'vitest';

import { buildRedactedAccountCredentialsForMapping } from '@/src/lib/account-credentials';

describe('account model mapping credentials merge', () => {
  it('preserves non-sensitive fields while replacing only model_mapping', () => {
    const result = buildRedactedAccountCredentialsForMapping({
      base_url: 'https://upstream.example/v1',
      header_overrides: { 'X-Trace': 'enabled' },
      model_mapping: { old: 'old' },
      api_key: 'must-not-be-sent',
      access_token: 'must-not-be-sent',
    }, ['gpt-5', 'claude-sonnet']);

    expect(result).toEqual({
      base_url: 'https://upstream.example/v1',
      header_overrides: { 'X-Trace': 'enabled' },
      model_mapping: { 'gpt-5': 'gpt-5', 'claude-sonnet': 'claude-sonnet' },
    });
  });

  it('blocks an update when the server did not return credentials', () => {
    expect(buildRedactedAccountCredentialsForMapping(undefined, ['gpt-5'])).toBeNull();
  });
});
