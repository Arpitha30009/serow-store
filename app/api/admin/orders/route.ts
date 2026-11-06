
import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin-server";
import { sendSerowEmail, escapeEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

async function getAuthorizedAdmin() {
  const supabase = await createAdminServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      supabase: null,
      response: NextResponse.json(
        { error: "Please sign in as an admin." },
        { status: 401 }
      ),
    };
  }

  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (adminError || !admin) {
    return {
      supabase: null,
      response: NextResponse.json(
        { error: "You are not authorized to manage orders." },
        { status: 403 }
      ),
    };
  }

  return { supabase, response: null };
}

export async function GET() {
  const { supabase, response } = await getAuthorizedAdmin();

  if (response || !supabase) {
    return response!;
  }

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(*), order_status_history(*)")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Admin orders fetch error:", error.message);

    return NextResponse.json(
      { error: "Unable to load orders. Check your database permissions." },
      { status: 500 }
    );
  }

  return NextResponse.json({ orders: data ?? [] });
}

export async function PATCH(request: Request) {
  const { supabase, response } = await getAuthorizedAdmin();

  if (response || !supabase) {
    return response!;
  }

  let body: { orderId?: string; status?: string };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const orderId = body.orderId;
  const status = body.status?.toLowerCase();

  if (
    !orderId ||
    typeof orderId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
  ) {
    return NextResponse.json(
      { error: "A valid order ID is required." },
      { status: 400 }
    );
  }

  if (!status || !ALLOWED_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Invalid order status." },
      { status: 400 }
    );
  }

  // Fetch existing order details before changing its status.
  const { data: orderForEmail, error: lookupError } = await supabase
    .from("orders")
    .select("id, customer_name, customer_email, status")
    .eq("id", orderId)
    .maybeSingle();

  if (lookupError) {
    console.error("Order lookup error:", lookupError.message);

    return NextResponse.json(
      { error: "Unable to retrieve order details." },
      { status: 500 }
    );
  }

  if (!orderForEmail) {
    return NextResponse.json(
      { error: "Order not found." },
      { status: 404 }
    );
  }

  // Handle cancellation using the existing secure database function.
  if (status === "cancelled") {
    const { data: cancellationResult, error: cancellationError } =
      await supabase.rpc("cancel_admin_order", {
        p_order_id: orderId,
      });

    if (cancellationError) {
      console.error(
        "Admin order cancellation error:",
        cancellationError.message
      );

      return NextResponse.json(
        { error: cancellationError.message },
        { status: 400 }
      );
    }

    if (orderForEmail.customer_email) {
      await sendSerowEmail({
        to: orderForEmail.customer_email,
        subject: `SEROW Order Cancelled — ${orderId}`,
        html: `
          <div style="font-family:Arial,sans-serif;padding:25px;color:#29261f">
            <h1>SEROW</h1>
            <h2>Order cancelled</h2>
            <p>Hello ${escapeEmailHtml(orderForEmail.customer_name)},</p>
            <p>Your order <strong>${escapeEmailHtml(orderId)}</strong> has been cancelled.</p>
            <p>We hope to serve you again.</p>
          </div>
        `,
        text: `Hello ${orderForEmail.customer_name}, your SEROW order ${orderId} has been cancelled.`,
      });
    }

    return NextResponse.json({
      order: {
        id: orderId,
        status: "cancelled",
      },
      result: cancellationResult,
    });
  }

  // Never allow a cancelled order to become active again.
  const { data: updatedOrder, error: updateError } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", orderId)
    .neq("status", "cancelled")
    .select("id, status")
    .maybeSingle();

  if (updateError) {
    console.error("Admin order update error:", updateError.message);

    return NextResponse.json(
      {
        error:
          "Unable to update order status. Check your database permissions.",
      },
      { status: 500 }
    );
  }

  if (!updatedOrder) {
    const { data: existingOrder, error: existingOrderError } =
      await supabase
        .from("orders")
        .select("id, status")
        .eq("id", orderId)
        .maybeSingle();

    if (existingOrderError) {
      return NextResponse.json(
        { error: "Unable to verify the order status." },
        { status: 500 }
      );
    }

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Order not found." },
        { status: 404 }
      );
    }

    if (existingOrder.status === "cancelled") {
      return NextResponse.json(
        { error: "Cancelled orders cannot be reopened or updated." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Order status was not updated." },
      { status: 400 }
    );
  }

  // Send email only when the status actually changes.
  if (
    orderForEmail.customer_email &&
    orderForEmail.status !== updatedOrder.status
  ) {
    const statusLabels: Record<string, string> = {
      pending: "Pending",
      processing: "Being Prepared",
      shipped: "Shipped",
      delivered: "Delivered",
    };

    const statusLabel =
      statusLabels[updatedOrder.status] || updatedOrder.status;

    await sendSerowEmail({
      to: orderForEmail.customer_email,
      subject: `SEROW Order Update — ${statusLabel}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;color:#29261f">
          <h1 style="letter-spacing:5px">SEROW</h1>
          <h2>Your order status has been updated!</h2>
          <p>Hello ${escapeEmailHtml(orderForEmail.customer_name)},</p>
          <p>Your order <strong>${escapeEmailHtml(orderId)}</strong> is now:</p>
          <h2>${escapeEmailHtml(statusLabel)}</h2>
          <p>Thank you for shopping with SEROW.</p>
        </div>
      `,
      text: `Hello ${orderForEmail.customer_name}, your SEROW order ${orderId} is now ${statusLabel}.`,
    });
  }

  return NextResponse.json({ order: updatedOrder });
}
