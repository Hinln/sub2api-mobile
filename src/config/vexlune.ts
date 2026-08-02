export const VEXLUNE_HUB_URL = 'https://hub.vexlune.com' as const;
export const VEXLUNE_API_URL = 'https://api.vexlune.com' as const;
export const APP_NAME = 'Vexlune Mobile Console' as const;
export const APP_VERSION = '1.0.1' as const;

export function normalizeHubUrl(input: string) {
  const value = input.trim().replace(/\/+$/, '');
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error('请输入有效的 HTTPS 地址');
  }

  if (url.protocol !== 'https:') throw new Error('管理地址必须使用 HTTPS');
  if (url.username || url.password) throw new Error('管理地址不能包含用户名或密码');
  if (url.hostname === new URL(VEXLUNE_API_URL).hostname) throw new Error('模型 API 地址不能用作管理地址');
  if (url.pathname !== '/' || url.search || url.hash) throw new Error('管理地址只能填写站点根地址');

  return value;
}

export function isDefaultHubUrl(value: string) {
  try {
    return normalizeHubUrl(value) === VEXLUNE_HUB_URL;
  } catch {
    return false;
  }
}
