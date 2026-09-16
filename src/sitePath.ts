const configuredBase = typeof document !== 'undefined'
  ? document.documentElement.dataset.basePath || ''
  : process.env.PUBLIC_BASE_PATH || '';

export const siteBase = configuredBase.replace(/\/$/, '');

export function sitePath(path: string) {
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  return `${siteBase}${path}`;
}

export function routePath(pathname: string) {
  if (!siteBase) return pathname;
  const stripped = pathname.startsWith(siteBase) ? pathname.slice(siteBase.length) : pathname;
  return stripped || '/';
}
