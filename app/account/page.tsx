
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

type Popup = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

export default function AccountPage() {
  const router = useRouter();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [popup, setPopup] = useState<Popup>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;

    async function checkSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!active) return;

      if (user) {
        router.replace('/account/profile');
        return;
      }

      setCheckingSession(false);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        router.replace('/account/profile');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  function showMessage(
    type: 'success' | 'error' | 'info',
    message: string
  ) {
    setPopup({ type, message });
  }

  function changeMode(nextMode: 'login' | 'register') {
    setMode(nextMode);
    setPopup(null);
    setPassword('');
    setConfirmPassword('');
  }

  function validateEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      showMessage('error', 'Please enter your email and password.');
      return;
    }

    if (!validateEmail(cleanEmail)) {
      showMessage('error', 'Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      showMessage('error', 'Your password must contain at least 8 characters.');
      return;
    }

    if (mode === 'register') {
      if (!name.trim()) {
        showMessage('error', 'Please enter your full name.');
        return;
      }

      if (password !== confirmPassword) {
        showMessage('error', 'Your passwords do not match.');
        return;
      }
    }

    setLoading(true);
    setPopup(null);

    const supabase = createClient();

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (error) {
          showMessage(
            'error',
            'Email or password is incorrect. If you are new to SEROW, please register first.'
          );
          return;
        }

        if (!data.user) {
          showMessage('error', 'We could not sign you in. Please try again.');
          return;
        }

        showMessage('success', 'Login successful! Welcome to SEROW.');

        window.setTimeout(() => {
          router.replace('/account/profile');
          router.refresh();
        }, 900);
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
            emailRedirectTo: `${window.location.origin}/account`,
          },
        });

        if (error) {
          const message = error.message.toLowerCase();

          if (
            message.includes('already registered') ||
            message.includes('already been registered') ||
            message.includes('already exists')
          ) {
            showMessage(
              'error',
              'This email may already have an account. Please switch to Sign In and try your password.'
            );
          } else {
            showMessage('error', error.message);
          }

          return;
        }

        if (data.session) {
          showMessage(
            'success',
            'Registration successful! Welcome to SEROW.'
          );

          window.setTimeout(() => {
            router.replace('/account/profile');
            router.refresh();
          }, 900);
        } else {
          showMessage(
            'success',
            'Registration submitted! Please check your email to confirm your account before signing in.'
          );

          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }
      }
    } catch {
      showMessage(
        'error',
        'Something went wrong. Please check your internet connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="account-page">
        <p className="account-loading">Preparing your SEROW account...</p>

        <style jsx>{`
          .account-page {
            min-height: 100vh;
            display: grid;
            place-items: center;
            background: #11110f;
            color: #d6c39b;
            font-family: Arial, sans-serif;
          }

          .account-loading {
            letter-spacing: 1px;
            font-size: 13px;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="account-page">
      <LinkHome />

      <section className="account-card">
        <div className="account-brand">
          <div className="brand-mark">S</div>
          <p className="brand-name">SEROW</p>
          <p className="brand-tagline">THE ART OF DRESSING</p>
        </div>

        <div className="account-heading">
          <p className="eyebrow">
            {mode === 'login' ? 'WELCOME BACK' : 'JOIN THE SEROW WORLD'}
          </p>

          <h1>
            {mode === 'login' ? (
              <>
                Sign in to
                <br />
                <em>your account.</em>
              </>
            ) : (
              <>
                Begin your
                <br />
                <em>story with us.</em>
              </>
            )}
          </h1>

          <p className="description">
            {mode === 'login'
              ? 'Enter your details to access your SEROW account.'
              : 'Create an account for a more personal shopping experience.'}
          </p>
        </div>

        <div className="mode-switch">
          <button
            type="button"
            className={mode === 'login' ? 'mode-active' : ''}
            onClick={() => changeMode('login')}
          >
            SIGN IN
          </button>

          <button
            type="button"
            className={mode === 'register' ? 'mode-active' : ''}
            onClick={() => changeMode('register')}
          >
            REGISTER
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <label>
              FULL NAME
              <input
                type="text"
                autoComplete="name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                required
              />
            </label>
          )}

          <label>
            EMAIL ADDRESS
            <input
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </label>

          <label>
            PASSWORD
            <div className="password-wrap">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
              />

              <button
                type="button"
                className="show-password"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'HIDE' : 'SHOW'}
              </button>
            </div>
          </label>

          {mode === 'register' && (
            <label>
              CONFIRM PASSWORD
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="Enter your password again"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                required
              />
            </label>
          )}

          <button className="submit-button" type="submit" disabled={loading}>
            {loading
              ? 'PLEASE WAIT...'
              : mode === 'login'
                ? 'SIGN IN TO SEROW ↗'
                : 'CREATE ACCOUNT ↗'}
          </button>
        </form>

        <p className="switch-prompt">
          {mode === 'login'
            ? 'New to SEROW?'
            : 'Already have a SEROW account?'}{' '}
          <button
            type="button"
            onClick={() =>
              changeMode(mode === 'login' ? 'register' : 'login')
            }
          >
            {mode === 'login' ? 'Register here' : 'Sign in here'}
          </button>
        </p>

        <p className="privacy-note">
          YOUR DETAILS ARE USED TO MANAGE YOUR SEROW ACCOUNT.
        </p>
      </section>

      {popup && (
        <div
          className="popup-backdrop"
          role="presentation"
          onClick={() => setPopup(null)}
        >
          <section
            className={`popup-card popup-${popup.type}`}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="popup-title"
            aria-describedby="popup-message"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="popup-symbol" aria-hidden="true">
              {popup.type === 'success'
                ? '✓'
                : popup.type === 'error'
                  ? '!'
                  : 'i'}
            </div>

            <h2 id="popup-title">
              {popup.type === 'success'
                ? 'SUCCESS'
                : popup.type === 'error'
                  ? 'PLEASE CHECK'
                  : 'NOTICE'}
            </h2>

            <p id="popup-message">{popup.message}</p>

            <button
              type="button"
              onClick={() => setPopup(null)}
              autoFocus
            >
              CONTINUE
            </button>
          </section>
        </div>
      )}

      <style jsx>{`
        .account-page {
          min-height: 100vh;
          padding: 36px 20px 60px;
          background:
            radial-gradient(ellipse at top, #27231b 0%, transparent 55%),
            #11110f;
          color: #f2eee5;
          font-family: Arial, sans-serif;
        }

        .account-card {
          width: 100%;
          max-width: 460px;
          margin: 22px auto 0;
          padding: 38px 34px;
          border: 1px solid #3b3529;
          background: rgba(24, 23, 20, 0.96);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.25);
        }

        .account-brand {
          text-align: center;
          margin-bottom: 35px;
        }

        .brand-mark {
          display: grid;
          place-items: center;
          width: 44px;
          height: 44px;
          margin: 0 auto 10px;
          border: 1px solid #b99b60;
          color: #d7bf8d;
          font-family: Georgia, serif;
          font-size: 25px;
        }

        .brand-name {
          margin: 0;
          letter-spacing: 7px;
          font-size: 17px;
        }

        .brand-tagline {
          margin: 9px 0 0;
          color: #a99a7d;
          font-size: 9px;
          letter-spacing: 2px;
        }

        .eyebrow {
          color: #c3a66c;
          font-size: 10px;
          letter-spacing: 2px;
        }

        .account-heading h1 {
          margin: 14px 0;
          font-family: Georgia, serif;
          font-size: clamp(32px, 7vw, 42px);
          font-weight: 400;
          line-height: 1.15;
        }

        .account-heading h1 em {
          color: #c9b184;
          font-weight: 400;
        }

        .description {
          color: #aaa59b;
          font-size: 13px;
          line-height: 1.7;
        }

        .mode-switch {
          display: grid;
          grid-template-columns: 1fr 1fr;
          margin: 28px 0;
          border-bottom: 1px solid #474033;
        }

        .mode-switch button {
          padding: 13px 8px;
          border: 0;
          border-bottom: 2px solid transparent;
          background: transparent;
          color: #928d82;
          font-size: 11px;
          letter-spacing: 1.5px;
          cursor: pointer;
        }

        .mode-switch button.mode-active {
          border-bottom-color: #c4a66c;
          color: #e3c990;
        }

        form {
          display: grid;
          gap: 19px;
        }

        label {
          display: grid;
          gap: 9px;
          color: #d2c6ad;
          font-size: 10px;
          letter-spacing: 1.2px;
        }

        input {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          padding: 14px;
          border: 1px solid #494337;
          border-radius: 0;
          outline: none;
          background: #141310;
          color: #f2eee5;
          font-family: Arial, sans-serif;
          font-size: 13px;
          letter-spacing: normal;
        }

        input:focus {
          border-color: #b99b60;
        }

        input::placeholder {
          color: #77736a;
        }

        input:disabled {
          opacity: 0.65;
        }

        .password-wrap {
          position: relative;
        }

        .password-wrap input {
          padding-right: 64px;
        }

        .show-password {
          position: absolute;
          top: 50%;
          right: 12px;
          transform: translateY(-50%);
          border: 0;
          background: transparent;
          color: #c8ad77;
          font-size: 9px;
          letter-spacing: 1px;
          cursor: pointer;
        }

        .submit-button {
          width: 100%;
          margin-top: 8px;
          padding: 16px 12px;
          border: 1px solid #c4a66c;
          background: #c4a66c;
          color: #17150f;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          cursor: pointer;
        }

        .submit-button:hover {
          background: #d7bf8d;
        }

        .submit-button:disabled {
          cursor: wait;
          opacity: 0.65;
        }

        .switch-prompt {
          margin: 27px 0 0;
          color: #aaa59b;
          text-align: center;
          font-size: 12px;
        }

        .switch-prompt button {
          padding: 0;
          border: 0;
          background: transparent;
          color: #ddc28c;
          text-decoration: underline;
          cursor: pointer;
          font: inherit;
        }

        .privacy-note {
          margin: 28px 0 0;
          color: #716c61;
          font-size: 9px;
          letter-spacing: 1px;
          line-height: 1.7;
          text-align: center;
        }

        .popup-backdrop {
          position: fixed;
          z-index: 9999;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 20px;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(5px);
        }

        .popup-card {
          box-sizing: border-box;
          width: 100%;
          max-width: 360px;
          padding: 32px 25px 25px;
          border: 1px solid #554832;
          background: #1d1b17;
          color: #f2eee5;
          text-align: center;
          box-shadow: 0 20px 70px rgba(0, 0, 0, 0.5);
        }

        .popup-symbol {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          margin: 0 auto 17px;
          border: 1px solid #c4a66c;
          border-radius: 50%;
          color: #d9bf8b;
          font-size: 21px;
        }

        .popup-card h2 {
          margin: 0 0 12px;
          font-family: Georgia, serif;
          font-size: 20px;
          font-weight: 400;
          letter-spacing: 2px;
        }

        .popup-card p {
          margin: 0 0 24px;
          color: #c0b9ac;
          font-size: 13px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .popup-card > button {
          width: 100%;
          padding: 13px;
          border: 1px solid #c4a66c;
          background: #c4a66c;
          color: #17150f;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 1.5px;
          cursor: pointer;
        }

        .popup-error {
          border-color: #7b4540;
        }

        .popup-error .popup-symbol {
          border-color: #c87569;
          color: #e39a8f;
        }

        .popup-info .popup-symbol {
          border-color: #8c9eb2;
          color: #b4c9df;
        }

        @media (max-width: 480px) {
          .account-page {
            padding: 24px 14px 40px;
          }

          .account-card {
            padding: 28px 20px;
          }
        }
      `}</style>
    </main>
  );
}

function LinkHome() {
  return (
    <Link
      href="/"
      style={{
        display: 'inline-block',
        color: '#c9b184',
        textDecoration: 'none',
        fontSize: '11px',
        letterSpacing: '1px',
      }}
    >
      ← BACK TO SEROW
    </Link>
  );
}
