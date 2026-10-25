import 'dotenv/config';
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// const info = await transporter.sendMail({
//   to: 'mohawow382@goldvester.com',
//   subject: 'Hello',
//   text: 'Hello world?',
//   html: '<b>Hello world?</b>',
// });

export function send({ email, subject, html }) {
  return transporter.sendMail({
    to: email,
    subject,
    html,
  });
}

function sendActivationEmail(email, token) {
  const href = `${process.env.CLIENT_HOST}/activate/${token}`;

  const html = `
    <h1>Activate account</h1>
    <a href="${href}">${href}</a>
  `;

  return send({
    email,
    html,
    subject: 'Activate',
  });
}

function sendResetPassword(email, token) {
  const href = `${process.env.CLIENT_HOST}/reset-password/${token}`;

  const html = `
    <h1>Reset password for account</h1>
    <a href="${href}">${href}</a>
  `;

  return send({
    email,
    html,
    subject: 'Reset password',
  });
}

function sendNotificationOnOldEmail(email) {
  return send({
    email,
    subject: 'Someone was change an email on acount, is it your?',
  });
}
export const emailService = {
  sendActivationEmail,
  sendResetPassword,
  send,
  sendNotificationOnOldEmail
};
