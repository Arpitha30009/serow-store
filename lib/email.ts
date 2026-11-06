import { Resend } from "resend";

type EmailDetails = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendSerowEmail({
  to,
  subject,
  html,
  text,
}: EmailDetails) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error("Email not sent: RESEND_API_KEY is missing.");
    return false;
  }

  try {
    const resend = new Resend(apiKey);

    const { data, error } = await resend.emails.send({
      from:
        process.env.RESEND_FROM_EMAIL ||
        "SEROW <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
      text,
    });

    if (error) {
      console.error("SEROW email error:", error.message);
      return false;
    }

    console.log("SEROW email sent:", data?.id);
    return true;
  } catch (error) {
    console.error("SEROW email failed:", error);
    return false;
  }
}

export function escapeEmailHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}
