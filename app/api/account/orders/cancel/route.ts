
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSerowEmail, escapeEmailHtml } from "@/lib/email";
import { sendCustomerEmail } from "@/lib/customer-email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify customer session.
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: "Please sign in to cancel your order." },
        { status: 401 }
      );
    }

    // Read and validate order ID.
    let body: { orderId?: unknown };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const orderId = body.orderId;

    if (
      typeof orderId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
    ) {
      return NextResponse.json(
        { error: "A valid order ID is required." },
        { status: 400 }
      );
    }

    // Database function verifies ownership and restores stock.
    const { data, error } = await supabase.rpc(
      "cancel_customer_order",
      { p_order_id: orderId }
    );

    if (error) {
      console.error("Order cancellation error:", error.message);

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Prepare safe email details.
    const safeOrderId = escapeEmailHtml(orderId);
    const customerName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "Customer";

    const safeName = escapeEmailHtml(customerName);
    const safeEmail = escapeEmailHtml(user.email);

    const customerEmailTask = sendCustomerEmail({
      to: user.email,
      subject: `SEROW Order Cancelled — ${orderId}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#292820;line-height:1.6">
          <h2 style="letter-spacing:3px">SEROW</h2>
          <h3>Your order has been cancelled</h3>
          <p>Hello ${safeName},</p>
          <p>Your SEROW order cancellation has been processed successfully.</p>
          <div style="background:#f5f2ec;padding:20px;border-radius:8px">
            <p><strong>Order ID:</strong> ${safeOrderId}</p>
            <p><strong>Status:</strong> Cancelled</p>
          </div>
          <p>If you have any questions, please contact
          <a href="mailto:serow.support@gmail.com">serow.support@gmail.com</a>.</p>
          <p>Thank you,<br/>Team SEROW</p>
        </div>
      `,
      text: `Hello ${customerName},

Your SEROW order cancellation has been processed successfully.

Order ID: ${orderId}
Status: Cancelled

For questions, contact serow.support@gmail.com.

Thank you,
Team SEROW`,
    });

    // Notify admin through the existing Resend email service.
    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();

    const adminEmailTask = adminEmail
      ? sendSerowEmail({
          to: adminEmail,
          subject: `SEROW Order Cancelled — ${orderId}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:25px">
              <h2>SEROW — Order Cancellation</h2>
              <p><strong>Order ID:</strong> ${safeOrderId}</p>
              <p><strong>Customer:</strong> ${safeName}</p>
              <p><strong>Customer email:</strong> ${safeEmail}</p>
              <p><strong>Status:</strong> Cancelled</p>
            </div>
          `,
          text: `SEROW order cancelled. Order ID: ${orderId}. Customer: ${customerName}. Email: ${user.email}.`,
        })
      : Promise.resolve();

    const [customerEmailSent] = await Promise.all([
      customerEmailTask,
      adminEmailTask,
    ]);

    if (!customerEmailSent) {
      console.error("Cancellation succeeded, but customer email was not sent.");
    }

    return NextResponse.json({
      result: data,
      customerEmailSent,
    });
  } catch (error) {
    console.error("Unexpected cancellation error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
