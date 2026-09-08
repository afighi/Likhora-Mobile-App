/**
 * Password reset — Supabase Edge Function.
 *
 * Replaces Firebase's emailed reset link with an in-app OTP flow:
 *
 *   POST { action: "request", email }              -> emails a 6-digit code
 *   POST { action: "confirm", email, code, password } -> sets the new password
 *
 * Everything that matters happens here, not in the app. The client SDK cannot
 * change a password without either an active session or the oobCode from
 * Firebase's own email, so setting it requires Admin credentials — and those
 * can only live on a server. Generating and checking the code here too means
 * the app never holds a value that could be read out of devtools and replayed
 * against someone else's account.
 *
 * Deploy:
 *   supabase functions deploy password-reset --no-verify-jwt
 *
 * Secrets (supabase secrets set ...):
 *   FIREBASE_SERVICE_ACCOUNT  the service account JSON, as one line
 *   EMAILJS_SERVICE_ID        from services/emailjs.ts
 *   EMAILJS_TEMPLATE_ID       from services/emailjs.ts
 *   EMAILJS_PUBLIC_KEY        from services/emailjs.ts
 *   EMAILJS_PRIVATE_KEY       EmailJS Account -> API keys (required for
 *                             server-side sends; the client flow does not use it)
 *
 * SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const OTP_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;
const MIN_PASSWORD_LENGTH = 8;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sha256 = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
};

/** Cryptographically random, unlike Math.random() in the client's generator. */
const generateCode = (): string => {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return (buffer[0] % 900000 + 100000).toString();
};

const base64Url = (input: string | Uint8Array): string => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const pemToArrayBuffer = (pem: string): ArrayBuffer => {
  const body = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
};

/**
 * Exchanges the service account for an OAuth2 access token, by signing a JWT
 * with its private key. This is what the Admin SDK does internally; doing it
 * by hand avoids pulling a Node-oriented SDK into Deno.
 */
const getAccessToken = async (): Promise<{ token: string; projectId: string }> => {
  const raw = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');

  const account = JSON.parse(raw) as {
    client_email: string;
    private_key: string;
    project_id: string;
  };

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = base64Url(
    JSON.stringify({
      iss: account.client_email,
      scope: 'https://www.googleapis.com/auth/identitytoolkit',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    })
  );

  const key = await crypto.subtle.importKey(
    'pkcs8',
    // Secrets are stored as a single line, so the escaped newlines in the PEM
    // have to be turned back into real ones before parsing.
    pemToArrayBuffer(account.private_key.replace(/\\n/g, '\n')),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      key,
      new TextEncoder().encode(`${header}.${claims}`)
    )
  );

  const assertion = `${header}.${claims}.${base64Url(signature)}`;

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return { token: data.access_token as string, projectId: account.project_id };
};

const findFirebaseUser = async (token: string, email: string): Promise<string | null> => {
  const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:lookup', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: [email] }),
  });

  if (!response.ok) return null;
  const data = await response.json();
  return data.users?.[0]?.localId ?? null;
};

const setFirebasePassword = async (token: string, localId: string, password: string) => {
  const response = await fetch('https://identitytoolkit.googleapis.com/v1/accounts:update', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId, password }),
  });

  if (!response.ok) {
    throw new Error(`Password update failed: ${response.status} ${await response.text()}`);
  }
};

const sendCodeEmail = async (email: string, code: string) => {
  const payload = {
    service_id: Deno.env.get('EMAILJS_SERVICE_ID'),
    template_id: Deno.env.get('EMAILJS_TEMPLATE_ID'),
    user_id: Deno.env.get('EMAILJS_PUBLIC_KEY'),
    // EmailJS rejects server-side sends without the private key.
    accessToken: Deno.env.get('EMAILJS_PRIVATE_KEY'),
    template_params: {
      to_email: email,
      to_name: 'Likhora user',
      user_email: email,
      user_name: 'Likhora user',
      otp_code: code,
      passcode: code,
      message: `Your Likhora password reset code is: ${code}. Valid for ${OTP_TTL_MINUTES} minutes. If you did not request this, ignore this email.`,
      app_name: 'Likhora',
    },
  };

  const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`EmailJS ${response.status}: ${await response.text()}`);
  }
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

const handleRequest = async (email: string) => {
  // Always answer the same way, whether or not the account exists — telling a
  // stranger which addresses are registered is account enumeration.
  const generic = { ok: true, message: 'If that email has an account, a code is on its way.' };

  let accessToken: string;
  try {
    const auth = await getAccessToken();
    accessToken = auth.token;
  } catch (error) {
    console.error('Admin auth failed:', error);
    return json({ ok: false, message: 'Service unavailable. Please try again shortly.' }, 503);
  }

  const localId = await findFirebaseUser(accessToken, email);
  if (!localId) return json(generic);

  const code = generateCode();
  const codeHash = await sha256(code);

  // Any earlier code for this address stops working the moment a new one is
  // issued, so a leaked old email cannot be used later.
  await supabase
    .from('password_reset_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('email', email)
    .is('consumed_at', null);

  const { error: insertError } = await supabase.from('password_reset_otps').insert({
    email,
    code_hash: codeHash,
    expires_at: new Date(Date.now() + OTP_TTL_MINUTES * 60_000).toISOString(),
  });

  if (insertError) {
    console.error('Could not store reset code:', insertError);
    return json({ ok: false, message: 'Could not start the reset. Please try again.' }, 500);
  }

  try {
    await sendCodeEmail(email, code);
  } catch (error) {
    console.error('Could not email reset code:', error);
    // A send failure is worth surfacing: staying silent leaves the user
    // waiting for a code that will never arrive.
    return json({ ok: false, message: 'Could not send the email. Please try again.' }, 502);
  }

  return json(generic);
};

const handleConfirm = async (email: string, code: string, password: string) => {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return json(
      { ok: false, message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      400
    );
  }

  const { data: rows, error } = await supabase
    .from('password_reset_otps')
    .select('*')
    .eq('email', email)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Could not read reset code:', error);
    return json({ ok: false, message: 'Could not verify the code. Please try again.' }, 500);
  }

  const record = rows?.[0];
  if (!record) return json({ ok: false, message: 'Request a new code to continue.' }, 400);

  if (new Date(record.expires_at).getTime() < Date.now()) {
    return json({ ok: false, message: 'That code has expired. Request a new one.' }, 400);
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return json({ ok: false, message: 'Too many attempts. Request a new code.' }, 429);
  }

  if ((await sha256(code)) !== record.code_hash) {
    await supabase
      .from('password_reset_otps')
      .update({ attempts: record.attempts + 1 })
      .eq('id', record.id);
    return json({ ok: false, message: 'That code is not correct.' }, 400);
  }

  let accessToken: string;
  try {
    const auth = await getAccessToken();
    accessToken = auth.token;
  } catch (adminError) {
    console.error('Admin auth failed:', adminError);
    return json({ ok: false, message: 'Service unavailable. Please try again shortly.' }, 503);
  }

  const localId = await findFirebaseUser(accessToken, email);
  if (!localId) return json({ ok: false, message: 'Could not complete the reset.' }, 400);

  try {
    await setFirebasePassword(accessToken, localId, password);
  } catch (updateError) {
    console.error('Password update failed:', updateError);
    return json({ ok: false, message: 'Could not set the new password. Please try again.' }, 500);
  }

  // Burn the code only after the password actually changed, so a failed
  // update does not force the user to request a fresh one.
  await supabase
    .from('password_reset_otps')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', record.id);

  return json({ ok: true, message: 'Your password has been updated.' });
};

// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ ok: false, message: 'Method not allowed' }, 405);

  let body: { action?: string; email?: string; code?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: 'Invalid request.' }, 400);
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return json({ ok: false, message: 'Enter a valid email address.' }, 400);
  }

  if (body.action === 'request') return handleRequest(email);
  if (body.action === 'confirm') {
    return handleConfirm(email, (body.code || '').trim(), body.password || '');
  }

  return json({ ok: false, message: 'Unknown action.' }, 400);
});
