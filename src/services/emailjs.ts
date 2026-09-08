// EmailJS Integration for Likhora AI
const EMAILJS_SERVICE_ID = 'service_i7ikkwo';
const EMAILJS_TEMPLATE_ID = 'template_yjczdil';
const EMAILJS_PUBLIC_KEY = 'hZiZiKjk1A4DdK8X7';

export const generateOTPCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendOTPEmail = async (toEmail: string, otpCode: string, userName?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const payload = {
      service_id: EMAILJS_SERVICE_ID,
      template_id: EMAILJS_TEMPLATE_ID,
      user_id: EMAILJS_PUBLIC_KEY,
      template_params: {
        to_email: toEmail,
        to_name: userName || 'Valued Entrepreneur',
        user_email: toEmail,
        user_name: userName || 'Valued Entrepreneur',
        otp_code: otpCode,
        passcode: otpCode,
        message: `Your Likhora verification code is: ${otpCode}. Valid for 10 minutes.`,
        app_name: 'Likhora'
      }
    };

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      return { success: true, message: 'OTP sent successfully to ' + toEmail };
    }

    // Surface the real failure instead of pretending it worked — a bad key,
    // wrong service/template ID, or an origin restriction on the EmailJS
    // account all land here, and hiding them just strands the user on the
    // OTP screen waiting for an email that was never sent.
    const text = await res.text();
    console.warn('EmailJS send failed:', res.status, text);
    return { success: false, message: `Failed to send OTP (EmailJS ${res.status}): ${text}` };
  } catch (error: any) {
    console.warn('EmailJS network error:', error);
    return { success: false, message: 'Failed to send OTP — check your network connection and try again.' };
  }
};
