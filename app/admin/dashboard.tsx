
"use client";

import { useRouter } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin-client";

export default function AdminDashboard() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createAdminClient();

    await supabase.auth.signOut();

    router.replace("/admin/login");
    router.refresh();
  }

  const buttonStyle = {
    padding: "14px 20px",
    fontSize: "16px",
    cursor: "pointer",
    textAlign: "left" as const,
    background: "#171717",
    color: "#ffffff",
    border: "1px solid #444",
    borderRadius: "8px",
    width: "100%",
  };

  return (
    <main
      style={{
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
        color: "#171717",
      }}
    >
      <h1>SEROW Admin Dashboard</h1>
      <p>Welcome to your store management dashboard.</p>

      <h2>Store Management</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "16px",
          marginTop: "24px",
        }}
      >
        <button
          style={buttonStyle}
          onClick={() => router.push("/admin/products")}
        >
          Edit Products →
        </button>

        <button
          style={buttonStyle}
          onClick={() => router.push("/admin/inventory")}
        >
          Inventory by Size →
        </button>

        <button
          style={buttonStyle}
          onClick={() => router.push("/admin/products/new")}
        >
          Add New Product →
        </button>

        <button
          style={buttonStyle}
          onClick={() => router.push("/admin/orders")}
        >
          Manage Orders →
        </button>
      </div>

      <button
        onClick={handleLogout}
        style={{
          marginTop: "32px",
          padding: "10px 16px",
          cursor: "pointer",
        }}
      >
        Sign out
      </button>
    </main>
  );
}
