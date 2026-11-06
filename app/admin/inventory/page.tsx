
"use client";

import { useEffect, useState } from "react";

type InventoryItem = {
  id: string;
  product_id: string;
  size: string;
  color: string | null;
  sku: string | null;
  stock_quantity: number;
  products:
    | { name: string; active: boolean }
    | { name: string; active: boolean }[]
    | null;
};

type MessageType = "success" | "error";

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("success");

  function showSuccess(text: string) {
    setMessage(text);
    setMessageType("success");
  }

  function showError(text: string) {
    setMessage(text);
    setMessageType("error");
  }

  function clearMessage() {
    setMessage("");
  }

  async function loadInventory() {
    setLoading(true);
    clearMessage();

    try {
      const response = await fetch("/api/admin/inventory");
      const result = await response.json();

      if (!response.ok) {
        showError(result.error || "Could not load inventory.");
        return;
      }

      const inventory: InventoryItem[] = result.inventory || [];
      setItems(inventory);

      const values: Record<string, string> = {};
      inventory.forEach((item) => {
        values[item.id] = String(item.stock_quantity);
      });

      setQuantities(values);
    } catch {
      showError("Could not connect to the inventory API.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInventory();
  }, []);

  async function saveStock(id: string) {
    const quantity = Number(quantities[id]);

    if (
      quantities[id]?.trim() === "" ||
      !Number.isSafeInteger(quantity) ||
      quantity < 0 ||
      quantity > 1000000
    ) {
      showError("Enter a whole stock quantity between 0 and 1,000,000.");
      return;
    }

    setSavingId(id);
    clearMessage();

    try {
      const response = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          stock_quantity: quantity,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showError(result.error || "Could not update stock.");
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, stock_quantity: result.variant.stock_quantity }
            : item
        )
      );

      showSuccess("Stock updated successfully.");
    } catch {
      showError("Could not connect to the inventory API.");
    } finally {
      setSavingId(null);
    }
  }

  function getProductName(item: InventoryItem) {
    const product = Array.isArray(item.products)
      ? item.products[0]
      : item.products;

    return product?.name || "Unknown product";
  }

  if (loading) {
    return <main style={{ padding: 32 }}>Loading inventory...</main>;
  }

  return (
    <main
      style={{
        padding: 32,
        maxWidth: 1100,
        margin: "0 auto",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <button onClick={() => (window.location.href = "/admin")}>
        ← Admin Dashboard
      </button>

      <h1>SEROW Inventory by Size</h1>
      <p>View and update stock for each product variant.</p>

      {message && (
        <p
          role={messageType === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`status-message status-${messageType}`}
        >
          {messageType === "success" ? "✓ " : "⚠ "}
          {message}
        </p>
      )}

      {items.length === 0 ? (
        <p>No product variants found.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 20,
            }}
          >
            <thead>
              <tr>
                {[
                  "Product",
                  "Size",
                  "Color",
                  "SKU",
                  "Current stock",
                  "Status",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: 12,
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    {getProductName(item)}
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    {item.size}
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    {item.color || "—"}
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    {item.sku || "—"}
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    <input
                      type="number"
                      min="0"
                      max="1000000"
                      step="1"
                      value={quantities[item.id] ?? ""}
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [item.id]: event.target.value,
                        }))
                      }
                      style={{ width: 85, padding: 8 }}
                      aria-label={`Stock for ${getProductName(item)} size ${item.size}`}
                    />
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    {item.stock_quantity === 0
                      ? "Sold out"
                      : item.stock_quantity <= 3
                        ? "Low stock"
                        : "In stock"}
                  </td>

                  <td style={{ padding: 12, borderBottom: "1px solid #eee" }}>
                    <button
                      onClick={() => saveStock(item.id)}
                      disabled={savingId === item.id}
                      style={{ padding: "8px 12px", cursor: "pointer" }}
                    >
                      {savingId === item.id ? "Saving..." : "Save"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={() => void loadInventory()}
        style={{ marginTop: 20, padding: "10px 16px", cursor: "pointer" }}
      >
        Refresh inventory
      </button>
    </main>
  );
}
