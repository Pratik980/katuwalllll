import nodemailer from 'nodemailer';

export const sendOtpEmail = async ({ email, name, code, purpose }) => {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM || user;

  if (!host || !user || !pass || !from || !Number.isInteger(port)) {
    throw new Error('Email delivery is not configured. Configure SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD and SMTP_FROM.');
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
  });
  const isSignup = purpose === 'signup';

  await transporter.sendMail({
    from,
    to: email,
    subject: isSignup ? 'Verify your Katuwal Banshabatika account' : 'Reset your Katuwal Banshabatika password',
    text: `Hello ${name || 'there'},\n\nYour verification code is ${code}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
    html: `<p>Hello ${name || 'there'},</p><p>Your verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
  });
};
