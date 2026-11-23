import nodemailer from 'nodemailer';

const getSmtpConfig = () => {
  const host = process.env.EMAIL_HOST || process.env.SMTP_HOST;
  const port = Number(process.env.EMAIL_PORT || process.env.SMTP_PORT || 587);
  const user = process.env.EMAIL_USER || process.env.SMTP_USER;
  const pass = process.env.EMAIL_PASSWORD || process.env.SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM || process.env.SMTP_FROM || user;
  const secure = (process.env.EMAIL_SECURE || process.env.SMTP_SECURE) === 'true' || port === 465;
  const configured = Boolean(host && user && pass && from && Number.isInteger(port));
  return { host, port, user, pass, from, secure, configured };
};

const getFormSubmitConfig = () => {
  const endpoint = (process.env.FORMSUBMIT_ENDPOINT || '').trim();
  const email = (process.env.FORMSUBMIT_EMAIL || '').trim();
  const enabled = process.env.EMAIL_PROVIDER === 'formsubmit' || Boolean(endpoint || email);
  if (!enabled) return { enabled: false };
  const url = endpoint || (email ? `https://formsubmit.co/ajax/${encodeURIComponent(email)}` : '');
  return { enabled: Boolean(url), url };
};

const canDeliver = () => {
  const smtp = getSmtpConfig();
  const formsubmit = getFormSubmitConfig();
  return Boolean(smtp.configured || formsubmit.enabled);
};

const createTransporter = (config) => nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: config.secure,
  auth: { user: config.user, pass: config.pass },
});

const deliverViaFormSubmit = async ({ to, subject, text, html }) => {
  const config = getFormSubmitConfig();
  if (!config.enabled) throw new Error('FormSubmit delivery is not configured.');

  const body = {
    _subject: subject,
    _captcha: 'false',
    _template: 'table',
    intended_recipient: to,
    subject,
    message: text,
    html,
  };

  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    throw new Error(`FormSubmit request failed (${response.status})${details ? `: ${details.slice(0, 200)}` : ''}`);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  // FormSubmit may require activation/confirmation for the target inbox; treat explicit failure as failure.
  if (payload && payload.success === 'false') {
    throw new Error(payload.message || 'FormSubmit did not accept the delivery request.');
  }

  return { delivered: true, provider: 'formsubmit', payload };
};

const deliver = async ({ to, subject, text, html, devLog }) => {
  if (!canDeliver()) {
    console.warn(devLog || `[authEmail] SMTP/email provider is not configured. Delivery skipped for ${to}: ${subject}`);
    return { delivered: false, unconfigured: true };
  }

  const formsubmit = getFormSubmitConfig();
  if (formsubmit.enabled) {
    try {
      return await deliverViaFormSubmit({ to, subject, text, html });
    } catch (error) {
      console.error('[email] FormSubmit delivery failed:', error.message);
      const smtp = getSmtpConfig();
      if (!smtp.configured) {
        return { delivered: false, error: error.message };
      }
      // Fall through to SMTP if configured
    }
  }

  const smtp = getSmtpConfig();
  if (smtp.configured) {
    try {
      const transporter = createTransporter(smtp);
      await transporter.sendMail({ from: smtp.from, to, subject, text, html });
      return { delivered: true, provider: 'smtp' };
    } catch (smtpError) {
      console.error('[email] SMTP delivery failed:', smtpError.message);
      return { delivered: false, error: smtpError.message };
    }
  }

  console.warn(devLog || `[authEmail] No email provider delivered to ${to}: ${subject}`);
  return { delivered: false };
};

export const sendOtpEmail = async ({ email, name, code, purpose }) => {
  const isSignup = purpose === 'signup';
  const subject = isSignup ? 'Verify your Katuwal Banshabatika account' : 'Reset your Katuwal Banshabatika password';
  const action = isSignup ? 'verify your account' : 'reset your password';
  const text = `Hello ${name || 'there'},\n\nYour verification code to ${action} is ${code}.\nIt expires in 10 minutes. If you did not request this, you can ignore this email.`;
  const html = `<p>Hello ${name || 'there'},</p><p>Your verification code to ${action} is <strong style="font-size:18px;letter-spacing:2px">${code}</strong>.</p><p>It expires in 10 minutes. If you did not request this, you can ignore this email.</p>`;
  return await deliver({
    to: email,
    subject,
    text,
    html,
    devLog: `[authEmail] Code for ${email} (${purpose}): ${code}`,
  });
};

export const sendStaffAccountEmail = async ({ email, name, password, loginUrl }) => {
  const url = loginUrl || process.env.FRONTEND_URL || 'the application';
  const subject = 'Your Katuwal Banshabatika staff account';
  const text = `Hello ${name || 'there'},\n\nA staff account has been created for you.\n\nLogin: ${email}\nTemporary password: ${password}\nSign in: ${url}\n\nFor security, you must change your password after signing in.`;
  const html = `<p>Hello ${name || 'there'},</p><p>A staff account has been created for you.</p><p><strong>Login:</strong> ${email}<br/><strong>Temporary password:</strong> ${password}</p><p><strong>Sign in:</strong> ${typeof loginUrl === 'string' && loginUrl.startsWith('http') ? `<a href="${loginUrl}">${loginUrl}</a>` : url}</p><p>For security, you must change your password after signing in.</p>`;
  await deliver({
    to: email,
    subject,
    text,
    html,
    devLog: `[dev] Staff account email for ${email}: temporary password [REDACTED], login ${url}`,
  });
};

export const sendPasswordResetConfirmationEmail = async ({ email, name }) => {
  const subject = 'Your Katuwal Banshabatika password was changed';
  const text = `Hello ${name || 'there'},\n\nYour password was changed successfully. If this was not you, contact an administrator immediately.`;
  const html = `<p>Hello ${name || 'there'},</p><p>Your password was changed successfully.</p><p>If this was not you, contact an administrator immediately.</p>`;
  await deliver({
    to: email,
    subject,
    text,
    html,
    devLog: `[dev] Password reset/changed confirmation for ${email}`,
  });
};

export const sendAuthNotificationEmail = async ({ email, name, subject, message }) => {
  const safeSubject = subject || 'Katuwal Banshabatika account notification';
  const text = `Hello ${name || 'there'},\n\n${message}`;
  const html = `<p>Hello ${name || 'there'},</p><p>${message}</p>`;
  await deliver({ to: email, subject: safeSubject, text, html });
};
