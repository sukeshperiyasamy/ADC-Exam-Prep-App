/**
 * Authenticated smoke test for the app's major routes against a RUNNING dev
 * server. Uses the seeded admin credentials from .env (values stay in memory;
 * never printed). Targets local servers only.
 *
 *   BASE_URL=http://localhost:3040 npx tsx scripts/smoke-core-routes.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const BASE = process.env.BASE_URL || 'http://localhost:3040';
if (!/^http:\/\/(127\.0\.0\.1|localhost)/.test(BASE)) {
  console.error('Refusing to run: BASE_URL must be a local server.');
  process.exit(2);
}

function env(name: string): string {
  if (process.env[name]) return process.env[name] as string;
  const line = readFileSync('.env', 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  // .env values may be quoted — strip exactly one wrapping pair, like dotenv.
  return line ? line.slice(name.length + 1).trim().replace(/^["']|["']$/g, '') : '';
}

async function main() {
  const email = env('ADMIN_EMAIL');
  const password = env('ADMIN_PASSWORD');
  assert.ok(email && password, 'ADMIN_EMAIL / ADMIN_PASSWORD must be set and seeded locally');

  const jar = new Map<string, string>();
  const req = async (path: string, init: RequestInit = {}) => {
    const res = await fetch(BASE + path, {
      ...init,
      headers: { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '), ...(init.headers ?? {}) },
      redirect: 'manual'
    });
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i).trim();
      const v = kv.slice(i + 1).trim();
      if (!v || /expires=Thu, 01 Jan 1970/i.test(c)) jar.delete(k);
      else jar.set(k, v);
    }
    return res;
  };

  const csrf: any = await (await req('/api/auth/csrf')).json();
  const cb = await req('/api/auth/callback/password', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email, password, callbackUrl: BASE + '/' }).toString()
  });
  console.log('login callback:', cb.status, cb.headers.get('location') ?? '(no location)');
  const me: any = await (await req('/api/auth/session')).json();
  console.log('session user:', me?.user?.email ?? '(none)');
  assert.ok(me?.user?.email, 'smoke admin login failed');

  const routes: Array<[string, number]> = [
    ['/', 200],
    ['/practice-exams', 200],
    ['/p/terms', 200],
    ['/user-dashboard', 200],
    ['/user-dashboard/orders', 200],
    ['/user-dashboard/invoices', 200],
    ['/user-dashboard/exams', 200],
    ['/user-dashboard/attempts', 200],
    ['/user-dashboard/study', 200],
    ['/admin-dashboard', 200],
    ['/admin-dashboard/orders', 200],
    ['/admin-dashboard/invoices', 200],
    ['/admin-dashboard/reports/revenue', 200],
    ['/admin-dashboard/reports/tax', 200],
    ['/admin-dashboard/booklets', 200],
    ['/admin-dashboard/users', 200],
    ['/admin-dashboard/vouchers/inventory', 200]
  ];

  let failed = 0;
  for (const [path, expected] of routes) {
    const r = await req(path);
    const ok = r.status === expected;
    console.log(`${ok ? '✓' : '✗'} ${r.status} ${path}`);
    if (!ok) failed++;
  }
  console.log(`\n${routes.length - failed}/${routes.length} routes OK`);
  process.exit(failed ? 1 : 0);
}

main().catch((e) => {
  console.error(e?.message ?? e);
  process.exit(1);
});
