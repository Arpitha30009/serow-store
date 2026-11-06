
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type OrderItem = {
  id: string;
  product_name: string;
  size: string;
  color: string;
  quantity: number;
  unit_price_paise: number;
  variant_id: string;
};

type OrderStatusHistory = {
  id: string;
  previous_status: string | null;
  new_status: string;
  changed_at: string;
};

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: unknown;
  total_paise: number;
  status: string;
  courier_name: string | null;
  tracking_number: string | null;
  tracking_url: string | null;
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string;
  order_items: OrderItem[];
  order_status_history?: OrderStatusHistory[];
};

const STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

function formatPrice(paise: number) {
  return (Number(paise || 0) / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function readableStatus(status: string) {
  if (!status) return "Pending";

  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function formatAddress(address: unknown): string {
  if (!address) return "No shipping address provided";

  if (typeof address === "string") {
    try {
      return formatAddress(JSON.parse(address));
    } catch {
      return address;
    }
  }

  if (typeof address === "object") {
    return Object.entries(address as Record<string, unknown>)
      .filter(
        ([, value]) =>
          value !== null && value !== undefined && value !== ""
      )
      .map(([key, value]) => {
        const label = key
          .replace(/_/g, " ")
          .replace(/\b\w/g, (letter) => letter.toUpperCase());

        return `${label}: ${
          typeof value === "object" ? JSON.stringify(value) : String(value)
        }`;
      })
      .join("\n");
  }

  return String(address);
}

function statusColor(status: string) {
  switch (status.toLowerCase()) {
    case "delivered":
      return { color: "#286b45", background: "#e8f4eb" };
    case "shipped":
      return { color: "#315d83", background: "#eaf2fa" };
    case "processing":
      return { color: "#85651e", background: "#f8f0d9" };
    case "cancelled":
      return { color: "#a12d25", background: "#fbe9e7" };
    default:
      return { color: "#6b6255", background: "#eee9df" };
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [savingOrderId, setSavingOrderId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const [shippingOrderId, setShippingOrderId] = useState<string | null>(null);
  const [courierName, setCourierName] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [savingShipping, setSavingShipping] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/orders", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to load orders.");
      }

      setOrders(result.orders ?? []);

      setSelectedOrder((previous) => {
        if (!previous) return null;

        return (
          (result.orders ?? []).find(
            (order: Order) => order.id === previous.id
          ) ?? null
        );
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  async function updateStatus(orderId: string, newStatus: string) {
    if (!STATUSES.includes(newStatus)) {
      setError("Please select a valid order status.");
      return;
    }

    const previousOrder = orders.find((order) => order.id === orderId);

    if (!previousOrder || previousOrder.status.toLowerCase() === newStatus) {
      return;
    }

    setSavingOrderId(orderId);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          status: newStatus,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Could not update order status.");
      }

      const savedStatus = String(result.order?.status ?? newStatus);

      setOrders((previous) =>
        previous.map((order) =>
          order.id === orderId
            ? { ...order, status: savedStatus }
            : order
        )
      );

      setSelectedOrder((previous) =>
        previous?.id === orderId
          ? { ...previous, status: savedStatus }
          : previous
      );

      setNotice(
        `Order status updated to "${readableStatus(savedStatus)}".`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update order status."
      );
    } finally {
      setSavingOrderId(null);
    }
  }

  async function saveShippingDetails(orderId: string) {
    if (!courierName.trim() || !trackingNumber.trim()) {
      setError("Please enter both courier name and tracking number.");
      return;
    }

    setSavingShipping(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/admin/orders/shipping", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId,
          courierName,
          trackingNumber,
          trackingUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Unable to save shipping details.");
      }

      const savedShipping = result.order;

      setOrders((previous) =>
        previous.map((order) =>
          order.id === orderId
            ? { ...order, ...savedShipping }
            : order
        )
      );

      setSelectedOrder((previous) =>
        previous?.id === orderId
          ? { ...previous, ...savedShipping }
          : previous
      );

      setNotice("Shipping details saved successfully.");
      setShippingOrderId(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save shipping details."
      );
    } finally {
      setSavingShipping(false);
    }
  }

  const filteredOrders = orders.filter((order) => {
    const term = search.trim().toLowerCase();

    const matchesSearch =
      !term ||
      order.id.toLowerCase().includes(term) ||
      (order.customer_name || "").toLowerCase().includes(term) ||
      (order.customer_email || "").toLowerCase().includes(term) ||
      (order.customer_phone || "").toLowerCase().includes(term);

    const matchesStatus =
      statusFilter === "all" ||
      (order.status || "pending").toLowerCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const totalOrderValue = orders.reduce((total, order) => {
    if (order.status?.toLowerCase() === "cancelled") {
      return total;
    }

    return total + (order.total_paise || 0);
  }, 0);

  const cardStyle = {
    background: "#fffdf9",
    border: "1px solid #e5dfd4",
    borderRadius: "8px",
    padding: "18px",
  } as const;

  const inputStyle = {
    padding: "12px",
    border: "1px solid #d6d0c5",
    borderRadius: "5px",
    background: "#fffdf9",
    color: "#171717",
    fontSize: "14px",
    width: "100%",
    boxSizing: "border-box" as const,
  };

  const buttonStyle = {
    padding: "10px 14px",
    background: "#201e1a",
    color: "#d5c29b",
    border: "1px solid #927747",
    borderRadius: "5px",
    cursor: "pointer",
    textDecoration: "none",
    display: "inline-block",
    fontSize: "13px",
  } as const;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7f4ee",
        color: "#201e1a",
        padding: "28px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <Link href="/admin" style={buttonStyle}>
          ← Admin Dashboard
        </Link>

        <header style={{ margin: "28px 0" }}>
          <p
            style={{
              color: "#927747",
              letterSpacing: "3px",
              fontSize: "12px",
            }}
          >
            SEROW · STORE MANAGEMENT
          </p>

          <h1 style={{ fontSize: "32px", marginBottom: "8px" }}>
            Manage Orders
          </h1>

          <p style={{ color: "#686258" }}>
            View customer orders, payment details, and fulfilment status.
          </p>
        </header>

        {error && (
          <div
            role="alert"
            style={{
              ...cardStyle,
              borderColor: "#c65c50",
              color: "#a12d25",
              marginBottom: "18px",
            }}
          >
            <p>{error}</p>

            <button
              onClick={() => void loadOrders()}
              style={buttonStyle}
            >
              Retry
            </button>
          </div>
        )}

        {notice && (
          <div
            role="status"
            style={{
              ...cardStyle,
              color: "#286b45",
              marginBottom: "18px",
              borderColor: "#b9d9c3",
            }}
          >
            {notice}
          </div>
        )}

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
            gap: "14px",
            marginBottom: "24px",
          }}
        >
          <div style={cardStyle}>
            <p style={{ color: "#686258", marginTop: 0 }}>Total orders</p>
            <strong style={{ fontSize: "28px" }}>{orders.length}</strong>
          </div>

          <div style={cardStyle}>
            <p style={{ color: "#686258", marginTop: 0 }}>Pending orders</p>
            <strong style={{ fontSize: "28px" }}>
              {
                orders.filter(
                  (order) =>
                    (order.status || "pending").toLowerCase() === "pending"
                ).length
              }
            </strong>
          </div>

          <div style={cardStyle}>
            <p style={{ color: "#686258", marginTop: 0 }}>Processing orders</p>
            <strong style={{ fontSize: "28px" }}>
              {
                orders.filter(
                  (order) => order.status.toLowerCase() === "processing"
                ).length
              }
            </strong>
          </div>

          <div style={cardStyle}>
            <p style={{ color: "#686258", marginTop: 0 }}>Shipped orders</p>
            <strong style={{ fontSize: "28px" }}>
              {
                orders.filter(
                  (order) => order.status.toLowerCase() === "shipped"
                ).length
              }
            </strong>
          </div>

          <div style={cardStyle}>
            <p style={{ color: "#686258", marginTop: 0 }}>Delivered orders</p>
            <strong style={{ fontSize: "28px" }}>
              {
                orders.filter(
                  (order) => order.status.toLowerCase() === "delivered"
                ).length
              }
            </strong>
          </div>

          <div style={cardStyle}>
            <p style={{ color: "#686258", marginTop: 0 }}>Cancelled orders</p>
            <strong style={{ fontSize: "28px" }}>
              {
                orders.filter(
                  (order) => order.status.toLowerCase() === "cancelled"
                ).length
              }
            </strong>
          </div>

          <div style={cardStyle}>
            <p style={{ color: "#686258", marginTop: 0 }}>
              Total order value
            </p>
            <strong style={{ fontSize: "24px" }}>
              {formatPrice(totalOrderValue)}
            </strong>
            <p style={{ color: "#857d70", fontSize: "12px" }}>
              Excludes cancelled orders; not necessarily collected revenue.
            </p>
          </div>
        </section>

        <section
          style={{
            ...cardStyle,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px",
            marginBottom: "20px",
          }}
        >
          <input
            aria-label="Search orders"
            placeholder="Search order, customer, email or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={inputStyle}
          />

          <select
            aria-label="Filter by order status"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            style={inputStyle}
          >
            <option value="all">All statuses</option>

            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {readableStatus(status)}
              </option>
            ))}
          </select>

          <button
            onClick={() => void loadOrders()}
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Refreshing..." : "Refresh Orders"}
          </button>
        </section>

        {loading ? (
          <div style={cardStyle}>Loading orders...</div>
        ) : orders.length === 0 ? (
          <div
            style={{
              ...cardStyle,
              textAlign: "center",
              padding: "48px 20px",
            }}
          >
            <h2>No orders yet</h2>
            <p style={{ color: "#686258" }}>
              Customer orders will appear here when orders are created in your
              store.
            </p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={cardStyle}>
            No orders match your search or selected status.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "14px" }}>
            {filteredOrders.map((order) => {
              const items = order.order_items ?? [];
              const currentStatus = (order.status || "pending").toLowerCase();
              const colors = statusColor(currentStatus);

              return (
                <article
                  key={order.id}
                  style={{
                    ...cardStyle,
                    display: "grid",
                    gap: "14px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "12px",
                    }}
                  >
                    <div style={{ minWidth: 0, flex: "1 1 250px" }}>
                      <p style={{ color: "#927747", margin: "0 0 6px" }}>
                        ORDER
                      </p>

                      <strong style={{ overflowWrap: "anywhere" }}>
                        {order.id}
                      </strong>

                      <p style={{ color: "#686258", fontSize: "13px" }}>
                        {formatDate(order.created_at)}
                      </p>
                    </div>

                    <div>
                      <strong style={{ fontSize: "20px" }}>
                        {formatPrice(order.total_paise)}
                      </strong>

                      <p style={{ margin: "6px 0", fontSize: "13px" }}>
                        Payment:{" "}
                        {order.razorpay_payment_id
                          ? "Payment ID recorded"
                          : "Not confirmed"}
                      </p>

                      <span
                        style={{
                          display: "inline-block",
                          padding: "6px 10px",
                          borderRadius: "4px",
                          fontSize: "12px",
                          fontWeight: 600,
                          color: colors.color,
                          background: colors.background,
                        }}
                      >
                        {readableStatus(currentStatus)}
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: "18px",
                    }}
                  >
                    <div>
                      <h3 style={{ fontSize: "15px" }}>Customer</h3>
                      <p>{order.customer_name}</p>
                      <p style={{ overflowWrap: "anywhere" }}>
                        {order.customer_email}
                      </p>
                      <p>{order.customer_phone}</p>
                    </div>

                    <div>
                      <h3 style={{ fontSize: "15px" }}>
                        Items ({items.length})
                      </h3>

                      {items.length === 0 ? (
                        <p>No items linked to this order.</p>
                      ) : (
                        items.map((item) => (
                          <p key={item.id} style={{ fontSize: "14px" }}>
                            {item.product_name} · {item.size} · {item.color}
                            <br />
                            Qty: {item.quantity} ×{" "}
                            {formatPrice(item.unit_price_paise)}
                          </p>
                        ))
                      )}
                    </div>

                    <div>
                      <h3 style={{ fontSize: "15px" }}>Shipping address</h3>
                      <p
                        style={{
                          whiteSpace: "pre-wrap",
                          fontSize: "13px",
                          lineHeight: 1.6,
                        }}
                      >
                        {formatAddress(order.shipping_address)}
                      </p>
                    </div>
                  </div>

                  {/* SHIPPING DETAILS */}
                  <div
                    style={{
                      borderTop: "1px solid #e5dfd4",
                      paddingTop: "14px",
                      display: "grid",
                      gap: "12px",
                    }}
                  >
                    <h3 style={{ fontSize: "15px", margin: 0 }}>
                      Shipping Details
                    </h3>

                    {order.courier_name || order.tracking_number ? (
                      <div style={{ fontSize: "13px", lineHeight: 1.8 }}>
                        <p>
                          Courier: {order.courier_name || "Not provided"}
                        </p>
                        <p>
                          Tracking number:{" "}
                          {order.tracking_number || "Not provided"}
                        </p>

                        {order.tracking_url && (
                          <a
                            href={order.tracking_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: "#927747", fontWeight: 600 }}
                          >
                            Track shipment
                          </a>
                        )}
                      </div>
                    ) : (
                      <p style={{ color: "#857d70", fontSize: "13px" }}>
                        No shipping details added yet.
                      </p>
                    )}

                    {currentStatus !== "cancelled" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            if (shippingOrderId === order.id) {
                              setShippingOrderId(null);
                            } else {
                              setShippingOrderId(order.id);
                              setCourierName(order.courier_name || "");
                              setTrackingNumber(order.tracking_number || "");
                              setTrackingUrl(order.tracking_url || "");
                            }
                          }}
                          style={{
                            padding: "10px 14px",
                            background: "#29251f",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            width: "fit-content",
                          }}
                        >
                          {shippingOrderId === order.id
                            ? "Close Shipping Form"
                            : order.tracking_number
                              ? "Edit Shipping Details"
                              : "Add Shipping Details"}
                        </button>

                        {shippingOrderId === order.id && (
                          <form
                            onSubmit={(event) => {
                              event.preventDefault();
                              void saveShippingDetails(order.id);
                            }}
                            style={{
                              display: "grid",
                              gap: "10px",
                              maxWidth: "420px",
                            }}
                          >
                            <input
                              type="text"
                              placeholder="Courier name (e.g. Delhivery)"
                              value={courierName}
                              onChange={(event) =>
                                setCourierName(event.target.value)
                              }
                              required
                              style={inputStyle}
                            />

                            <input
                              type="text"
                              placeholder="Tracking number"
                              value={trackingNumber}
                              onChange={(event) =>
                                setTrackingNumber(event.target.value)
                              }
                              required
                              style={inputStyle}
                            />

                            <input
                              type="url"
                              placeholder="Tracking URL (optional)"
                              value={trackingUrl}
                              onChange={(event) =>
                                setTrackingUrl(event.target.value)
                              }
                              style={inputStyle}
                            />

                            <button
                              type="submit"
                              disabled={savingShipping}
                              style={{
                                padding: "11px 16px",
                                background: "#927747",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: savingShipping
                                  ? "not-allowed"
                                  : "pointer",
                                width: "fit-content",
                              }}
                            >
                              {savingShipping
                                ? "Saving..."
                                : "Save Shipping Details"}
                            </button>
                          </form>
                        )}
                      </>
                    )}
                  </div>

                  {/* ORDER STATUS HISTORY */}
                  <div
                    style={{
                      borderTop: "1px solid #e5dfd4",
                      paddingTop: "14px",
                    }}
                  >
                    <h3 style={{ fontSize: "15px", marginBottom: "12px" }}>
                      Order Status History
                    </h3>

                    {!order.order_status_history ||
                    order.order_status_history.length === 0 ? (
                      <p style={{ color: "#857d70", fontSize: "13px" }}>
                        No status history available.
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "grid",
                          gap: "12px",
                          paddingLeft: "4px",
                        }}
                      >
                        {[...order.order_status_history]
                          .sort(
                            (a, b) =>
                              new Date(a.changed_at).getTime() -
                              new Date(b.changed_at).getTime()
                          )
                          .map((history) => (
                            <div
                              key={history.id}
                              style={{
                                display: "flex",
                                gap: "12px",
                                alignItems: "flex-start",
                              }}
                            >
                              <span
                                style={{
                                  width: "9px",
                                  height: "9px",
                                  minWidth: "9px",
                                  borderRadius: "50%",
                                  background: "#927747",
                                  marginTop: "5px",
                                }}
                              />

                              <div>
                                <strong style={{ fontSize: "13px" }}>
                                  {history.previous_status === null &&
                                  history.new_status === "placed"
                                    ? "Order placed"
                                    : `${readableStatus(
                                        history.previous_status || ""
                                      )} → ${readableStatus(
                                        history.new_status
                                      )}`}
                                </strong>

                                <p
                                  style={{
                                    fontSize: "12px",
                                    color: "#857d70",
                                    margin: "4px 0 0",
                                  }}
                                >
                                  {formatDate(history.changed_at)}
                                </p>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      alignItems: "center",
                      gap: "12px",
                      borderTop: "1px solid #e5dfd4",
                      paddingTop: "14px",
                    }}
                  >
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                        gap: "8px",
                        fontSize: "14px",
                      }}
                    >
                      Update order status:

                      <select
                        aria-label={`Status for order ${order.id}`}
                        value={currentStatus}
                        disabled={
                          savingOrderId === order.id ||
                          currentStatus === "cancelled"
                        }
                        onChange={(event) =>
                          void updateStatus(order.id, event.target.value)
                        }
                        style={{
                          ...inputStyle,
                          width: "auto",
                          minWidth: "145px",
                        }}
                      >
                        {!STATUSES.includes(currentStatus) && (
                          <option value={currentStatus}>
                            {readableStatus(currentStatus)}
                          </option>
                        )}

                        {STATUSES.map((status) => (
                          <option key={status} value={status}>
                            {readableStatus(status)}
                          </option>
                        ))}
                      </select>
                    </label>

                    {savingOrderId === order.id && (
                      <span
                        role="status"
                        style={{ fontSize: "13px", color: "#686258" }}
                      >
                        Saving status...
                      </span>
                    )}

                    <button
                      onClick={() => setSelectedOrder(order)}
                      style={buttonStyle}
                    >
                      Payment & Order Details
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {selectedOrder && (
          <div
            onClick={() => setSelectedOrder(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              zIndex: 50,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "18px",
            }}
          >
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby="order-details-title"
              onClick={(event) => event.stopPropagation()}
              style={{
                background: "#fffdf9",
                color: "#201e1a",
                borderRadius: "8px",
                padding: "24px",
                width: "100%",
                maxWidth: "600px",
                maxHeight: "85vh",
                overflowY: "auto",
              }}
            >
              <h2 id="order-details-title">Order details</h2>

              <p style={{ overflowWrap: "anywhere" }}>
                <strong>Order ID:</strong> {selectedOrder.id}
              </p>

              <p>
                <strong>Created:</strong>{" "}
                {formatDate(selectedOrder.created_at)}
              </p>

              <p>
                <strong>Total:</strong>{" "}
                {formatPrice(selectedOrder.total_paise)}
              </p>

              <p>
                <strong>Status:</strong>{" "}
                {readableStatus(selectedOrder.status)}
              </p>

              <p style={{ overflowWrap: "anywhere" }}>
                <strong>Razorpay order ID:</strong>{" "}
                {selectedOrder.razorpay_order_id || "Not available"}
              </p>

              <p style={{ overflowWrap: "anywhere" }}>
                <strong>Razorpay payment ID:</strong>{" "}
                {selectedOrder.razorpay_payment_id || "Not available"}
              </p>

              <p>
                <strong>Payment note:</strong> A recorded payment ID alone
                does not verify payment with Razorpay.
              </p>

              <button
                onClick={() => setSelectedOrder(null)}
                style={buttonStyle}
              >
                Close
              </button>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
