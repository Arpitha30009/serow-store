
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type OrderItem = {
  id?: string;
  variant_id?: string | null;
  product_id?: string | null;
  product_name?: string | null;
  size?: string | null;
  color?: string | null;
  quantity?: number | null;
  unit_price_paise?: number | null;
  product_variants?: {
    product_id: string;
  } | null;
};

type OrderStatusHistory = {
  id: string;
  previous_status: string | null;
  new_status: string;
  changed_at: string;
};

type Order = {
  id: string;
  customer_email?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  shipping_address?: string | Record<string, unknown> | null;
  total_paise?: number | null;
  status?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  created_at?: string | null;
  courier_name?: string | null;
  tracking_number?: string | null;
  tracking_url?: string | null;
  order_items?: OrderItem[];
  order_status_history?: OrderStatusHistory[];
};

const colors = {
  background: '#fbfaf8',
  ivory: '#f8f6f1',
  white: '#fffefa',
  dark: '#191813',
  muted: '#817b70',
  gold: '#a1844b',
  border: '#e4ddd1',
  green: '#356442',
  blue: '#345d87',
  red: '#a34136',
};

const ORDER_STAGES = [
  {
    value: 'pending',
    label: 'Pending',
    description: 'Your order has been placed.',
  },
  {
    value: 'processing',
    label: 'Processing',
    description: 'Your order is being prepared.',
  },
  {
    value: 'shipped',
    label: 'Shipped',
    description: 'Your order is on its way.',
  },
  {
    value: 'delivered',
    label: 'Delivered',
    description: 'Your order has been delivered.',
  },
];

const money = (paise: number | null | undefined) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((paise ?? 0) / 100);

const dateText = (date: string | null | undefined) => {
  if (!date) return 'Date unavailable';

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? 'Date unavailable'
    : parsed.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
};

const dateTimeText = (date: string | null | undefined) => {
  if (!date) return 'Date unavailable';

  const parsed = new Date(date);

  return Number.isNaN(parsed.getTime())
    ? 'Date unavailable'
    : parsed.toLocaleString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
};

function statusColors(status?: string | null) {
  switch ((status ?? 'pending').toLowerCase()) {
    case 'delivered':
      return { background: '#e9f3e9', color: colors.green };
    case 'shipped':
      return { background: '#e9f0f8', color: colors.blue };
    case 'processing':
      return { background: '#f8f0dd', color: '#896b28' };
    case 'cancelled':
      return { background: '#f8e9e7', color: colors.red };
    default:
      return { background: '#eeece6', color: '#655f54' };
  }
}

function OrderTracking({ status }: { status?: string | null }) {
  const currentStatus = (status ?? 'pending').toLowerCase();
  const cancelled = currentStatus === 'cancelled';

  const currentIndex = ORDER_STAGES.findIndex(
    (stage) => stage.value === currentStatus
  );

  if (cancelled) {
    return (
      <section
        style={{
          marginTop: 8,
          padding: 18,
          border: '1px solid #e6c9c4',
          background: '#fdf4f2',
          borderRadius: 5,
        }}
      >
        <p
          style={{
            margin: '0 0 6px',
            color: colors.red,
            fontSize: 11,
            letterSpacing: 1.5,
            fontWeight: 700,
          }}
        >
          ORDER CANCELLED
        </p>

        <p style={{ margin: 0, fontSize: 13, color: '#71605b' }}>
          This order has been marked as cancelled.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Order tracking progress"
      style={{
        marginTop: 8,
        padding: '20px 18px',
        border: `1px solid ${colors.border}`,
        background: '#fffefa',
        borderRadius: 5,
      }}
    >
      <p
        style={{
          margin: '0 0 22px',
          color: colors.gold,
          fontSize: 10,
          letterSpacing: 1.8,
          fontWeight: 700,
        }}
      >
        ORDER TRACKING
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
          gap: 6,
        }}
      >
        {ORDER_STAGES.map((stage, index) => {
          const completed = currentIndex >= 0 && index < currentIndex;
          const current = currentIndex === index;
          const reached = currentIndex >= 0 && index <= currentIndex;

          return (
            <div
              key={stage.value}
              style={{
                minWidth: 0,
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  marginBottom: 12,
                }}
              >
                {index > 0 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background:
                        currentIndex >= index
                          ? colors.gold
                          : colors.border,
                    }}
                  />
                )}

                <div
                  style={{
                    flexShrink: 0,
                    width: 25,
                    height: 25,
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    margin: index === 0 ? '0 auto 0 0' : '0 auto',
                    background: reached ? colors.dark : colors.ivory,
                    color: reached ? '#fffefa' : colors.muted,
                    border: `1px solid ${
                      current ? colors.gold : colors.border
                    }`,
                    boxSizing: 'border-box',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {completed ? '✓' : index + 1}
                </div>

                {index < ORDER_STAGES.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background:
                        currentIndex > index
                          ? colors.gold
                          : colors.border,
                    }}
                  />
                )}
              </div>

              <p
                style={{
                  margin: 0,
                  fontSize: 11,
                  lineHeight: 1.5,
                  fontWeight: reached ? 700 : 400,
                  color: current
                    ? colors.gold
                    : reached
                      ? colors.dark
                      : colors.muted,
                  overflowWrap: 'anywhere',
                }}
              >
                {stage.label}
              </p>

              <p
                style={{
                  margin: '5px 0 0',
                  fontSize: 10,
                  lineHeight: 1.5,
                  color: colors.muted,
                }}
              >
                {stage.description}
              </p>
            </div>
          );
        })}
      </div>

      {currentIndex === -1 && (
        <p
          style={{
            margin: '18px 0 0',
            color: colors.muted,
            fontSize: 12,
            lineHeight: 1.7,
          }}
        >
          Your order status is currently being updated. Please check again
          later.
        </p>
      )}

      {currentIndex === ORDER_STAGES.length - 1 && (
        <p
          style={{
            margin: '18px 0 0',
            color: colors.green,
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          Your order has been delivered. Thank you for shopping with SEROW.
        </p>
      )}
    </section>
  );
}

export default function CustomerOrdersPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelingOrderId, setCancelingOrderId] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState('');

  useEffect(() => {
    let active = true;

    async function loadOrders() {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (authError || !user) {
        router.replace('/account');
        return;
      }

      if (!user.email) {
        setError('We could not find the email associated with your account.');
        setLoading(false);
        return;
      }

      const { data, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            *,
            product_variants(product_id)
          ),
          order_status_history(*)
        `)
        .eq('customer_email', user.email)
        .order('created_at', { ascending: false });

      if (!active) return;

      if (orderError) {
        console.error('Could not load orders:', orderError);
        setError('We could not load your orders. Please try again later.');
      } else {
        setOrders((data ?? []) as Order[]);
      }

      setLoading(false);
    }

    loadOrders();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleCancelOrder(orderId: string) {
  const confirmed = window.confirm(
    'Are you sure you want to cancel this order?'
  );

  if (!confirmed) return;

  setCancelingOrderId(orderId);
  setCancelNotice('');

  try {
    const response = await fetch('/api/account/orders/cancel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || 'Unable to cancel this order.');
    }

    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order.id === orderId
          ? { ...order, status: 'cancelled' }
          : order
      )
    );

    setCancelNotice('Your order has been cancelled successfully.');
  } catch (err) {
    setCancelNotice(
      err instanceof Error
        ? err.message
        : 'Something went wrong. Please try again.'
    );
  } finally {
    setCancelingOrderId(null);
  }
}

  const linkStyle: React.CSSProperties = {
    color: colors.gold,
    textDecoration: 'none',
    fontSize: 12,
    letterSpacing: 1,
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: colors.background,
          color: colors.dark,
          fontFamily: 'Arial, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ letterSpacing: 5 }}>SEROW</h2>
          <p>Loading your orders...</p>
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '30px 18px 60px',
        background: colors.background,
        color: '#29251f',
        fontFamily: 'Arial, Helvetica, sans-serif',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <header
          style={{
            background: colors.dark,
            borderRadius: '15px 15px 0 0',
            padding: '23px 20px',
            textAlign: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              color: colors.ivory,
              textDecoration: 'none',
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.5px',
            }}
          >
            SEROW
          </Link>

          <p style={{ color: '#c6b38b', fontSize: 12 }}>
            TIMELESS STYLE
          </p>
        </header>

        <section
          style={{
            padding: '28px 24px',
            background: colors.ivory,
            border: `1px solid ${colors.border}`,
          }}
        >
          <p
            style={{
              color: colors.gold,
              fontSize: 11,
              letterSpacing: 2,
            }}
          >
            YOUR SEROW ACCOUNT
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: 'clamp(29px, 5vw, 39px)',
              fontWeight: 400,
            }}
          >
            My Orders
          </h1>

          <p
            style={{
              color: colors.muted,
              fontSize: 14,
              lineHeight: 1.8,
            }}
          >
            A record of your SEROW purchases and their delivery status.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 20,
            }}
          >
            <Link href="/account/profile" style={linkStyle}>
              ← MY ACCOUNT
            </Link>

            <Link href="/" style={linkStyle}>
              CONTINUE SHOPPING
            </Link>
          </div>
        </section>

        {error && (
          <p
            role="alert"
            style={{
              padding: 18,
              background: colors.white,
              color: '#9e3830',
              border: '1px solid #e6c9c4',
            }}
          >
            {error}
          </p>
        )}

        {!error && orders.length === 0 && (
          <section
            style={{
              marginTop: 25,
              padding: '40px 20px',
              background: colors.white,
              border: `1px solid ${colors.border}`,
              textAlign: 'center',
            }}
          >
            <h2>No orders yet</h2>

            <p style={{ color: colors.muted }}>
              Your purchases will appear here after you place an order.
            </p>

            <Link href="/" style={linkStyle}>
              EXPLORE THE COLLECTION →
            </Link>
          </section>
        )}

        {!error &&
          orders.map((order) => {
            const badge = statusColors(order.status);

            return (
              <article
                key={order.id}
                style={{
                  marginTop: 22,
                  overflow: 'hidden',
                  background: colors.white,
                  border: `1px solid ${colors.border}`,
                  borderRadius: 7,
                }}
              >
                <div
                  style={{
                    padding: 22,
                    background: colors.ivory,
                    borderBottom: `1px solid ${colors.border}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 15,
                  }}
                >
                  <div>
                    <p
                      style={{
                        color: colors.gold,
                        fontSize: 10,
                        letterSpacing: 2,
                      }}
                    >
                      ORDER REFERENCE
                    </p>

                    <p
                      style={{
                        fontSize: 13,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {order.id}
                    </p>

                    <p style={{ color: colors.muted, fontSize: 12 }}>
                      Placed on {dateText(order.created_at)}
                    </p>
                  </div>

                  <div>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '8px 12px',
                        background: badge.background,
                        color: badge.color,
                        borderRadius: 20,
                        fontSize: 11,
                        textTransform: 'capitalize',
                      }}
                    >
                      {(order.status ?? 'pending').replaceAll('_', ' ')}
                    </span>

                    <p style={{ fontSize: 19, fontWeight: 600 }}>
                      {money(order.total_paise)}
                    </p>

                    <div
                      style={{
                        marginTop: 12,
                        fontSize: 12,
                        lineHeight: 1.9,
                        color: colors.muted,
                      }}
                    >
                      <p style={{ margin: 0 }}>
                        Payment method:{' '}
                        <strong style={{ color: colors.dark }}>
                          {order.payment_method === 'razorpay'
                            ? 'Online payment (Razorpay)'
                            : order.payment_method === 'cod'
                              ? 'Cash on delivery'
                              : order.payment_method ?? 'Not specified'}
                        </strong>
                      </p>

                      <p style={{ margin: 0 }}>
                        Payment status:{' '}
                        <strong
                          style={{
                            color:
                              order.payment_status === 'paid'
                                ? colors.green
                                : order.payment_status === 'failed'
                                  ? colors.red
                                  : colors.gold,
                            textTransform: 'capitalize',
                          }}
                        >
                          {(order.payment_status ?? 'pending').replaceAll(
                            '_',
                            ' '
                          )}
                        </strong>
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: 22 }}>
                  <OrderTracking status={order.status} />

                                    {/* CUSTOMER SHIPPING DETAILS */}
                  {order.status?.toLowerCase() !== 'cancelled' &&
                    (order.courier_name || order.tracking_number) && (
                      <section
                        style={{
                          marginTop: 20,
                          padding: 18,
                          border: `1px solid ${colors.border}`,
                          borderRadius: 5,
                          background: colors.ivory,
                        }}
                      >
                        <p
                          style={{
                            margin: '0 0 15px',
                            color: colors.gold,
                            fontSize: 11,
                            letterSpacing: 1.5,
                            fontWeight: 700,
                          }}
                        >
                          SHIPMENT DETAILS
                        </p>

                        {order.courier_name && (
                          <p
                            style={{
                              margin: '0 0 10px',
                              fontSize: 13,
                              color: colors.dark,
                            }}
                          >
                            Courier:{' '}
                            <strong>{order.courier_name}</strong>
                          </p>
                        )}

                        {order.tracking_number && (
                          <p
                            style={{
                              margin: '0 0 12px',
                              fontSize: 13,
                              color: colors.dark,
                              overflowWrap: 'anywhere',
                            }}
                          >
                            Tracking number:{' '}
                            <strong>{order.tracking_number}</strong>
                          </p>
                        )}

                        {order.tracking_url &&
                          /^https?:\/\//i.test(order.tracking_url) && (
                            <a
                              href={order.tracking_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: 'inline-block',
                                marginTop: 5,
                                padding: '11px 18px',
                                background: colors.dark,
                                color: colors.ivory,
                                textDecoration: 'none',
                                borderRadius: 4,
                                fontSize: 11,
                                letterSpacing: 1,
                                fontWeight: 600,
                              }}
                            >
                              TRACK SHIPMENT →
                            </a>
                          )}
                      </section>
                    )}

                  {/* CUSTOMER ORDER STATUS HISTORY */}
<section
  style={{
    marginTop: 20,
    padding: 18,
    border: `1px solid ${colors.border}`,
    borderRadius: 5,
    background: colors.white,
  }}
>
  <p
    style={{
      margin: '0 0 16px',
      color: colors.gold,
      fontSize: 11,
      letterSpacing: 1.5,
      fontWeight: 700,
    }}
  >
    ORDER STATUS HISTORY
  </p>

  {order.order_status_history?.length ? (
    [...order.order_status_history]
      .sort(
        (a, b) =>
          new Date(a.changed_at).getTime() -
          new Date(b.changed_at).getTime()
      )
      .map((history) => (
        <div
          key={history.id}
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 15,
          }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              minWidth: 9,
              borderRadius: '50%',
              background: colors.gold,
              marginTop: 5,
            }}
          />

          <div>
            <strong style={{ fontSize: 13 }}>
              {history.previous_status === null &&
              history.new_status === 'placed'
                ? 'Order placed'
                : `${history.previous_status
                    ? history.previous_status.charAt(0).toUpperCase() +
                      history.previous_status.slice(1)
                    : 'Status'} → ${history.new_status.charAt(0).toUpperCase() +
                      history.new_status.slice(1)}`}
            </strong>

            <p
              style={{
                margin: '5px 0 0',
                fontSize: 11,
                color: colors.muted,
              }}
            >
              {dateTimeText(history.changed_at)}
            </p>
          </div>
        </div>
      ))
  ) : (
    <p style={{ fontSize: 12, color: colors.muted }}>
      No status history available yet.
    </p>
  )}
</section>

                  {order.status &&
  ['pending', 'processing'].includes(order.status.toLowerCase()) &&
  order.payment_method === 'cod' &&
  order.payment_status !== 'paid' && (
    <button
      type="button"
      onClick={() => handleCancelOrder(order.id)}
      disabled={cancelingOrderId === order.id}
      style={{
        marginTop: 18,
        padding: '11px 20px',
        background: colors.white,
        color: colors.red,
        border: `1px solid ${colors.red}`,
        borderRadius: 4,
        cursor: cancelingOrderId === order.id ? 'not-allowed' : 'pointer',
        opacity: cancelingOrderId === order.id ? 0.6 : 1,
      }}
    >
      {cancelingOrderId === order.id ? 'CANCELLING...' : 'CANCEL ORDER'}
    </button>
  )}

{cancelNotice && (
  <p
    role="status"
    style={{
      marginTop: 12,
      color: cancelNotice.includes('successfully')
        ? colors.green
        : colors.red,
      fontSize: 13,
    }}
  >
    {cancelNotice}
  </p>
)}

                  <p
                    style={{
                      color: colors.gold,
                      fontSize: 10,
                      letterSpacing: 2,
                      marginTop: 28,
                    }}
                  >
                    ORDER DETAILS
                  </p>

                  {order.order_items?.length ? (
                    order.order_items.map((item, index) => {
                      const productId =
                        item.product_id ?? item.product_variants?.product_id;

                      return (
                        <div
                          key={item.id ?? `${order.id}-${index}`}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            gap: 15,
                            padding: '15px 0',
                            borderTop: `1px solid ${colors.border}`,
                          }}
                        >
                          <div>
                            {productId ? (
                              <Link
                                href={`/products/${productId}`}
                                style={{
                                  display: 'inline-block',
                                  color: colors.dark,
                                  textDecoration: 'none',
                                  fontSize: 14,
                                  fontWeight: 600,
                                  borderBottom: `1px solid ${colors.gold}`,
                                  lineHeight: 1.8,
                                }}
                              >
                                {item.product_name || 'Product'}
                              </Link>
                            ) : (
                              <p
                                style={{
                                  margin: 0,
                                  fontSize: 14,
                                  fontWeight: 600,
                                }}
                              >
                                {item.product_name || 'Product'}
                              </p>
                            )}

                            <p
                              style={{
                                color: colors.muted,
                                fontSize: 12,
                                lineHeight: 1.8,
                              }}
                            >
                              {item.size ? `Size: ${item.size}  ` : ''}
                              {item.color ? `Colour: ${item.color}  ` : ''}
                              Qty: {item.quantity ?? 1}
                            </p>
                          </div>

                          <p
                            style={{
                              margin: 0,
                              fontSize: 13,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {money(
                              (item.unit_price_paise ?? 0) *
                                (item.quantity ?? 1)
                            )}
                          </p>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: colors.muted, fontSize: 13 }}>
                      Item details are not available.
                    </p>
                  )}

                  {order.shipping_address && (
                    <div
                      style={{
                        marginTop: 14,
                        padding: 17,
                        background: colors.ivory,
                        borderRadius: 4,
                      }}
                    >
                      <p
                        style={{
                          color: colors.gold,
                          fontSize: 10,
                          letterSpacing: 1.5,
                        }}
                      >
                        DELIVERY ADDRESS
                      </p>

                      <p
                        style={{
                          margin: 0,
                          color: '#625d53',
                          fontSize: 13,
                          lineHeight: 1.8,
                        }}
                      >
                        {typeof order.shipping_address === 'string'
                          ? order.shipping_address
                          : JSON.stringify(order.shipping_address)}
                      </p>
                    </div>
                  )}
                </div>
              </article>
            );
          })}

        <footer
          style={{
            marginTop: 35,
            paddingTop: 22,
            borderTop: `1px solid ${colors.border}`,
          }}
        >
          <Link href="/account/profile" style={linkStyle}>
            ← BACK TO MY ACCOUNT
          </Link>
        </footer>
      </div>
    </main>
  );
}
