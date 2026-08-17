// Without RESEND_API_KEY the link is logged to the server console,
// which is the intended mode for local development.
export async function sendMagicLinkEmail(to: string, url: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[dev-mailer] Enlace de acceso para ${to}: ${url}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Colombia Sigue <no-reply@example.com>",
      to,
      subject: "Tu enlace de acceso",
      text:
        `Hola,\n\nUsa este enlace para ingresar a la plataforma de aportes:\n\n${url}\n\n` +
        `El enlace expira en 15 minutos y solo puede usarse una vez.\n\n` +
        `Si no solicitaste este acceso, puedes ignorar este correo.`,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email delivery failed with status ${response.status}`);
  }
}
