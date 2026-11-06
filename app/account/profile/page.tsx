
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type ProfileForm = {
  full_name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
};

const initialForm: ProfileForm = {
  full_name: '',
  phone: '',
  address: '',
  city: '',
  state: '',
  pincode: '',
};

export default function CustomerProfilePage() {
  const router = useRouter();

  const [form, setForm] = useState<ProfileForm>(initialForm);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadProfile() {
      const { data, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !data.user) {
        router.replace('/account');
        return;
      }

      const user = data.user;
      const metadata = user.user_metadata ?? {};

      setEmail(user.email ?? '');

      setForm({
        full_name: metadata.full_name ?? '',
        phone: metadata.phone ?? '',
        address: metadata.address ?? '',
        city: metadata.city ?? '',
        state: metadata.state ?? '',
        pincode: metadata.pincode ?? '',
      });

      setLoading(false);
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, [router]);

  function updateField(
    field: keyof ProfileForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  async function saveProfile(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setMessage('');
    setError('');

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError('Your session has expired. Please sign in again.');
        router.replace('/account');
        return;
      }

      const { error: updateError } =
        await supabase.auth.updateUser({
          data: {
            full_name: form.full_name.trim(),
            phone: form.phone.trim(),
            address: form.address.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            pincode: form.pincode.trim(),
          },
        });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setMessage('Your profile has been saved successfully.');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    setError('');

    const supabase = createClient();
    const { error: signOutError } = await supabase.auth.signOut();

    if (signOutError) {
      setError(signOutError.message);
      setSigningOut(false);
      return;
    }

    router.replace('/account');
    router.refresh();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '13px 14px',
    background: '#fffdf9',
    color: '#24211b',
    border: '1px solid #d8d0c1',
    borderRadius: '4px',
    fontSize: '14px',
    outlineColor: '#927747',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    marginBottom: '8px',
    color: '#514a3d',
    fontSize: '11px',
    letterSpacing: '1px',
    fontWeight: 600,
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#f7f4ed',
          color: '#302a20',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Loading your profile...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#f7f4ed',
        color: '#26231e',
        fontFamily: 'Arial, sans-serif',
        padding: '32px 18px 60px',
      }}
    >
      <header
        style={{
          maxWidth: '1000px',
          margin: '0 auto 36px',
          paddingBottom: '20px',
          borderBottom: '1px solid #ded7ca',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/"
          style={{
            color: '#29251e',
            textDecoration: 'none',
            fontSize: '25px',
            letterSpacing: '5px',
            fontWeight: 700,
          }}
        >
          SEROW
        </Link>

        <Link
          href="/"
          style={{
            color: '#66583d',
            textDecoration: 'none',
            fontSize: '12px',
            letterSpacing: '1px',
          }}
        >
          ← BACK TO SHOP
        </Link>
      </header>

      <section
        style={{
          maxWidth: '760px',
          margin: '0 auto',
        }}
      >
        <p
          style={{
            color: '#927747',
            fontSize: '11px',
            letterSpacing: '3px',
            fontWeight: 600,
          }}
        >
          YOUR SEROW ACCOUNT
        </p>

        <h1
          style={{
            fontSize: 'clamp(30px, 5vw, 44px)',
            fontWeight: 400,
            margin: '12px 0',
          }}
        >
          My profile.
        </h1>

        <p
          style={{
            color: '#716b60',
            lineHeight: 1.7,
            marginBottom: '30px',
          }}
        >
          Manage your personal information and delivery details.
        </p>

        <div
          style={{
            background: '#fffefa',
            border: '1px solid #e4ddd0',
            borderRadius: '8px',
            padding: 'clamp(20px, 5vw, 36px)',
            boxShadow: '0 8px 30px rgba(50, 40, 20, 0.04)',
          }}
        >
          <div style={{ marginBottom: '28px' }}>
            <label style={labelStyle}>REGISTERED EMAIL</label>

            <div
              style={{
                ...inputStyle,
                background: '#f2efe8',
                color: '#777064',
                overflowWrap: 'anywhere',
              }}
            >
              {email}
            </div>

            <p
              style={{
                color: '#817a6d',
                fontSize: '12px',
                lineHeight: 1.6,
              }}
            >
              This is the email associated with your sign-in account.
            </p>
          </div>

          <form onSubmit={saveProfile}>
            <h2
              style={{
                fontSize: '17px',
                fontWeight: 500,
                marginBottom: '20px',
              }}
            >
              Personal information
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(100%, 230px), 1fr))',
                gap: '20px',
              }}
            >
              <div>
                <label htmlFor="full_name" style={labelStyle}>
                  FULL NAME
                </label>
                <input
                  id="full_name"
                  autoComplete="name"
                  required
                  maxLength={100}
                  value={form.full_name}
                  onChange={(e) =>
                    updateField('full_name', e.target.value)
                  }
                  placeholder="Enter your full name"
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="phone" style={labelStyle}>
                  PHONE NUMBER
                </label>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  maxLength={20}
                  value={form.phone}
                  onChange={(e) =>
                    updateField('phone', e.target.value)
                  }
                  placeholder="Enter phone number"
                  style={inputStyle}
                />
              </div>
            </div>

            <h2
              style={{
                fontSize: '17px',
                fontWeight: 500,
                margin: '32px 0 20px',
              }}
            >
              Delivery address
            </h2>

            <div style={{ marginBottom: '20px' }}>
              <label htmlFor="address" style={labelStyle}>
                HOUSE / STREET ADDRESS
              </label>
              <textarea
                id="address"
                autoComplete="street-address"
                rows={3}
                maxLength={500}
                value={form.address}
                onChange={(e) =>
                  updateField('address', e.target.value)
                }
                placeholder="House number, street, area"
                style={{
                  ...inputStyle,
                  resize: 'vertical',
                }}
              />
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(min(100%, 190px), 1fr))',
                gap: '20px',
              }}
            >
              <div>
                <label htmlFor="city" style={labelStyle}>
                  CITY
                </label>
                <input
                  id="city"
                  autoComplete="address-level2"
                  maxLength={100}
                  value={form.city}
                  onChange={(e) =>
                    updateField('city', e.target.value)
                  }
                  placeholder="City"
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="state" style={labelStyle}>
                  STATE
                </label>
                <input
                  id="state"
                  autoComplete="address-level1"
                  maxLength={100}
                  value={form.state}
                  onChange={(e) =>
                    updateField('state', e.target.value)
                  }
                  placeholder="State"
                  style={inputStyle}
                />
              </div>

              <div>
                <label htmlFor="pincode" style={labelStyle}>
                  PIN CODE
                </label>
                <input
                  id="pincode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  maxLength={10}
                  value={form.pincode}
                  onChange={(e) =>
                    updateField('pincode', e.target.value)
                  }
                  placeholder="PIN code"
                  style={inputStyle}
                />
              </div>
            </div>

            {message && (
              <p
                role="status"
                style={{
                  marginTop: '22px',
                  color: '#28653b',
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}
              >
                {message}
              </p>
            )}

            {error && (
              <p
                role="alert"
                style={{
                  marginTop: '22px',
                  color: '#a12e26',
                  fontSize: '14px',
                  lineHeight: 1.6,
                }}
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              style={{
                width: '100%',
                marginTop: '28px',
                padding: '15px',
                background: saving ? '#6c624e' : '#28251f',
                color: '#f8f3e8',
                border: '1px solid #927747',
                borderRadius: '4px',
                cursor: saving ? 'wait' : 'pointer',
                fontSize: '12px',
                letterSpacing: '2px',
                fontWeight: 600,
              }}
            >
              {saving ? 'SAVING PROFILE...' : 'SAVE PROFILE'}
            </button>
          </form>
        </div>

        {/* My Orders card */}
        <Link
          href="/account/orders"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '18px',
            marginTop: '24px',
            padding: '22px',
            background: '#fffefa',
            border: '1px solid #e4ddd0',
            borderRadius: '8px',
            boxShadow: '0 8px 30px rgba(50, 40, 20, 0.03)',
            textDecoration: 'none',
            color: '#26231e',
            transition: 'border-color 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = '#927747';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = '#e4ddd0';
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              flexShrink: 0,
              display: 'grid',
              placeItems: 'center',
              background: '#f2efe8',
              border: '1px solid #e4ddd0',
              borderRadius: '6px',
              color: '#927747',
            }}
          >
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 7h18l-1.5 13h-15L3 7Z" />
              <path d="M8 9V6a4 4 0 0 1 8 0v3" />
            </svg>
          </div>

          <div style={{ flex: 1 }}>
            <h2
              style={{
                margin: '0 0 6px',
                fontSize: '16px',
                fontWeight: 500,
              }}
            >
              My Orders
            </h2>
            <p
              style={{
                margin: 0,
                color: '#817a6d',
                fontSize: '13px',
                lineHeight: 1.6,
              }}
            >
              View your purchases and track delivery status.
            </p>
          </div>

          <span
            aria-hidden="true"
            style={{
              color: '#927747',
              fontSize: '23px',
              fontWeight: 300,
            }}
          >
            →
          </span>
        </Link>

        <div
          style={{
            marginTop: '24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            flexWrap: 'wrap',
          }}
        >
          <p style={{ color: '#817a6d', fontSize: '12px' }}>
            Your details help prepare your future orders.
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            style={{
              background: 'transparent',
              border: '1px solid #c9c0b0',
              borderRadius: '4px',
              padding: '11px 16px',
              color: '#514a3d',
              cursor: signingOut ? 'wait' : 'pointer',
              fontSize: '11px',
              letterSpacing: '1px',
            }}
          >
            {signingOut ? 'SIGNING OUT...' : 'SIGN OUT'}
          </button>
        </div>
      </section>
    </main>
  );
}
