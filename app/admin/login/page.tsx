
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin-client";

type MessageType = "success" | "error";

export default function AdminLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<MessageType>("error");
  const [loading, setLoading] = useState(false);

  async function handleLogin(
    e: React.FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const supabase = createAdminClient();

      const { data: loginData, error: loginError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (loginError || !loginData.user) {
        setMessageType("error");
        setMessage(
          loginError?.message || "Unable to sign in. Please try again."
        );
        return;
      }

      const { data: adminData, error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", loginData.user.id)
        .maybeSingle();

      if (adminError || !adminData) {
        // Sign out only from the admin session.
        await supabase.auth.signOut();

        setMessageType("error");
        setMessage(
          "This account is not authorized as a store admin."
        );
        return;
      }

      setMessageType("success");
      setMessage("Admin login successful.");

      router.replace("/admin");
      router.refresh();
    } catch {
      setMessageType("error");
      setMessage(
        "Unable to sign in. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: 400, margin: "80px auto", padding: 24 }}>
      <h1>SEROW Admin Login</h1>
      <p>Sign in with your store owner account.</p>

      <form onSubmit={handleLogin}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="username"
          style={{
            display: "block",
            width: "100%",
            padding: 12,
            margin: "8px 0 16px",
            boxSizing: "border-box",
          }}
        />

        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          style={{
            display: "block",
            width: "100%",
            padding: 12,
            margin: "8px 0 16px",
            boxSizing: "border-box",
          }}
        />

        {message && (
          <p
            role="alert"
            aria-live="polite"
            className={`status-message status-${messageType}`}
          >
            {messageType === "error" ? "⚠ " : "✓ "}
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            padding: 12,
            width: "100%",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </main>
  );
}
