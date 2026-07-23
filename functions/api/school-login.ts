import { SCHOOLS, signCookie, clearCookieHeader, setCookieHeader } from '../lib/school-auth';

interface Env {
  GIS_PASSWORD: string;
  SJA_PASSWORD: string;
  OHM_PASSWORD: string;
  SCHOOL_AUTH_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const formData = await request.formData();
  const slug = (formData.get('school') as string || '').toLowerCase();
  const password = formData.get('password') as string || '';
  const action = formData.get('action') as string || '';

  const school = SCHOOLS[slug];
  if (!school) {
    return new Response('Invalid school', { status: 400 });
  }

  if (action === 'logout') {
    return new Response(null, {
      status: 303,
      headers: {
        'Location': `/${slug}`,
        'Set-Cookie': clearCookieHeader(school),
      },
    });
  }

  const expectedPassword = env[school.envKey as keyof Env];
  if (!expectedPassword || password !== expectedPassword) {
    return new Response(null, {
      status: 303,
      headers: { 'Location': `/${slug}?error=1` },
    });
  }

  const cookieValue = await signCookie(slug, env.SCHOOL_AUTH_SECRET);
  return new Response(null, {
    status: 303,
    headers: {
      'Location': `/${slug}`,
      'Set-Cookie': setCookieHeader(school, cookieValue),
    },
  });
};
