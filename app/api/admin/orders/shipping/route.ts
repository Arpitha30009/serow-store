
import { NextResponse } from "next/server";
import { createAdminServerClient } from "@/lib/supabase/admin-server";
import { sendSerowEmail, escapeEmailHtml } from "@/lib/email";

export const dynamic = "force-dynamic";

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

export async function POST(request: Request) {
  const { supabase, response } = await getAuthorizedAdmin();

  if (response || !supabase) {
    return response!;
  }

  let body: {
    orderId?: string;
    courierName?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { orderId } = body;
  const courierName = body.courierName?.trim() || "";
  const trackingNumber = body.trackingNumber?.trim() || "";
  const trackingUrl = body.trackingUrl?.trim() || "";

  if (
    !orderId ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId)
  ) {
    return NextResponse.json(
      { error: "A valid order ID is required." },
      { status: 400 }
    );
  }

  if (!courierName || !trackingNumber) {
    return NextResponse.json(
      { error: "Courier name and tracking number are required." },
      { status: 400 }
    );
  }

  if (courierName.length > 100 || trackingNumber.length > 150) {
    return NextResponse.json(
      { error: "Courier name or tracking number is too long." },
      { status: 400 }
    );
  }

  if (trackingUrl) {
    try {
      const parsedUrl = new URL(trackingUrl);

      if (!["http:", "https:"].includes(parsedUrl.protocol)) {
        throw new Error("Invalid protocol");
      }
    } catch {
      return NextResponse.json(
        { error: "Please enter a valid tracking URL." },
        { status: 400 }
      );
    }
  }

  // Get the order and its previous shipping details.
  const { data: orderBefore, error: lookupError } = await supabase
    .from("orders")
    .select(
      "id, customer_name, customer_email, status, courier_name, tracking_number, tracking_url"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (lookupError) {
    console.error("Order lookup error:", lookupError.message);

    return NextResponse.json(
      { error: "Unable to find the order." },
      { status: 500 }
    );
  }

  if (!orderBefore) {
    return NextResponse.json(
      { error: "Order not found." },
      { status: 404 }
    );
  }

  if (orderBefore.status === "cancelled") {
    return NextResponse.json(
      { error: "Cannot add shipping details to a cancelled order." },
      { status: 409 }
    );
  }

  // Save the shipping details.
  const { data, error } = await supabase
    .from("orders")
    .update({
      courier_name: courierName,
      tracking_number: trackingNumber,
      tracking_url: trackingUrl || null,
    })
    .eq("id", orderId)
    .neq("status", "cancelled")
    .select("id, courier_name, tracking_number, tracking_url")
    .maybeSingle();

  if (error) {
    console.error("Shipping details update error:", error.message);

    return NextResponse.json(
      { error: "Unable to save shipping details." },
      { status: 500 }
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: "Shipping details were not saved. Please check the order status." },
      { status: 409 }
    );
  }

  // Send an email only when the shipping details have changed.
  const shippingChanged =
    orderBefore.courier_name !== data.courier_name ||
    orderBefore.tracking_number !== data.tracking_number ||
    (orderBefore.tracking_url || null) !== (data.tracking_url || null);

  if (shippingChanged && orderBefore.customer_email) {
    const safeName = escapeEmailHtml(orderBefore.customer_name || "Customer");
    const safeOrderId = escapeEmailHtml(orderId);
    const safeCourier = escapeEmailHtml(data.courier_name);
    const safeTrackingNumber = escapeEmailHtml(data.tracking_number);
    const safeTrackingUrl = escapeEmailHtml(data.tracking_url || "");

    await sendSerowEmail({
      to: orderBefore.customer_email,
      subject: `Your SEROW order has been shipped — ${orderId}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;color:#292820;line-height:1.6">
          <h2 style="letter-spacing:3px">SEROW</h2>
          <h3>Your order is on its way!</h3>
          <p>Hello ${safeName},</p>
          <p>Your SEROW order has shipping details. You can use the information below to track your package.</p>
          <div style="background:#f5f2ec;padding:20px;border-radius:8px">
            <p><strong>Order ID:</strong> ${safeOrderId}</p>
            <p><strong>Courier:</strong> ${safeCourier}</p>
            <p><strong>Tracking number:</strong> ${safeTrackingNumber}</p>
            ${
              safeTrackingUrl
                ? `<p><a href="${safeTrackingUrl}" style="display:inline-block;background:#292820;color:#ffffff;padding:12px 20px;text-decoration:none;border-radius:4px">Track Your Order</a></p>`
                : ""
            }
          </div>
          <p>Thank you for shopping with SEROW.</p>
          <p>Warm regards,<br/>Team SEROW</p>
        </div>
      `,
      text: `Hello ${orderBefore.customer_name || "Customer"},

Your SEROW order has shipping details.

Order ID: ${orderId}
Courier: ${data.courier_name}
Tracking number: ${data.tracking_number}
${data.tracking_url ? `Track your order: ${data.tracking_url}` : ""}

Thank you for shopping with SEROW.
Team SEROW`,
    });
  }

  return NextResponse.json({
    message: "Shipping details saved successfully.",
    order: data,
  });
}
