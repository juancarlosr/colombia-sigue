// Without RESEND_API_KEY the message is logged to the server console,
// which is the intended mode for local development.
async function sendEmail(to: string, subject: string, text: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(`[dev-mailer] Para ${to} — ${subject}:\n${text}`);
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
      subject,
      text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Email delivery failed with status ${response.status}`);
  }
}

export async function sendMagicLinkEmail(to: string, url: string): Promise<void> {
  await sendEmail(
    to,
    "Tu enlace de acceso",
    `Hola,\n\nUsa este enlace para ingresar a la plataforma de aportes:\n\n${url}\n\n` +
      `El enlace expira en 15 minutos y solo puede usarse una vez.\n\n` +
      `Si no solicitaste este acceso, puedes ignorar este correo.`,
  );
}

export async function sendCompanyVerificationEmail(to: string, url: string): Promise<void> {
  await sendEmail(
    to,
    "Verifica la solicitud de tu empresa — Colombia Sigue",
    `Hola,\n\nRecibimos la solicitud de inscripción de tu empresa en Colombia Sigue.\n\n` +
      `Confirma este correo para completarla:\n\n${url}\n\n` +
      `Después de la verificación revisaremos la solicitud y te contactaremos.\n\n` +
      `Si no fuiste tú, ignora este correo.`,
  );
}

export async function sendCompanyWelcomeEmail(
  to: string,
  url: string,
  companyName: string,
): Promise<void> {
  await sendEmail(
    to,
    `${companyName} fue aprobada en Colombia Sigue`,
    `¡Bienvenidos!\n\nLa solicitud de ${companyName} fue aprobada.\n\n` +
      `Ingresa a tu panel de administración con este enlace (personal, expira en 7 días):\n\n${url}\n\n` +
      `Primer paso: importa la lista de tu equipo (CSV con nombre, documento y correo) y envía las invitaciones.`,
  );
}

export async function sendInvitationEmail(
  to: string,
  url: string,
  companyName: string,
  foundationName: string,
): Promise<void> {
  await sendEmail(
    to,
    `${companyName} te invita a aportar desde tu nómina`,
    `Hola,\n\n${companyName} se unió a ${foundationName} para facilitar aportes mensuales ` +
      `voluntarios desde la nómina.\n\nNo necesitas tarjeta y puedes detener tu aporte cuando ` +
      `quieras.\n\nIngresa aquí para participar:\n\n${url}\n\n` +
      `El enlace es personal y expira en 7 días. Si no te interesa, puedes ignorar este correo.`,
  );
}
