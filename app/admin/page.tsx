
import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/supabase/admin";
import AdminDashboard from "./dashboard";

export default async function AdminPage() {
  const allowed = await isAdmin();

  if (!allowed) {
    redirect("/admin/login");
  }

  return (
    <>
      <AdminDashboard />

      <div
        style={{
          maxWidth: "1100px",
          margin: "24px auto",
          padding: "0 24px 32px",
        }}
      >
        <Link
          href="/admin/announcements"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: "14px 20px",
            background: "#201e1a",
            color: "#d5c29b",
            border: "1px solid #927747",
            borderRadius: "4px",
            textDecoration: "none",
            fontSize: "14px",
            letterSpacing: "0.3px",
          }}
        >
          Announcement Bar Settings <span aria-hidden="true">→</span>
        </Link>
      </div>
    </>
  );
}
