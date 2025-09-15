// Proper Telegram WebApp initData verification
const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyTelegramInitData(initData: string, botToken: string): Promise<string> {
  if (!initData || !botToken) {
    throw new Error('Missing initData or botToken');
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash') ?? '';
  if (!hash) {
    throw new Error('Missing hash in initData');
  }
  
  params.delete('hash');

  // Create data check string
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');

  // Create secret key from bot token
  const secret = await crypto.subtle.digest('SHA-256', enc.encode(botToken));
  const key = await crypto.subtle.importKey(
    'raw', 
    secret, 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  );
  
  // Calculate HMAC
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(dataCheckString));
  const calculatedHash = hex(sig);
  
  if (calculatedHash !== hash) {
    throw new Error('Invalid initData signature');
  }

  // Check auth_date (must be within 10 minutes)
  const authDate = Number(params.get('auth_date') || 0);
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 600) {
    throw new Error('initData expired (older than 10 minutes)');
  }

  // Extract user data
  const userParam = params.get('user');
  if (!userParam) {
    throw new Error('No user data in initData');
  }

  const user = JSON.parse(userParam);
  if (!user?.id) {
    throw new Error('Invalid user data');
  }

  return String(user.id);
}