import { Resend } from 'resend';

export async function sendLoginCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Development fallback: no email provider configured.
    console.log(`[dev] Login code for ${email}: ${code}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.EMAIL_FROM ?? 'WC26 Predictions <onboarding@resend.dev>',
    to: email,
    subject: `${code} is your WC26 Predictions login code`,
    text: [
      `Your login code is: ${code}`,
      '',
      'It expires in 10 minutes. If you did not request it, ignore this email.',
    ].join('\n'),
  });

  if (error) throw new Error(`Failed to send login email: ${error.message}`);
}
