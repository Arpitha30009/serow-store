
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { escapeEmailHtml } from "@/lib/email";
import { sendCustomerEmail } from "@/lib/customer-email";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

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

    const safeOrderId = escapeEmailHtml(orderId);
    const customerName =
      typeof user.user_metadata?.full_name === "string"
        ? user.user_metadata.full_name
        : "Customer";

    const safeName = escapeEmailHtml(customerName);
    const safeEmail = escapeEmailHtml(user.email);

    // Customer cancellation confirmation.
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
          <p>For questions, contact
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

    // Admin cancellation notification through SEROW Gmail SMTP.
    const adminEmail =
      process.env.ADMIN_NOTIFICATION_EMAIL?.trim();

    const adminEmailTask = adminEmail
      ? sendCustomerEmail({
          to: adminEmail,
          subject: `SEROW Admin Alert — Order Cancelled`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:25px;color:#292820">
              <h2>SEROW — Order Cancellation</h2>
              <p>A customer has cancelled an order.</p>
              <p><strong>Order ID:</strong> ${safeOrderId}</p>
              <p><strong>Customer:</strong> ${safeName}</p>
              <p><strong>Customer email:</strong> ${safeEmail}</p>
              <p><strong>Status:</strong> Cancelled</p>
            </div>
          `,
          text: `SEROW order cancelled.

Order ID: ${orderId}
Customer: ${customerName}
Customer email: ${user.email}
Status: Cancelled`,
        })
      : Promise.resolve(false);

    const [customerEmailSent, adminEmailSent] =
      await Promise.all([
        customerEmailTask,
        adminEmailTask,
      ]);

    if (!customerEmailSent) {
      console.error("Customer cancellation email was not sent.");
    }

    if (!adminEmailSent) {
      console.error("Admin cancellation email was not sent.");
    }

    return NextResponse.json({
      result: data,
      customerEmailSent,
      adminEmailSent,
    });
  } catch (error) {
    console.error("Unexpected cancellation error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
