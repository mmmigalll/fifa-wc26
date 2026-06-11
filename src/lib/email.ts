// Sends login codes via Brevo (https://www.brevo.com).
// Brevo only requires verifying a sender email address (confirmation link),
// no DNS records needed. Free tier: 300 emails/day.

export async function sendLoginCode(email: string, code: string) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    // Development fallback: no email provider configured.
    console.log(`[dev] Login code for ${email}: ${code}`);
    return;
  }

  // EMAIL_FROM format: "WC26 Predictions <you@gmail.com>" or just "you@gmail.com".
  // The address must be a verified sender in Brevo.
  const raw = process.env.EMAIL_FROM ?? '';
  const match = raw.match(/^(.*)<(.+)>$/);
  const sender = match
    ? { name: match[1].trim() || 'WC26 Predictions', email: match[2].trim() }
    : { name: 'WC26 Predictions', email: raw.trim() };

  if (!sender.email) {
    throw new Error('EMAIL_FROM must be set to your verified Brevo sender address');
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender,
      to: [{ email }],
      subject: `${code} is your WC26 Predictions login code`,
      textContent: [
        `Your login code is: ${code}`,
        '',
        'It expires in 10 minutes. If you did not request it, ignore this email.',
      ].join('\n'),
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Failed to send login email: ${res.status} ${body}`);
  }
}
