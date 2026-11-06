
"use client";

import { useEffect, useState } from "react";
import { createAdminClient } from "@/lib/supabase/admin-client";

type Product = {
  id: string;
  name: string;
  category: string;
  price_paise: number;
  description: string | null;
  active: boolean;
  image_urls: string[];
};

type SizeStock = {
  size: string;
  stock_quantity: number;
};

type ProductColor = {
  id?: string;
  color: string;
  price_paise: number;
  image_urls: string[];
  sizes: SizeStock[];
};

type MessageType = "success" | "error";

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 10,
  marginTop: 6,
  boxSizing: "border-box",
};

export default function AdminProductsPage() {
  const supabase = createAdminClient();

  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("women");
  const [description, setDescription] = useState("");
  const [active, setActive] = useState(true);
  const [colors, setColors] = useState<ProductColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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

  async function loadProducts() {
    setLoading(true);

    try {
      const response = await fetch("/api/admin/products");
      const result = await response.json();

      if (!response.ok) {
        showError(result.error || "Could not load products.");
      } else {
        setProducts(result.products || []);
      }
    } catch {
      showError("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  async function openEditor(product: Product) {
    setLoadingEdit(true);
    clearMessage();

    try {
      const response = await fetch(`/api/admin/products/${product.id}`);
      const result = await response.json();

      if (!response.ok) {
        showError(result.error || "Could not load product details.");
        return;
      }

      setEditing(result.product);
      setName(result.product.name);
      setCategory(result.product.category);
      setDescription(result.product.description ?? "");
      setActive(result.product.active);

      const loadedColors: ProductColor[] = (result.colors || []).map(
        (color: {
          id: string;
          color: string;
          price_paise: number;
          image_urls: string[] | null;
        }) => ({
          id: color.id,
          color: color.color,
          price_paise: color.price_paise,
          image_urls: color.image_urls || [],
          sizes: (result.variants || [])
            .filter(
              (variant: { color_id: string | null }) =>
                variant.color_id === color.id
            )
            .map(
              (variant: {
                size: string;
                stock_quantity: number;
              }) => ({
                size: variant.size,
                stock_quantity: variant.stock_quantity,
              })
            ),
        })
      );

      if (loadedColors.length === 0) {
        const oldSizes = (result.variants || [])
          .filter((variant: { color_id: string | null }) => !variant.color_id)
          .map(
            (variant: {
              size: string;
              stock_quantity: number;
            }) => ({
              size: variant.size,
              stock_quantity: variant.stock_quantity,
            })
          );

        loadedColors.push({
          color: "Default",
          price_paise: result.product.price_paise,
          image_urls: result.product.image_urls || [],
          sizes: oldSizes,
        });
      }

      setColors(loadedColors);
    } catch {
      showError("Could not connect to the server.");
    } finally {
      setLoadingEdit(false);
    }
  }

  function updateColor(index: number, changes: Partial<ProductColor>) {
    setColors((previous) =>
      previous.map((color, i) =>
        i === index ? { ...color, ...changes } : color
      )
    );
  }

  function updateSize(
    colorIndex: number,
    sizeName: string,
    changes: Partial<SizeStock>
  ) {
    setColors((previous) =>
      previous.map((color, index) => {
        if (index !== colorIndex) return color;

        const exists = color.sizes.some((item) => item.size === sizeName);

        const sizes = exists
          ? color.sizes.map((item) =>
              item.size === sizeName ? { ...item, ...changes } : item
            )
          : [
              ...color.sizes,
              {
                size: sizeName,
                stock_quantity: changes.stock_quantity ?? 0,
              },
            ];

        return { ...color, sizes };
      })
    );
  }

  function toggleSize(colorIndex: number, sizeName: string, checked: boolean) {
    setColors((previous) =>
      previous.map((color, index) => {
        if (index !== colorIndex) return color;

        if (checked) {
          if (color.sizes.some((item) => item.size === sizeName)) {
            return color;
          }

          return {
            ...color,
            sizes: [
              ...color.sizes,
              { size: sizeName, stock_quantity: 0 },
            ],
          };
        }

        return {
          ...color,
          sizes: color.sizes.filter((item) => item.size !== sizeName),
        };
      })
    );
  }

  async function uploadColorImages(
    colorIndex: number,
    files: FileList | null
  ) {
    if (!files || files.length === 0) return;

    const currentColor = colors[colorIndex];
    if (!currentColor) return;

    if (currentColor.image_urls.length + files.length > 10) {
      showError(
        `Maximum 10 images are allowed for ${currentColor.color || "this color"}.`
      );
      return;
    }

    setUploading(true);
    clearMessage();

    try {
      const uploadedUrls: string[] = [];

      for (const file of Array.from(files)) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error("Only JPG, PNG, and WEBP images are allowed.");
        }

        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Each image must be 5 MB or smaller.");
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `products/${crypto.randomUUID()}-${safeName}`;

        const { error } = await supabase.storage
          .from("product-images")
          .upload(path, file, {
            cacheControl: "3600",
            upsert: false,
            contentType: file.type,
          });

        if (error) throw new Error(error.message);

        const { data } = supabase.storage
          .from("product-images")
          .getPublicUrl(path);

        uploadedUrls.push(data.publicUrl);
      }

      setColors((previous) =>
        previous.map((color, index) =>
          index === colorIndex
            ? { ...color, image_urls: [...color.image_urls, ...uploadedUrls] }
            : color
        )
      );

      showSuccess(`${uploadedUrls.length} image(s) uploaded successfully.`);
    } catch (error) {
      showError(
        error instanceof Error ? error.message : "Image upload failed."
      );
    } finally {
      setUploading(false);
    }
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editing) return;

    if (!name.trim()) {
      showError("Enter a product name.");
      return;
    }

    if (colors.length === 0) {
      showError("Add at least one color.");
      return;
    }

    for (const color of colors) {
      if (!color.color.trim()) {
        showError("Every color needs a name.");
        return;
      }

      if (
        !Number.isFinite(color.price_paise) ||
        color.price_paise < 0 ||
        color.price_paise > 100000000
      ) {
        showError(`Enter a valid price for ${color.color}.`);
        return;
      }

      if (color.sizes.length === 0) {
        showError(`Select at least one size for ${color.color}.`);
        return;
      }

      if (
        color.sizes.some(
          (item) =>
            !Number.isInteger(item.stock_quantity) ||
            item.stock_quantity < 0
        )
      ) {
        showError(`Enter valid stock quantities for ${color.color}.`);
        return;
      }
    }

    setSaving(true);
    clearMessage();

    try {
      const response = await fetch(`/api/admin/products/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          category,
          description,
          active,
          colors: colors.map((color) => ({
            id: color.id,
            color: color.color.trim(),
            price_paise: Math.round(color.price_paise),
            image_urls: color.image_urls,
            sizes: color.sizes,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        showError(result.error || "Could not save changes.");
        return;
      }

      setEditing(null);
      setColors([]);
      showSuccess(result.message || "Product updated successfully.");
      await loadProducts();
    } catch {
      showError("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct() {
    if (!editing) return;

    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${editing.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setSaving(true);
    clearMessage();

    try {
      const response = await fetch(`/api/admin/products/${editing.id}`, {
        method: "DELETE",
      });
      const result = await response.json();

      if (!response.ok) {
        showError(result.error || "Could not delete product.");
        return;
      }

      setEditing(null);
      setColors([]);
      showSuccess(result.message || "Product deleted successfully.");
      await loadProducts();
    } catch {
      showError("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 24 }}>
      <button
        type="button"
        onClick={() => {
          window.location.href = "/admin";
        }}
        style={{ padding: "10px 14px", marginBottom: 16 }}
      >
        ← Admin Dashboard
      </button>

      <h1>SEROW Products</h1>
      <p>Edit product details, colors, images, prices, and stock.</p>

      {message && (
        <p
          role={messageType === "error" ? "alert" : "status"}
          aria-live="polite"
          className={`status-message status-${messageType}`}
        >
          {message}
        </p>
      )}

      {loading ? (
        <p>Loading products...</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">Product</th>
                <th align="left">Category</th>
                <th align="left">Starting price</th>
                <th align="left">Status</th>
                <th align="left">Action</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td style={{ padding: 10 }}>{product.name}</td>
                  <td style={{ padding: 10 }}>{product.category}</td>
                  <td style={{ padding: 10 }}>
                    ₹{(product.price_paise / 100).toLocaleString("en-IN")}
                  </td>
                  <td style={{ padding: 10 }}>
                    {product.active ? "Active" : "Hidden"}
                  </td>
                  <td style={{ padding: 10 }}>
                    <button
                      type="button"
                      disabled={loadingEdit}
                      onClick={() => void openEditor(product)}
                    >
                      {loadingEdit && editing?.id === product.id
                        ? "Loading..."
                        : "Edit"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <section
          style={{
            marginTop: 32,
            padding: 20,
            border: "1px solid #ccc",
            borderRadius: 8,
          }}
        >
          <h2>Edit {editing.name}</h2>

          <form onSubmit={saveProduct}>
            <label>
              Product name
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                maxLength={150}
                style={inputStyle}
              />
            </label>

            <p>
              <label>
                Category
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  style={inputStyle}
                >
                  <option value="women">Women</option>
                  <option value="men">Men</option>
                  <option value="unisex">Unisex</option>
                </select>
              </label>
            </p>

            <label>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={5000}
                rows={4}
                style={inputStyle}
              />
            </label>

            <p>
              <label>
                <input
                  type="checkbox"
                  checked={active}
                  onChange={(event) => setActive(event.target.checked)}
                />{" "}
                Product visible in store
              </label>
            </p>

            <hr />

            <h3>Colors, prices, images, and stock</h3>
            <p>
              Each color can have its own price, photos, and size stock.
              Images are saved separately for each color.
            </p>

            {colors.map((color, colorIndex) => (
              <section
                key={color.id || `new-color-${colorIndex}`}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: 8,
                  padding: 16,
                  margin: "20px 0",
                }}
              >
                <h3>Color {colorIndex + 1}</h3>

                <label>
                  Color name
                  <input
                    value={color.color}
                    onChange={(event) =>
                      updateColor(colorIndex, { color: event.target.value })
                    }
                    maxLength={60}
                    required
                    style={inputStyle}
                  />
                </label>

                <p>
                  <label>
                    Price for this color (₹)
                    <input
                      type="number"
                      min="0"
                      max="1000000"
                      step="0.01"
                      value={(color.price_paise / 100).toFixed(2)}
                      onChange={(event) => {
                        const amount = Number(event.target.value);
                        updateColor(colorIndex, {
                          price_paise:
                            Number.isFinite(amount) && amount >= 0
                              ? Math.round(amount * 100)
                              : 0,
                        });
                      }}
                      required
                      style={inputStyle}
                    />
                  </label>
                </p>

                <h4>Images for {color.color || "this color"}</h4>
                <p>
                  JPG, PNG, or WEBP only; maximum 5 MB per image and 10 images
                  per color.
                </p>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={uploading || saving}
                  onChange={(event) => {
                    void uploadColorImages(colorIndex, event.target.files);
                    event.target.value = "";
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 16,
                    marginTop: 16,
                  }}
                >
                  {color.image_urls.map((url, imageIndex) => (
                    <div key={url} style={{ width: 145 }}>
                      <img
                        src={url}
                        alt={`${color.color} image ${imageIndex + 1}`}
                        style={{
                          width: 145,
                          height: 165,
                          objectFit: "cover",
                          border: "1px solid #ccc",
                        }}
                      />

                      <p>
                        {imageIndex === 0
                          ? "Main image"
                          : `Image ${imageIndex + 1}`}
                      </p>

                      {imageIndex !== 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            const images = [...color.image_urls];
                            const [selected] = images.splice(imageIndex, 1);
                            updateColor(colorIndex, {
                              image_urls: [selected, ...images],
                            });
                          }}
                        >
                          Make main
                        </button>
                      )}{" "}

                      <button
                        type="button"
                        onClick={() =>
                          updateColor(colorIndex, {
                            image_urls: color.image_urls.filter(
                              (_, index) => index !== imageIndex
                            ),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>

                <h4>Sizes and stock</h4>
                <p>
                  Select the sizes available for this color, then set stock for
                  each size.
                </p>

                {AVAILABLE_SIZES.map((sizeName) => {
                  const selectedSize = color.sizes.find(
                    (item) => item.size === sizeName
                  );

                  return (
                    <div
                      key={sizeName}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        margin: "12px 0",
                        flexWrap: "wrap",
                      }}
                    >
                      <label style={{ minWidth: 75 }}>
                        <input
                          type="checkbox"
                          checked={Boolean(selectedSize)}
                          onChange={(event) =>
                            toggleSize(
                              colorIndex,
                              sizeName,
                              event.target.checked
                            )
                          }
                        />{" "}
                        {sizeName}
                      </label>

                      {selectedSize && (
                        <label>
                          Stock quantity
                          <input
                            type="number"
                            min="0"
                            max="1000000"
                            step="1"
                            value={selectedSize.stock_quantity}
                            onChange={(event) =>
                              updateSize(colorIndex, sizeName, {
                                stock_quantity:
                                  event.target.value === ""
                                    ? 0
                                    : Number(event.target.value),
                              })
                            }
                            style={{ ...inputStyle, width: 130 }}
                          />
                        </label>
                      )}
                    </div>
                  );
                })}
              </section>
            ))}

            <button
              type="button"
              disabled={colors.length >= 20 || saving || uploading}
              onClick={() =>
                setColors((previous) => [
                  ...previous,
                  {
                    color: "",
                    price_paise: editing.price_paise,
                    image_urls: [],
                    sizes: [],
                  },
                ])
              }
            >
              + Add another color
            </button>

            <hr style={{ margin: "24px 0" }} />

            <button type="submit" disabled={saving || uploading}>
              {saving ? "Saving..." : "Save changes"}
            </button>{" "}

            <button
              type="button"
              disabled={saving || uploading}
              onClick={() => {
                setEditing(null);
                setColors([]);
                clearMessage();
              }}
            >
              Cancel
            </button>{" "}

            <button
              type="button"
              onClick={() => {
                window.location.href = "/admin";
              }}
            >
              ← Admin Dashboard
            </button>

            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                disabled={saving || uploading}
                onClick={() => void deleteProduct()}
                style={{
                  padding: "10px 14px",
                  background: "#7f1d1d",
                  color: "#fff",
                  border: "1px solid #991b1b",
                  borderRadius: 6,
                }}
              >
                {saving ? "Please wait..." : "Delete Product"}
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  );
}
