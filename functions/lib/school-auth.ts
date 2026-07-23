export interface SchoolConfig {
  slug: string;
  cookie: string;
  envKey: string;
  displayName: string;
}

export const SCHOOLS: Record<string, SchoolConfig> = {
  gis: { slug: 'gis', cookie: 'gis_auth', envKey: 'GIS_PASSWORD', displayName: 'Twin Cities German Immersion School' },
  sja: { slug: 'sja', cookie: 'sja_auth', envKey: 'SJA_PASSWORD', displayName: 'Sejong Academy' },
  ohm: { slug: 'ohm', cookie: 'ohm_auth', envKey: 'OHM_PASSWORD', displayName: 'Oak Hill Montessori' },
};

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days

async function getKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function toBase64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function signCookie(school: string, secret: string): Promise<string> {
  const expiry = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  const payload = `${school}|${expiry}`;
  const key = await getKey(secret);
  const enc = new TextEncoder();
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return `${btoa(payload)}.${toBase64Url(sig)}`;
}

export async function verifyCookie(cookieValue: string, school: string, secret: string): Promise<boolean> {
  const parts = cookieValue.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, sigB64] = parts;

  let payload: string;
  try {
    payload = atob(payloadB64);
  } catch {
    return false;
  }

  const [cookieSchool, expiryStr] = payload.split('|');
  if (cookieSchool !== school) return false;

  const expiry = parseInt(expiryStr, 10);
  if (isNaN(expiry) || expiry < Math.floor(Date.now() / 1000)) return false;

  const key = await getKey(secret);
  const enc = new TextEncoder();
  const sig = fromBase64Url(sigB64);
  return crypto.subtle.verify('HMAC', key, sig, enc.encode(payload));
}

export function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

export function setCookieHeader(config: SchoolConfig, value: string): string {
  return `${config.cookie}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearCookieHeader(config: SchoolConfig): string {
  return `${config.cookie}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}
