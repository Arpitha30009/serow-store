
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendSerowEmail, escapeEmailHtml } from "@/lib/email";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: "Please sign in before placing your order." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const customerName = String(body.customer_name ?? "").trim();
    const customerEmail = String(body.customer_email ?? "").trim();
    const customerPhone = String(body.customer_phone ?? "").trim();
    const shippingAddress = String(body.shipping_address ?? "").trim();
    const items = body.items;

    if (
      !customerName ||
      !customerEmail ||
      !customerPhone ||
      !shippingAddress
    ) {
      return NextResponse.json(
        { error: "Please complete all delivery details." },
        { status: 400 }
      );
    }

    if (
      customerEmail.toLowerCase() !== user.email.toLowerCase()
    ) {
      return NextResponse.json(
        { error: "Your email must match your signed-in account." },
        { status: 403 }
      );
    }

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Your cart is empty." },
        { status: 400 }
      );
    }

    const safeItems = items.map((item: {
      product_id?: unknown;
      color_id?: unknown;
      size?: unknown;
      quantity?: unknown;
    }) => ({
      product_id: item.product_id,
      color_id: item.color_id,
      size: item.size,
      quantity: item.quantity,
    }));

    const { data, error } = await supabase.rpc("place_cod_order", {
      p_customer_name: customerName,
      p_customer_email: user.email,
      p_customer_phone: customerPhone,
      p_shipping_address: shippingAddress,
      p_items: safeItems,
    });

    if (error) {
      console.error("Checkout error:", error.message);

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    
    const orderId = String(data?.order_id ?? "");
    const totalPaise = Number(data?.total_paise ?? 0);
    const formattedTotal = `₹${(totalPaise / 100).toFixed(2)}`;

    const safeName = escapeEmailHtml(customerName);
    const safeOrderId = escapeEmailHtml(orderId);
    const safePhone = escapeEmailHtml(customerPhone);
    const safeAddress = escapeEmailHtml(shippingAddress);

    const emailTasks = [
      sendSerowEmail({
        to: user.email,
        subject: `SEROW Order Confirmed — ${orderId}`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;color:#29261f">
            <h1 style="letter-spacing:5px">SEROW</h1>
            <h2>Thank you for your order, ${safeName}!</h2>
            <p>Your order has been placed successfully.</p>
            <p><strong>Order ID:</strong> ${safeOrderId}</p>
            <p><strong>Total:</strong> ${formattedTotal}</p>
            <p><strong>Payment:</strong> Cash on Delivery</p>
            <p><strong>Status:</strong> Pending</p>
            <p>We'll notify you when your order status changes.</p>
            <p>Thank you for shopping with SEROW.</p>
          </div>
        `,
        text: `Thank you for shopping with SEROW, ${customerName}. Order: ${orderId}. Total: ${formattedTotal}. Payment: Cash on Delivery. Status: Pending.`,
      }),
    ];

    const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL?.trim();

    if (adminEmail) {
      emailTasks.push(
        sendSerowEmail({
          to: adminEmail,
          subject: `New SEROW Order — ${orderId}`,
          html: `
            <div style="font-family:Arial,sans-serif;padding:25px">
              <h1>New SEROW Order</h1>
              <p><strong>Order ID:</strong> ${safeOrderId}</p>
              <p><strong>Customer:</strong> ${safeName}</p>
              <p><strong>Email:</strong> ${escapeEmailHtml(user.email)}</p>
              <p><strong>Phone:</strong> ${safePhone}</p>
              <p><strong>Address:</strong> ${safeAddress}</p>
              <p><strong>Total:</strong> ${formattedTotal}</p>
              <p><strong>Payment:</strong> Cash on Delivery</p>
            </div>
          `,
          text: `New SEROW order ${orderId}. Customer: ${customerName}. Email: ${user.email}. Phone: ${customerPhone}. Address: ${shippingAddress}. Total: ${formattedTotal}.`,
        })
      );
    }

    await Promise.all(emailTasks);

    return NextResponse.json({ order: data });

  } catch (error) {
    console.error("Unexpected checkout error:", error);

    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
