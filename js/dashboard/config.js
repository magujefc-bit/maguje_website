// The dashboard is merged into the same SPA as the public site (one
// router, one index.html) and lives under this URL prefix so its
// routes stay distinct from the public site's own routes.
//
// If the real deployment path ends up different, this is the only
// place that needs to change — every dashboard route, link, and
// redirect is built from BASE_PATH. (The public site's footer link
// to the login page is a separate plain string in footer.js though,
// since it's written before this module's value is known at build
// time — update both if this changes.)
export const BASE_PATH = '/maguje-dashboard';

export function dashPath(path = '') {
  if (!path || path === '/') return BASE_PATH || '/';
  return `${BASE_PATH}${path.startsWith('/') ? path : `/${path}`}`;
}
