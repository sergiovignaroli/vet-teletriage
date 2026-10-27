import nodemailer, { type Transporter } from "nodemailer";

// Correo saliente por SMTP — sirve igual con una cuenta de Gmail (con
// contraseña de aplicación) que con Resend, Brevo, etc. Para que los mails no
// caigan en spam hace falta un dominio propio con SPF/DKIM; hasta entonces
// puede usarse Gmail, sabiendo que es solo para volúmenes chicos.
//   SMTP_HOST, SMTP_PORT (587 por defecto), SMTP_USER, SMTP_PASS, EMAIL_FROM
export function emailConfigurado(): boolean {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporte: Transporter | null = null;

export async function enviarEmail(params: { para: string; asunto: string; texto: string }): Promise<void> {
  if (!emailConfigurado()) throw new Error("SMTP no configurado");
  if (!transporte) {
    const puerto = Number(process.env.SMTP_PORT || 587);
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: puerto,
      secure: puerto === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  await transporte.sendMail({
    from: process.env.EMAIL_FROM || process.env.SMTP_USER,
    to: params.para,
    subject: params.asunto,
    text: params.texto,
  });
}
