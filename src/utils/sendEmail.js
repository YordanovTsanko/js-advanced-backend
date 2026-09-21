import nodemailer from "nodemailer";

const sendEmail = (options) => {
  const transporter = nodemailer.createTransport({
    host: String(process.env.SMTP_HOST || "sandbox.smtp.mailtrap.io"),
    port: Number(process.env.SMTP_PORT) || 2525,
    auth: {
      user: String(process.env.SMTP_USER || "74b74408257584"), // Подсигуряваме като текст
      pass: String(process.env.SMTP_PASS || "bef3003cfea824"),
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || "no-reply@example.com",
    to: options.to,
    subject: options.subject,
    text: options.text,
    html: options.html, // Оставете го, nodemailer го поддържа перфектно!
  };

  // Използваме callback функцията точно както е в документацията им
  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      return console.error("Грешка при пращане на имейл:", error.message);
    }
    console.log("Имейлът е изпратен успешно до Mailtrap! ID: %s", info.messageId);
  });
};

export default sendEmail;
