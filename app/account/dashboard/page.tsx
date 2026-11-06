
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function AccountDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function checkUser() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        router.replace('/account');
        return;
      }

      setLoading(false);
    }

    checkUser();

    return () => {
      active = false;
    };
  }, [router]);

  async function handleSignOut() {
    setSigningOut(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      setSigningOut(false);
      window.alert(error.message);
      return;
    }

    router.replace('/account');
    router.refresh();
  }

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    width: '100%',
    padding: '30px 18px',
    boxSizing: 'border-box',
    color: '#191813',
    textDecoration: 'none',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid #e4ddd1',
    cursor: 'pointer',
  };

  const iconBoxStyle: React.CSSProperties = {
    width: '50px',
    height: '50px',
    minWidth: '50px',
    display: 'grid',
    placeItems: 'center',
    background: '#eee9df',
    borderRadius: '14px',
    color: '#75613c',
  };

  const descriptionStyle: React.CSSProperties = {
    margin: '8px 0 0',
    color: '#817c73',
    fontSize: '14px',
    lineHeight: 1.5,
  };

  const arrowStyle: React.CSSProperties = {
    marginLeft: 'auto',
    color: '#817c73',
    fontSize: '25px',
    fontWeight: 300,
  };

  if (loading) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#fbfaf8',
          color: '#29251e',
          fontFamily: 'Arial, sans-serif',
        }}
      >
        Loading your account...
      </main>
    );
  }

  return (
    <main
      style={{
        minHeight: '100vh',
        background: '#fbfaf8',
        padding: '34px 18px 60px',
        color: '#191813',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <section
        style={{
          maxWidth: '720px',
          margin: '0 auto',
          overflow: 'hidden',
          border: '1px solid #e0dbd2',
          borderRadius: '17px',
          background: '#f8f6f1',
        }}
      >
        {/* Black SEROW header */}
        <Link
          href="/"
          style={{
            display: 'block',
            padding: '21px 20px 19px',
            background: '#191813',
            color: '#f8f6f1',
            textAlign: 'center',
            textDecoration: 'none',
          }}
        >
          <div
            style={{
              fontSize: '23px',
              fontWeight: 700,
              letterSpacing: '-0.7px',
            }}
          >
            SEROW
          </div>

          <div
            style={{
              marginTop: '20px',
              color: '#c6b38b',
              fontSize: '12px',
            }}
          >
            TIMELESS STYLE
          </div>
        </Link>

        {/* Account heading */}
        <div
          style={{
            padding: '22px 18px 27px',
            borderBottom: '1px solid #e4ddd1',
          }}
        >
          <p
            style={{
              margin: '0 0 7px',
              color: '#a1844b',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            YOUR ACCOUNT
          </p>

          <h1
            style={{
              margin: 0,
              fontSize: '23px',
              fontWeight: 400,
              letterSpacing: '-0.5px',
            }}
          >
            My Account
          </h1>

          <p
            style={{
              margin: '9px 0 0',
              color: '#817c73',
              fontSize: '14px',
              lineHeight: 1.6,
            }}
          >
            Manage your account and purchases.
          </p>
        </div>

        {/* My Profile */}
        <Link
          href="/account/profile"
          style={rowStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f0ede6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span style={iconBoxStyle}>
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="8" r="4" />
              <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
            </svg>
          </span>

          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '16px', fontWeight: 600 }}>
              My Profile
            </span>
            <span style={descriptionStyle}>
              Personal details and address
            </span>
          </span>

          <span style={arrowStyle}>›</span>
        </Link>

        {/* My Orders */}
        <Link
          href="/account/orders"
          style={rowStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f0ede6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span style={iconBoxStyle}>
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="m12 3 9 5-9 5-9-5 9-5Z" />
              <path d="m3 8 9 5 9-5" />
              <path d="M3 8v10l9 5 9-5V8" />
              <path d="M12 13v10" />
            </svg>
          </span>

          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '16px', fontWeight: 600 }}>
              My Orders
            </span>
            <span style={descriptionStyle}>
              Purchases and delivery status
            </span>
          </span>

          <span style={arrowStyle}>›</span>
        </Link>

        {/* Sign Out */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={signingOut}
          style={{
            ...rowStyle,
            borderBottom: 'none',
            fontFamily: 'inherit',
            opacity: signingOut ? 0.65 : 1,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#f0ede6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <span style={iconBoxStyle}>
            <svg
              width="23"
              height="23"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M10 17l5-5-5-5" />
              <path d="M15 12H3" />
              <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
            </svg>
          </span>

          <span style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '16px', fontWeight: 600 }}>
              {signingOut ? 'Signing Out...' : 'Sign Out'}
            </span>
            <span style={descriptionStyle}>
              Sign out of your account
            </span>
          </span>

          <span style={arrowStyle}>›</span>
        </button>
      </section>

      <div
        style={{
          maxWidth: '720px',
          margin: '22px auto 0',
          textAlign: 'center',
        }}
      >
        <Link
          href="/"
          style={{
            color: '#75613c',
            fontSize: '12px',
            letterSpacing: '1px',
            textDecoration: 'none',
          }}
        >
          ← CONTINUE SHOPPING
        </Link>
      </div>
    </main>
  );
}
