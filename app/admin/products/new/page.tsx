
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin-client";

const sizes = ["XS", "S", "M", "L", "XL", "XXL"];

type ColorForm = {
  id: string;
  color: string;
  price: string;
  files: File[];
  selectedSizes: string[];
  stockBySize: Record<string, string>;
};

type MessageType = "success" | "error";

function createColor(): ColorForm {
  return {
    id: crypto.randomUUID(),
    color: "",
    price: "",
    files: [],
    selectedSizes: ["S", "M", "L"],
    stockBySize: {
      XS: "0",
      S: "10",
      M: "10",
      L: "10",
      XL: "0",
      XXL: "0",
    },
  };
}

export default function NewProductPage() {
  const router = useRouter();
  const supabase = createAdminClient();

  const [name, setName] = useState("");
  const [category, setCategory] = useState("unisex");
  const [description, setDescription] = useState("");
  const [colors, setColors] = useState<ColorForm[]>([createColor()]);
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("error");

  function showMessage(text: string, type: MessageType = "error") {
    setMessage(text);
    setMessageType(type);
  }

  function clearMessage() {
    setMessage("");
  }

  function updateColor(id: string, updates: Partial<ColorForm>) {
    setColors((current) =>
      current.map((color) =>
        color.id === id ? { ...color, ...updates } : color
      )
    );
  }

  function toggleSize(id: string, size: string) {
    setColors((current) =>
      current.map((color) => {
        if (color.id !== id) return color;

        return {
          ...color,
          selectedSizes: color.selectedSizes.includes(size)
            ? color.selectedSizes.filter((item) => item !== size)
            : [...color.selectedSizes, size],
        };
      })
    );
  }

  function handleImageSelection(
    id: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);

    clearMessage();

    const currentColor = colors.find((color) => color.id === id);
    if (!currentColor) return;

    if (currentColor.files.length + files.length > 10) {
      showMessage("Each color can have a maximum of 10 images.");
      input.value = "";
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    for (const file of files) {
      if (!allowedTypes.includes(file.type)) {
        showMessage("Use JPG, PNG or WEBP images only.");
        input.value = "";
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        showMessage(`"${file.name}" exceeds the 5 MB limit.`);
        input.value = "";
        return;
      }
    }

    const newFiles = files.filter(
      (file) =>
        !currentColor.files.some(
          (existing) =>
            existing.name === file.name && existing.size === file.size
        )
    );

    updateColor(id, {
      files: [...currentColor.files, ...newFiles].slice(0, 10),
    });
  }

  function moveImageToMain(colorId: string, imageIndex: number) {
    const color = colors.find((item) => item.id === colorId);
    if (!color) return;

    const files = [...color.files];
    const [selected] = files.splice(imageIndex, 1);
    if (!selected) return;

    files.unshift(selected);
    updateColor(colorId, { files });
  }

  async function uploadImages(files: File[]): Promise<string[]> {
    const imageUrls: string[] = [];

    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const safeExtension =
        extension === "png" || extension === "webp" ? extension : "jpg";

      const filePath = `products/${crypto.randomUUID()}.${safeExtension}`;

      const { error } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error("Image upload failed:", error.message);
        throw new Error(
          `Could not upload "${file.name}". Check storage permissions and try again.`
        );
      }

      const { data } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      imageUrls.push(data.publicUrl);
    }

    return imageUrls;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessage();

    if (!name.trim()) {
      showMessage("Enter a product name.");
      return;
    }

    if (colors.length === 0) {
      showMessage("Add at least one color.");
      return;
    }

    const seenColors = new Set<string>();

    for (const color of colors) {
      const normalizedColor = color.color.trim().toLowerCase();

      if (!normalizedColor) {
        showMessage("Enter a name for every color.");
        return;
      }

      if (seenColors.has(normalizedColor)) {
        showMessage(
          `The color "${color.color}" has been added more than once.`
        );
        return;
      }

      seenColors.add(normalizedColor);

      if (
        !color.price.trim() ||
        !Number.isFinite(Number(color.price)) ||
        Number(color.price) <= 0 ||
        Number(color.price) > 1000000
      ) {
        showMessage(`Enter a valid price for ${color.color}.`);
        return;
      }

      if (color.selectedSizes.length === 0) {
        showMessage(`Select at least one size for ${color.color}.`);
        return;
      }

      for (const size of color.selectedSizes) {
        const quantity = color.stockBySize[size];

        if (
          quantity === undefined ||
          quantity.trim() === "" ||
          !Number.isSafeInteger(Number(quantity)) ||
          Number(quantity) < 0 ||
          Number(quantity) > 1000000
        ) {
          showMessage(`Enter valid ${size} stock for ${color.color}.`);
          return;
        }
      }
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        showMessage("Please sign in to your admin account again.");
        return;
      }

      const submittedColors = [];

      for (const color of colors) {
        const imageUrls = await uploadImages(color.files);

        submittedColors.push({
          color: color.color.trim(),
          price_paise: Math.round(Number(color.price) * 100),
          image_urls: imageUrls,
          sizes: color.selectedSizes.map((size) => ({
            size,
            stock_quantity: Number(color.stockBySize[size]),
          })),
        });
      }

      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          description: description.trim(),
          active,
          colors: submittedColors,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        showMessage(result.error || "Could not create the product.");
        return;
      }

      showMessage(
        result.message || `Product "${name.trim()}" created successfully!`,
        "success"
      );

      window.setTimeout(() => {
        router.push("/admin/products");
        router.refresh();
      }, 1200);
    } catch (error) {
      console.error("Product creation failed:", error);

      showMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: "100%",
    padding: "12px",
    marginTop: "6px",
    border: "1px solid #444",
    borderRadius: "6px",
    background: "#111",
    color: "#fff",
    boxSizing: "border-box" as const,
  };

  const buttonStyle = {
    padding: "9px 12px",
    background: "transparent",
    color: "#eee",
    border: "1px solid #555",
    borderRadius: "6px",
    cursor: "pointer",
  };

  const totalStock = colors.reduce(
    (total, color) =>
      total +
      color.selectedSizes.reduce(
        (subtotal, size) =>
          subtotal + (Number(color.stockBySize[size]) || 0),
        0
      ),
    0
  );

  return (
    <main
      style={{
        maxWidth: "800px",
        margin: "0 auto",
        padding: "32px 20px",
        background: "#080808",
        color: "#f5f5f5",
        minHeight: "100vh",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <button
        type="button"
        onClick={() => router.push("/admin")}
        style={buttonStyle}
      >
        ← Admin Dashboard
      </button>

      <h1 style={{ marginTop: "28px" }}>Add New Product</h1>

      <p style={{ color: "#aaa" }}>
        Add a product with different colors, prices, photo galleries and
        size-wise stock.
      </p>

      <form onSubmit={handleSubmit}>
        <label style={{ display: "block" }}>
          Product name
          <input
            style={inputStyle}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="e.g. Embroidered Kurta"
            maxLength={150}
            required
          />
        </label>

        <label style={{ display: "block", marginTop: "20px" }}>
          Category
          <select
            style={inputStyle}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
          </select>
        </label>

        <label style={{ display: "block", marginTop: "20px" }}>
          Description
          <textarea
            style={{ ...inputStyle, minHeight: "100px" }}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={5000}
            placeholder="Describe the product..."
          />
        </label>

        <h2 style={{ marginTop: "32px" }}>Colors and Variants</h2>

        <p style={{ color: "#aaa", fontSize: "14px" }}>
          Each color has its own price and photos. Stock is tracked separately
          for every size within each color.
        </p>

        {colors.map((color, colorIndex) => (
          <section
            key={color.id}
            style={{
              marginTop: "20px",
              padding: "18px",
              border: "1px solid #444",
              borderRadius: "10px",
              background: "#101010",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <h3 style={{ margin: 0 }}>Color {colorIndex + 1}</h3>

              {colors.length > 1 && (
                <button
                  type="button"
                  style={buttonStyle}
                  onClick={() => {
                    setColors((current) =>
                      current.filter((item) => item.id !== color.id)
                    );
                    clearMessage();
                  }}
                >
                  Remove color
                </button>
              )}
            </div>

            <label style={{ display: "block", marginTop: "18px" }}>
              Color name
              <input
                style={inputStyle}
                value={color.color}
                onChange={(event) =>
                  updateColor(color.id, { color: event.target.value })
                }
                placeholder="e.g. Plum, Black, Olive Green"
                maxLength={60}
                required
              />
            </label>

            <label style={{ display: "block", marginTop: "18px" }}>
              Price for this color (₹)
              <input
                style={inputStyle}
                type="number"
                min="0.01"
                max="1000000"
                step="0.01"
                value={color.price}
                onChange={(event) =>
                  updateColor(color.id, { price: event.target.value })
                }
                placeholder="1499"
                required
              />
            </label>

            <label style={{ display: "block", marginTop: "18px" }}>
              Upload photos for {color.color.trim() || "this color"}
              <input
                style={inputStyle}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(event) => handleImageSelection(color.id, event)}
              />
              <span
                style={{
                  display: "block",
                  marginTop: "8px",
                  color: "#aaa",
                  fontSize: "13px",
                }}
              >
                Up to 10 images per color, maximum 5 MB per image.
              </span>
            </label>

            {color.files.length > 0 && (
              <div style={{ marginTop: "14px" }}>
                <p style={{ color: "#d8bd83", fontSize: "13px" }}>
                  {color.files.length} photo(s) selected. The first photo is
                  the main image for this color.
                </p>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  {color.files.map((file, index) => (
                    <div
                      key={`${file.name}-${file.size}-${index}`}
                      style={{ width: "115px" }}
                    >
                      <img
                        src={URL.createObjectURL(file)}
                        alt={`${color.color || "Product"} ${index + 1}`}
                        style={{
                          width: "110px",
                          height: "125px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: "1px solid #444",
                        }}
                      />

                      <p
                        style={{
                          color: index === 0 ? "#d8bd83" : "#aaa",
                          fontSize: "11px",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {index === 0 ? "★ Main image" : file.name}
                      </p>

                      {index !== 0 && (
                        <button
                          type="button"
                          style={buttonStyle}
                          onClick={() => moveImageToMain(color.id, index)}
                        >
                          Make main
                        </button>
                      )}

                      <button
                        type="button"
                        style={{ ...buttonStyle, marginTop: "5px" }}
                        onClick={() =>
                          updateColor(color.id, {
                            files: color.files.filter(
                              (_, fileIndex) => fileIndex !== index
                            ),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <fieldset
              style={{
                marginTop: "24px",
                padding: "14px",
                border: "1px solid #444",
                borderRadius: "8px",
              }}
            >
              <legend>Available sizes for {color.color || "this color"}</legend>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "16px",
                }}
              >
                {sizes.map((size) => (
                  <label
                    key={size}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={color.selectedSizes.includes(size)}
                      onChange={() => toggleSize(color.id, size)}
                    />
                    {size}
                  </label>
                ))}
              </div>
            </fieldset>

            <h4 style={{ marginTop: "22px" }}>Initial stock by size</h4>

            {color.selectedSizes.map((size) => (
              <label
                key={size}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  marginTop: "12px",
                }}
              >
                <span style={{ width: "38px", fontWeight: "bold" }}>
                  {size}
                </span>

                <input
                  style={{
                    ...inputStyle,
                    marginTop: 0,
                    maxWidth: "180px",
                  }}
                  type="number"
                  min="0"
                  max="1000000"
                  step="1"
                  value={color.stockBySize[size] ?? "0"}
                  onChange={(event) =>
                    updateColor(color.id, {
                      stockBySize: {
                        ...color.stockBySize,
                        [size]: event.target.value,
                      },
                    })
                  }
                  required
                />

                <span style={{ color: "#aaa" }}>pieces</span>
              </label>
            ))}

            <p style={{ marginTop: "18px", color: "#d8bd83" }}>
              Stock for this color:{" "}
              {color.selectedSizes.reduce(
                (sum, size) =>
                  sum + (Number(color.stockBySize[size]) || 0),
                0
              )}{" "}
              pieces
            </p>
          </section>
        ))}

        <button
          type="button"
          onClick={() => {
            if (colors.length >= 20) {
              showMessage("You can add up to 20 colors per product.");
              return;
            }

            clearMessage();
            setColors((current) => [...current, createColor()]);
          }}
          style={{
            ...buttonStyle,
            marginTop: "18px",
            borderColor: "#d8bd83",
            color: "#d8bd83",
          }}
        >
          + Add another color
        </button>

        <p style={{ marginTop: "22px", fontWeight: "bold" }}>
          Total initial stock across all colors: {totalStock} pieces
        </p>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginTop: "24px",
          }}
        >
          <input
            type="checkbox"
            checked={active}
            onChange={(event) => setActive(event.target.checked)}
          />
          Publish product on the storefront
        </label>

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

        <button
          type="submit"
          disabled={saving}
          style={{
            marginTop: "26px",
            padding: "14px 22px",
            background: "#eee",
            color: "#111",
            border: "none",
            borderRadius: "6px",
            cursor: saving ? "wait" : "pointer",
            fontWeight: "bold",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Uploading photos and saving..." : "Create Product"}
        </button>
      </form>
    </main>
  );
}
