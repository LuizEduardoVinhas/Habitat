import nodemailer from 'nodemailer';
import site from '../config/site.js';
import { fmtDayYear, fmtTime } from '../utils/view-helpers.js';

const requiredSmtpSettings = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

export async function notifyTeacherOfAppointment({ appointment, area, studentName, guardian }) {
  const missingSettings = requiredSmtpSettings.filter((name) => !process.env[name]);
  if (missingSettings.length) {
    return { status: 'not_configured' };
  }

  const port = Number(process.env.SMTP_PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('SMTP_PORT must be a valid TCP port.');
  }

  const recipient = process.env.APPOINTMENT_NOTIFICATION_EMAIL || site.email;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: recipient,
    subject: `Nova solicitação de aula avaliativa • ${studentName}`,
    text: [
      'Uma nova solicitação de aula avaliativa foi recebida no Habitat.',
      '',
      `Estudante: ${studentName}`,
      `Responsável/contato: ${guardian}`,
      `Área: ${area.name}`,
      `Data: ${fmtDayYear(appointment.start_time)}`,
      `Horário: ${fmtTime(appointment.start_time)} (Recife)`,
      'Status: Pendente de confirmação',
      `Protocolo: ${appointment.protocol}`,
    ].join('\n'),
  });

  return { status: 'sent' };
}
