import { db } from '../src/lib/db';

const BASE = 'http://127.0.0.1:3040';

async function run() {
  // 1. Fetch anonymously
  const anonRes = await fetch(BASE + '/user-dashboard/study');
  const anonHtml = await anonRes.text();
  console.log('--- 1. Anonymous / Student View ---');
  console.log('Status:', anonRes.status);
  console.log('Includes "No study booklets are available yet":', anonHtml.includes('No study booklets are available yet.'));
  console.log('Includes "ADC Dental Study Library":', anonHtml.includes('ADC Dental Study Library'));

  const anonTocRes = await fetch(BASE + '/user-dashboard/study/tg-oral-dental');
  console.log('Anonymous /user-dashboard/study/tg-oral-dental status:', anonTocRes.status);

  // 2. Fetch as Admin
  const jar = new Map<string, string>();
  const store = (res: Response) => {
    for (const c of res.headers.getSetCookie?.() ?? []) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      const k = kv.slice(0, i).trim();
      const v = kv.slice(i + 1).trim();
      if (!v || /expires=Thu, 01 Jan 1970/i.test(c)) jar.delete(k);
      else jar.set(k, v);
    }
  };
  const req = async (p: string) => {
    const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
    const res = await fetch(BASE + p, { headers: { cookie }, redirect: 'manual' });
    store(res);
    return res;
  };

  const csrf = await (await req('/api/auth/csrf')).json();
  const loginRes = await fetch(BASE + '/api/auth/callback/password', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; ') },
    body: new URLSearchParams({ csrfToken: csrf.csrfToken, email: 'admin@adcexamprep.com', password: 'AdminPassword123!', callbackUrl: BASE + '/' }).toString(),
    redirect: 'manual'
  });
  store(loginRes);

  const me = await (await req('/api/auth/session')).json();
  console.log('\n--- 2. Admin Authentication ---');
  console.log('Logged in user:', me?.user?.email, 'Role:', me?.user?.role);

  const adminLibRes = await req('/user-dashboard/study');
  const adminLibHtml = await adminLibRes.text();
  console.log('\n--- 3. Admin Preview: Library ---');
  console.log('Admin /user-dashboard/study status:', adminLibRes.status);
  console.log('Includes "Admin preview · DRAFT":', adminLibHtml.includes('Admin preview'));
  console.log('Includes "Therapeutic Guidelines: Oral and Dental":', adminLibHtml.includes('Therapeutic Guidelines: Oral and Dental'));
  console.log('Includes "Edition / Year: eTG 2025":', adminLibHtml.includes('Edition / Year: eTG 2025'));

  const adminTocRes = await req('/user-dashboard/study/tg-oral-dental');
  const adminTocHtml = await adminTocRes.text();
  console.log('\n--- 4. Admin Preview: TOC Hierarchy ---');
  console.log('Admin /user-dashboard/study/tg-oral-dental status:', adminTocRes.status);
  console.log('Includes "Table of Contents (42 Chapters in 9 Sections)":', adminTocHtml.includes('Table of Contents (42 Chapters in 9 Sections)'));
  console.log('Includes "Section 1":', adminTocHtml.includes('Section 1'));
  console.log('Includes "Section 9":', adminTocHtml.includes('Section 9'));
  console.log('Includes "Admin preview — this booklet is draft":', adminTocHtml.includes('Admin preview — this booklet is draft'));

  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
