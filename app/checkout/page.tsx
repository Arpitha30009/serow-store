
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type CheckoutItem = {
  product_id: string;
  color_id: string;
  color: string;
  size: string;
  quantity: number;
  product_name: string;
  price: number;
  image: string;
};

const money = (amount: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);

export default function CheckoutPage() {
  const router = useRouter();

  const [items, setItems] = useState<CheckoutItem[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState('');
  const [orderId, setOrderId] = useState('');

  useEffect(() => {
    let active = true;

    async function initialise() {
      try {
        const saved = sessionStorage.getItem('serow_checkout_items');

        if (!saved) {
          router.replace('/');
          return;
        }

        const parsed = JSON.parse(saved);

        if (!Array.isArray(parsed) || parsed.length === 0) {
          router.replace('/');
          return;
        }

        const supabase = createClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          router.replace('/account');
          return;
        }

        if (!active) return;

        setItems(parsed);
        setEmail(user.email ?? '');

        const metadata = user.user_metadata ?? {};
        setName(metadata.full_name ?? '');
        setPhone(metadata.phone ?? '');

        const savedAddress = [
          metadata.address,
          metadata.city,
          metadata.state,
          metadata.pincode,
        ]
          .filter(Boolean)
          .join(', ');

        setAddress(savedAddress);
      } catch {
        if (active) {
          setError('Could not load your checkout. Please return to your bag and try again.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    initialise();

    return () => {
      active = false;
    };
  }, [router]);

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (!items.length) {
      setError('Your shopping bag is empty.');
      return;
    }

    setPlacingOrder(true);

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name,
          customer_email: email,
          customer_phone: phone,
          shipping_address: address,
          items: items.map((item) => ({
            product_id: item.product_id,
            color_id: item.color_id,
            size: item.size,
            quantity: item.quantity,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not place your order.');
      }

      
        const newOrderId = result.order?.order_id;

        if (!newOrderId) {
        throw new Error(
            'The order response was incomplete. Please contact support before trying again.'
        );
        }

        // Clear the checkout data and shopping bag after order confirmation.
        sessionStorage.removeItem('serow_checkout_items');
        localStorage.removeItem('serow_cart');

        // Update the bag count immediately in the storefront.
        window.dispatchEvent(new Event('serow-cart-updated'));

        setOrderId(newOrderId);


    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Something went wrong. Please try again.'
      );
    } finally {
      setPlacingOrder(false);
    }
  }

  if (loading) {
    return (
      <main style={styles.page}>
        <p>Preparing your checkout…</p>
      </main>
    );
  }

  if (orderId) {
  return (
    <main style={styles.page}>
      <section style={{ ...styles.card, maxWidth: 700, margin: '40px auto' }}>
        <p style={styles.eyebrow}>SEROW · ORDER CONFIRMED</p>

        <h1 style={styles.heading}>Thank you for your order.</h1>

        <p>
          Your Cash on Delivery order has been placed successfully.
        </p>

        <p style={styles.orderId}>
          Order reference: <strong>{orderId}</strong>
        </p>

        <div
          style={{
            background: '#f6f3ed',
            padding: 16,
            margin: '24px 0',
            border: '1px solid #e3dccf',
          }}
        >
          <strong>What happens next?</strong>
          <p style={styles.muted}>
            Your order is saved successfully. You can check its status and
            tracking information anytime from your SEROW account.
          </p>
          <p style={styles.muted}>
            If you do not receive an email confirmation, you can still view
            your confirmed order under My Orders.
          </p>
        </div>

        <h2 style={styles.subheading}>Order summary</h2>

        {items.map((item, index) => (
          <div
            key={`${item.product_id}-${item.color_id}-${item.size}-${index}`}
            style={styles.item}
          >
            {item.image ? (
              <img
                src={item.image}
                alt={item.product_name}
                style={styles.image}
              />
            ) : null}

            <div style={{ flex: 1 }}>
              <strong>{item.product_name}</strong>
              <p style={styles.muted}>
                {item.color} · Size {item.size} · Qty {item.quantity}
              </p>
              <span>{money(item.price * item.quantity)}</span>
            </div>
          </div>
        ))}

        <div style={styles.total}>
          <span>Estimated subtotal</span>
          <strong>{money(subtotal)}</strong>
        </div>

        <p style={styles.muted}>
          Shipping charges, if any, may be additional. Pay by Cash on
          Delivery when your order arrives.
        </p>

        <Link href="/account/orders" style={styles.button}>
          View my orders ↗
        </Link>

        <p style={{ marginTop: 22 }}>
          <Link href="/" style={styles.textLink}>
            Continue shopping
          </Link>
        </p>
      </section>
    </main>
  );
}

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <Link href="/" style={styles.brand}>SEROW</Link>
        <span style={styles.eyebrow}>SECURE CHECKOUT</span>
      </header>

      <div style={styles.layout}>
        <section style={styles.card}>
          <p style={styles.eyebrow}>YOUR DETAILS</p>
          <h1 style={styles.heading}>Delivery information</h1>
          <p style={styles.muted}>
            Complete your details to place your Cash on Delivery order.
          </p>

          <form onSubmit={placeOrder} style={styles.form}>
            <label style={styles.label}>
              Full name
              <input
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </label>

            <label style={styles.label}>
              Email address
              <input
                style={styles.input}
                type="email"
                value={email}
                readOnly
                required
                autoComplete="email"
              />
            </label>

            <label style={styles.label}>
              Phone number
              <input
                style={styles.input}
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                minLength={10}
                autoComplete="tel"
              />
            </label>

            <label style={styles.label}>
              Complete delivery address
              <textarea
                style={styles.textarea}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                required
                minLength={10}
                rows={4}
                autoComplete="street-address"
                placeholder="House number, street, area, city, state and PIN code"
              />
            </label>

            {error && (
              <p role="alert" style={styles.error}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={placingOrder || items.length === 0}
              style={{
                ...styles.button,
                opacity: placingOrder || items.length === 0 ? 0.6 : 1,
                cursor: placingOrder ? 'wait' : 'pointer',
              }}
            >
              {placingOrder ? 'Placing order…' : 'Place COD order ↗'}
            </button>

            <p style={styles.muted}>
              Payment method: Cash on Delivery. Online payments are not enabled here yet.
            </p>
          </form>
        </section>

        <aside style={styles.card}>
          <p style={styles.eyebrow}>YOUR SELECTION</p>
          <h2 style={styles.subheading}>Order summary</h2>

          {items.map((item, index) => (
            <div
              key={`${item.product_id}-${item.color_id}-${item.size}-${index}`}
              style={styles.item}
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.product_name}
                  style={styles.image}
                />
              ) : null}

              <div style={{ flex: 1 }}>
                <strong>{item.product_name}</strong>
                <p style={styles.muted}>
                  {item.color} · Size {item.size} · Qty {item.quantity}
                </p>
                <span>{money(item.price * item.quantity)}</span>
              </div>
            </div>
          ))}

          <div style={styles.total}>
            <span>Estimated subtotal</span>
            <strong>{money(subtotal)}</strong>
          </div>

          <p style={styles.muted}>
            Final prices are validated securely by the store when you place your order. Shipping charges, if any, are not included in this subtotal.
          </p>

          <Link href="/" style={styles.textLink}>
            ← Return to shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f6f3ed',
    color: '#211f1b',
    padding: '28px 5%',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottom: '1px solid #ded6c7',
    paddingBottom: 20,
    marginBottom: 36,
  },
  brand: {
    color: '#211f1b',
    fontSize: 28,
    fontWeight: 700,
    letterSpacing: 5,
    textDecoration: 'none',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)',
    gap: 24,
    maxWidth: 1100,
    margin: '0 auto',
    alignItems: 'start',
  },
  card: {
    background: '#fffdf8',
    border: '1px solid #e3dccf',
    padding: 28,
    borderRadius: 4,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 2,
    color: '#8a7145',
    fontWeight: 700,
  },
  heading: {
    fontSize: 30,
    lineHeight: 1.2,
    fontWeight: 500,
    margin: '12px 0',
  },
  subheading: {
    fontSize: 22,
    fontWeight: 500,
    marginTop: 8,
  },
  muted: {
    fontSize: 13,
    lineHeight: 1.6,
    color: '#716c62',
  },
  form: {
    display: 'grid',
    gap: 18,
    marginTop: 24,
  },
  label: {
    display: 'grid',
    gap: 8,
    fontSize: 13,
    fontWeight: 600,
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 12px',
    border: '1px solid #d8d0c1',
    borderRadius: 3,
    background: '#fff',
    color: '#211f1b',
    fontSize: 14,
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 12px',
    border: '1px solid #d8d0c1',
    borderRadius: 3,
    background: '#fff',
    color: '#211f1b',
    fontSize: 14,
    resize: 'vertical',
  },
  button: {
    display: 'inline-block',
    width: '100%',
    boxSizing: 'border-box',
    padding: '15px 18px',
    border: '1px solid #292720',
    borderRadius: 3,
    background: '#292720',
    color: '#fffdf8',
    textAlign: 'center',
    textDecoration: 'none',
    fontSize: 12,
    letterSpacing: 1,
    fontWeight: 700,
  },
  textLink: {
    color: '#735c35',
    fontSize: 13,
    textDecoration: 'underline',
  },
  error: {
    color: '#a32d24',
    fontSize: 13,
    lineHeight: 1.5,
  },
  item: {
    display: 'flex',
    gap: 14,
    padding: '16px 0',
    borderBottom: '1px solid #e8e1d6',
    fontSize: 13,
  },
  image: {
    width: 72,
    height: 92,
    objectFit: 'cover',
    background: '#eee9df',
  },
  total: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 12,
    padding: '22px 0 10px',
    fontSize: 15,
  },
  orderId: {
    overflowWrap: 'anywhere',
    fontSize: 13,
    lineHeight: 1.6,
  },
};
