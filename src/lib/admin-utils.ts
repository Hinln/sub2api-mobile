export function formatMoney(value: number, currency = '$') {
  if (!Number.isFinite(value)) return '--';
  return `${currency}${value.toFixed(2)}`;
}

export function mapStatus(status?: string) {
  const normalized = (status || '').toLowerCase();
  if (['active', 'normal', 'success', 'enabled'].includes(normalized)) return { label: '\u6b63\u5e38', tone: 'success' as const };
  if (['disabled', 'inactive', 'paused'].includes(normalized)) return { label: '\u5df2\u505c\u7528', tone: 'muted' as const };
  if (['error', 'failed', 'invalid'].includes(normalized)) return { label: '\u5f02\u5e38', tone: 'danger' as const };
  if (['cooldown', 'rate_limited', 'limited'].includes(normalized)) return { label: '\u51b7\u5374\u4e2d', tone: 'warning' as const };
  return { label: status || '\u672a\u77e5', tone: 'muted' as const };
}
