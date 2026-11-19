/**
 * Minimal Resend REST adapter. No secret is exposed to Cloudflare or the browser.
 * Return only delivery success/failure; never log authentication links or tokens.
 */
export function createResendMailer({
  apiKey = process.env.RESEND_API_KEY,
  from = process.env.RESEND_FROM_EMAIL,
  fetchImpl = globalThis.fetch
} = {}) {
  if (!apiKey || !from) {
    throw new Error('Authentication emails require RESEND_API_KEY and RESEND_FROM_EMAIL');
  }
  // Require a verified sender mailbox; the domain verification itself
  // must be confirmed in the Resend dashboard before enabling auth.
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(from)) {
    throw new Error('RESEND_FROM_EMAIL must be a valid email address');
  }
  return {
    async send({ to, subject, text }) {
      if (!to || !subject || !text) throw new Error('Invalid transactional email');
      const response = await fetchImpl('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ from, to: [to], subject, text }),
        signal: AbortSignal.timeout(10_000)
      });
      if (!response.ok) {
        throw new Error('resend_delivery_failed');
      }
      const result = await response.json();
      if (typeof result?.id !== 'string') throw new Error('resend_invalid_response');
      return { id: result.id };
    }
  };
}
