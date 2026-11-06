
import * as nodemailer from "nodemailer";

type CustomerEmailDetails = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendCustomerEmail({
  to,
  subject,
  html,
  text,
}: CustomerEmailDetails): Promise<boolean> {
  const gmailUser = process.env.GMAIL_USER?.trim();
  const gmailPassword = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");

  if (!gmailUser || !gmailPassword) {
    console.error("Customer email not sent: Gmail credentials are missing.");
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: gmailUser,
        pass: gmailPassword,
      },
    });

    const result = await transporter.sendMail({
      from: `SEROW <${gmailUser}>`,
      to,
      subject,
      html,
      text,
    });

    console.log("SEROW customer email sent:", result.messageId);
    return true;
  } catch (error) {
    console.error(
      "SEROW customer email failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

