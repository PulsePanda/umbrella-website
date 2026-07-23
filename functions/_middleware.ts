import { SCHOOLS, verifyCookie, getCookie } from './lib/school-auth';

interface Env {
  GIS_PASSWORD: string;
  SJA_PASSWORD: string;
  OHM_PASSWORD: string;
  SCHOOL_AUTH_SECRET: string;
}

function getSchoolSlug(pathname: string): string | null {
  const cleaned = pathname.replace(/\/+$/, '').toLowerCase();
  if (cleaned === '/gis' || cleaned === '/sja' || cleaned === '/ohm') {
    return cleaned.slice(1);
  }
  return null;
}

function renderLoginPage(schoolName: string, slug: string, error: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${schoolName} Portal | Umbrella Systems</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bangers&family=Poppins:wght@400;500;600;700&display=swap" rel="stylesheet" />
  <style>
    :root {
      --navy: #1a1a2e;
      --red: #ff1744;
      --red-dark: #d50000;
      --yellow: #ffd600;
      --white: #ffffff;
      --border-comic: 3px solid var(--navy);
      --shadow-comic: 4px 4px 0px var(--navy);
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Poppins', sans-serif;
      background: var(--navy);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }
    body::before {
      content: '';
      position: absolute;
      inset: 0;
      background-image: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px);
      background-size: 12px 12px;
      pointer-events: none;
    }
    .login-card {
      background: var(--white);
      border: var(--border-comic);
      box-shadow: var(--shadow-comic);
      padding: 48px 40px;
      max-width: 440px;
      width: 100%;
      position: relative;
      z-index: 1;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 32px;
      text-decoration: none;
      color: var(--navy);
    }
    .logo img { border-radius: 4px; }
    .logo span {
      font-family: 'Bangers', cursive;
      font-size: 1.3rem;
      letter-spacing: 0.06em;
    }
    h1 {
      font-family: 'Bangers', cursive;
      font-size: 1.8rem;
      color: var(--navy);
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .subtitle {
      font-size: 0.95rem;
      color: #666;
      margin-bottom: 28px;
      line-height: 1.5;
    }
    .error {
      background: #fce4ec;
      border: 2px solid var(--red);
      color: var(--red-dark);
      padding: 12px 16px;
      font-size: 0.9rem;
      font-weight: 500;
      margin-bottom: 20px;
    }
    label {
      display: block;
      font-family: 'Bangers', cursive;
      font-size: 1rem;
      letter-spacing: 1px;
      color: var(--navy);
      margin-bottom: 8px;
    }
    input[type="password"] {
      width: 100%;
      padding: 12px 16px;
      font-family: 'Poppins', sans-serif;
      font-size: 1rem;
      border: var(--border-comic);
      background: var(--white);
      color: var(--navy);
      outline: none;
      transition: box-shadow 0.15s;
    }
    input[type="password"]:focus {
      box-shadow: var(--shadow-comic);
    }
    button {
      display: block;
      width: 100%;
      margin-top: 20px;
      padding: 14px;
      font-family: 'Bangers', cursive;
      font-size: 1.2rem;
      letter-spacing: 2px;
      text-transform: uppercase;
      background: var(--yellow);
      color: var(--navy);
      border: var(--border-comic);
      box-shadow: var(--shadow-comic);
      cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
    }
    button:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0px var(--navy);
    }
    button:active {
      transform: translate(2px, 2px);
      box-shadow: 1px 1px 0px var(--navy);
    }
    .back-link {
      display: block;
      text-align: center;
      margin-top: 20px;
      font-size: 0.85rem;
      color: #666;
    }
    .back-link a { color: var(--navy); }
  </style>
</head>
<body>
  <div class="login-card">
    <a href="/" class="logo">
      <img src="/images/umbrella-icon.png" alt="" width="36" height="36" />
      <span>UMBRELLA SYSTEMS</span>
    </a>
    <h1>${schoolName}</h1>
    <p class="subtitle">Enter your school password to access the resource hub.</p>
    ${error ? '<div class="error">Incorrect password. Please try again.</div>' : ''}
    <form method="POST" action="/api/school-login">
      <input type="hidden" name="school" value="${slug}" />
      <label for="password">Password</label>
      <input type="password" id="password" name="password" required autocomplete="current-password" />
      <button type="submit">Sign In</button>
    </form>
    <p class="back-link"><a href="/">← Back to umbrellasystems.net</a></p>
  </div>
</body>
</html>`;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const slug = getSchoolSlug(url.pathname);

  if (!slug) return context.next();

  const school = SCHOOLS[slug];
  if (!school) return context.next();

  const cookieHeader = context.request.headers.get('Cookie');
  const cookieValue = getCookie(cookieHeader, school.cookie);

  if (cookieValue) {
    const valid = await verifyCookie(cookieValue, slug, context.env.SCHOOL_AUTH_SECRET);
    if (valid) return context.next();
  }

  const error = url.searchParams.has('error');
  const html = renderLoginPage(school.displayName, slug, error);
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
};
