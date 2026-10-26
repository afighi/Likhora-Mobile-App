/**
 * In-app password reset.
 *
 * Thin client over the "password-reset" Edge Function. Deliberately thin: the
 * code is generated, stored and checked server-side, so nothing here can be
 * bypassed by editing what the app does. This file only moves values between
 * the screen and the function.
 *
 * Contrast with services/emailjs.ts, whose OTP is generated in the client —
 * acceptable for confirming your own signup, never for resetting a password.
 */

import { supabase, SUPABASE_ANON_KEY } from './supabase';

export interface ResetResult {
  ok: boolean;
  message: string;
}

const FUNCTION_NAME = 'password-reset';

const callFunction = async (body: Record<string, unknown>): Promise<ResetResult> => {
  try {
    const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
      headers: {
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body,
    });

    if (error) {
      // A non-2xx response arrives as an error with the body attached, and the
      // function's own message ("That code is not correct") is far more useful
      // to the user than the generic transport error.
      const contextMessage = await readErrorMessage(error);
      return { ok: false, message: contextMessage || 'Something went wrong. Please try again.' };
    }

    if (data && typeof data.ok === 'boolean') return data as ResetResult;
    return { ok: false, message: 'Unexpected response from the server.' };
  } catch (err) {
    console.warn('Password reset call failed:', err);
    return { ok: false, message: 'Could not reach the server. Check your connection.' };
  }
};

/** Digs the function's JSON message out of a FunctionsHttpError. */
const readErrorMessage = async (error: any): Promise<string> => {
  try {
    const body = await error?.context?.json?.();
    if (body?.message) return body.message as string;
  } catch {
    // Body already consumed or not JSON — fall through to the generic message.
  }
  return '';
};

/** Emails a 6-digit code. Answers the same way whether or not the account exists. */
export const requestPasswordResetCode = (email: string): Promise<ResetResult> =>
  callFunction({ action: 'request', email: email.trim().toLowerCase() });

/** Verifies the code and sets the new password. */
export const confirmPasswordReset = (
  email: string,
  code: string,
  password: string
): Promise<ResetResult> =>
  callFunction({
    action: 'confirm',
    email: email.trim().toLowerCase(),
    code: code.trim(),
    password,
  });
