
'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Product, ProductColor } from '@/lib/supabase/products';
import { createClient } from '@/lib/supabase/client';

type CartLine = {
  id: string;
  colorId: string;
  color: string;
  size: string;
  qty: number;
};

type Announcement = {
  message: string;
  is_enabled: boolean;
};

const DEFAULT_ANNOUNCEMENT = 'QUIET LUXURY · TIMELESS STYLE';

const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

function SerowLogo({ footer = false }: { footer?: boolean }) {
  return (
    <a
      href="#top"
      className={`serow-brand-lockup${footer ? ' serow-brand-footer' : ''}`}
      aria-label="SEROW home"
    >
      <img
        src="/serow-logo.jpeg"
        alt="SEROW goat emblem"
        className="serow-brand-emblem"
      />

      <span className="serow-brand-copy">
        <span className="serow-brand-name">SEROW</span>
        <span className="serow-tagline">THE ART OF DRESSING</span>
        <span className="serow-subtagline">
          QUIET LUXURY · TIMELESS STYLE
        </span>
      </span>
    </a>
  );
}

export default function Storefront({
  products,
}: {
  products: Product[];
}) {
  const router = useRouter();

  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [productType, setProductType] = useState('All');
  const [sortBy, setSortBy] = useState('newest');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  const [selectedColor, setSelectedColor] = useState<
    Record<string, string>
  >({});

  const [selectedSize, setSelectedSize] = useState<
    Record<string, string>
  >({});

  const [activeImage, setActiveImage] = useState<
    Record<string, number>
  >({});

  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<
    'success' | 'error'
  >('success');

  const [isSignedIn, setIsSignedIn] = useState(false);

  const [announcement, setAnnouncement] = useState<Announcement>({
    message: DEFAULT_ANNOUNCEMENT,
    is_enabled: true,
  });

  useEffect(() => {
    let active = true;

    async function loadAnnouncement() {
      try {
        const response = await fetch('/api/announcement', {
          cache: 'no-store',
        });

        if (!response.ok) {
          console.error(
            'Could not load announcement:',
            response.status
          );
          return;
        }

        const data = await response.json();

        if (!active) return;

        setAnnouncement({
          message:
            typeof data.message === 'string'
              ? data.message
              : DEFAULT_ANNOUNCEMENT,
          is_enabled: data.is_enabled === true,
        });
      } catch (error) {
        console.error('Could not load announcement:', error);
      }
    }

    loadAnnouncement();

    return () => {
      active = false;
    };
  }, []);

  

  // Restore the shopping bag after refresh.
useEffect(() => {
  try {
    const savedCart = localStorage.getItem('serow_cart');

    if (savedCart) {
      const parsed: unknown = JSON.parse(savedCart);

      if (Array.isArray(parsed)) {
        setCart(
          parsed.filter(
            (line): line is CartLine =>
              line !== null &&
              typeof line === 'object' &&
              typeof line.id === 'string' &&
              typeof line.colorId === 'string' &&
              typeof line.color === 'string' &&
              typeof line.size === 'string' &&
              Number.isInteger(line.qty) &&
              line.qty > 0
          )
        );
      }
    }
  } catch (error) {
    console.error('Could not restore shopping bag:', error);
  } finally {
    setCartLoaded(true);
  }
}, []);


// Update the shopping bag when checkout clears it.
useEffect(() => {
  const handleCartUpdate = () => {
    try {
      const savedCart = localStorage.getItem('serow_cart');
      setCart(savedCart ? JSON.parse(savedCart) : []);
    } catch {
      setCart([]);
    }
  };

  window.addEventListener('serow-cart-updated', handleCartUpdate);

  return () => {
    window.removeEventListener('serow-cart-updated', handleCartUpdate);
  };
}, []);

// Save cart changes after the initial restore.
useEffect(() => {
  if (!cartLoaded) return;

  try {
    localStorage.setItem('serow_cart', JSON.stringify(cart));
  } catch (error) {
    console.error('Could not save shopping bag:', error);
  }
}, [cart, cartLoaded]);


  useEffect(() => {
    const supabase = createClient();

    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setIsSignedIn(Boolean(user));
    }

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsSignedIn(Boolean(session?.user));
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const productTypes = useMemo(
  () => ['All', ...Array.from(new Set(products.map((p) => p.type)))],
  [products]
);

const shown = useMemo(() => {
  let result = products.filter((p) => {
    const matchesCategory =
      category === 'All' || p.category === category;

    const matchesSearch =
      `${p.name} ${p.type} ${p.category}`
        .toLowerCase()
        .includes(search.trim().toLowerCase());

    const matchesType =
      productType === 'All' || p.type === productType;

    const price = Math.min(
      ...p.colors.map((color) => color.price),
      p.price
    );

    const matchesMin =
      minPrice === '' || price >= Number(minPrice);

    const matchesMax =
      maxPrice === '' || price <= Number(maxPrice);

    return (
      matchesCategory &&
      matchesSearch &&
      matchesType &&
      matchesMin &&
      matchesMax
    );
  });

  if (sortBy === 'price-low') {
    result.sort((a, b) => a.price - b.price);
  } else if (sortBy === 'price-high') {
    result.sort((a, b) => b.price - a.price);
  } else if (sortBy === 'name') {
    result.sort((a, b) => a.name.localeCompare(b.name));
  }

  // "newest" preserves the original Supabase order.
  return result;
}, [
  products,
  category,
  search,
  productType,
  sortBy,
  minPrice,
  maxPrice,
]);

  function getColor(p: Product): ProductColor | undefined {
    const colorId = selectedColor[p.id];
    return p.colors.find((c) => c.id === colorId) ?? p.colors[0];
  }

  function getStock(color: ProductColor | undefined, size: string) {
    return color?.stockBySize[size] ?? 0;
  }

  function getAvailableSizes(color: ProductColor | undefined) {
    if (!color) return [];
    return color.sizes.filter((size) => getStock(color, size) > 0);
  }

  const total = cart.reduce((sum, line) => {
    const p = products.find((item) => item.id === line.id);
    const color = p?.colors.find((c) => c.id === line.colorId);

    return sum + (color?.price ?? p?.price ?? 0) * line.qty;
  }, 0);

  function notify(
    message: string,
    type: 'success' | 'error' = 'success'
  ) {
    setNoticeType(type);
    setNotice(message);

    window.setTimeout(() => {
      setNotice((current) => (current === message ? '' : current));
    }, 2400);
  }

  function chooseColor(product: Product, colorId: string) {
    const color = product.colors.find((c) => c.id === colorId);

    setSelectedColor((prev) => ({
      ...prev,
      [product.id]: colorId,
    }));

    setSelectedSize((prev) => ({
      ...prev,
      [product.id]:
        color?.sizes.find((size) => getStock(color, size) > 0) ?? '',
    }));

    setActiveImage((prev) => ({
      ...prev,
      [product.id]: 0,
    }));
  }

  function add(id: string) {
    const p = products.find((item) => item.id === id);
    if (!p) return;

    const color = getColor(p);

    if (!color) {
      notify(
        'Sorry, this product has no available color options.',
        'error'
      );
      return;
    }

    const availableSizes = getAvailableSizes(color);

    const size =
      selectedSize[id] && availableSizes.includes(selectedSize[id])
        ? selectedSize[id]
        : availableSizes[0];

    if (!size) {
      notify('Sorry, this color is sold out.', 'error');
      return;
    }

    const stock = getStock(color, size);

    const existingQty =
      cart.find(
        (line) =>
          line.id === id &&
          line.colorId === color.id &&
          line.size === size
      )?.qty ?? 0;

    if (existingQty >= stock) {
      notify(
        'Sorry, you have reached the available stock limit.',
        'error'
      );
      return;
    }

    setCart((prev) => {
      const found = prev.find(
        (line) =>
          line.id === id &&
          line.colorId === color.id &&
          line.size === size
      );

      return found
        ? prev.map((line) =>
            line.id === id &&
            line.colorId === color.id &&
            line.size === size
              ? { ...line, qty: line.qty + 1 }
              : line
          )
        : [
            ...prev,
            {
              id,
              colorId: color.id,
              color: color.color,
              size,
              qty: 1,
            },
          ];
    });

    notify(`${p.name} · ${color.color} · ${size} added to bag`);
  }

  function changeQty(line: CartLine, delta: number) {
    const p = products.find((item) => item.id === line.id);
    const color = p?.colors.find((c) => c.id === line.colorId);

    if (!p || !color) return;

    setCart((prev) => {
      const nextQty = line.qty + delta;
      const stock = getStock(color, line.size);

      if (delta > 0 && nextQty > stock) {
        notify(
          'You have reached the available stock limit.',
          'error'
        );
        return prev;
      }

      return nextQty <= 0
        ? prev.filter(
            (item) =>
              !(
                item.id === line.id &&
                item.colorId === line.colorId &&
                item.size === line.size
              )
          )
        : prev.map((item) =>
            item.id === line.id &&
            item.colorId === line.colorId &&
            item.size === line.size
              ? { ...item, qty: nextQty }
              : item
          );
    });
  }

  // Save the selected cart items and navigate to checkout.
  function goToCheckout() {
    if (!isSignedIn) {
      notify('Please sign in before checkout.', 'error');
      router.push('/account');
      return;
    }

    if (cart.length === 0) {
      notify('Your shopping bag is empty.', 'error');
      return;
    }

    const checkoutItems = cart.map((line) => {
      const product = products.find((p) => p.id === line.id);
      const color = product?.colors.find(
        (c) => c.id === line.colorId
      );

      return {
        product_id: line.id,
        color_id: line.colorId,
        color: line.color,
        size: line.size,
        quantity: line.qty,
        product_name: product?.name ?? 'Product',
        price: color?.price ?? product?.price ?? 0,
        image: color?.images[0] ?? product?.image ?? '',
      };
    });

    try {
      sessionStorage.setItem(
        'serow_checkout_items',
        JSON.stringify(checkoutItems)
      );

      setCartOpen(false);
      router.push('/checkout');
    } catch (error) {
      console.error('Could not save checkout items:', error);
      notify('Could not open checkout. Please try again.', 'error');
    }
  }

  const cartCount = cart.reduce((sum, line) => sum + line.qty, 0);

  return (
    <main>
      {announcement.is_enabled && announcement.message.trim() && (
        <div className="announcement">{announcement.message}</div>
      )}

      <header className="nav">
        <SerowLogo />

        <nav aria-label="Main navigation">
          <a href="#shop">Shop all</a>
          <button onClick={() => setCategory('Women')}>Women</button>
          <button onClick={() => setCategory('Men')}>Men</button>
          <a href="#story">Our approach</a>
        </nav>

        <div
          className="nav-actions"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '12px',
            flexShrink: 0,
          }}
        >
          <Link
            href="/account/dashboard"
            aria-label={isSignedIn ? 'My account' : 'Sign in to your account'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '7px',
              padding: '10px 13px',
              minHeight: '40px',
              border: '1px solid #927747',
              borderRadius: '4px',
              color: '#d5c29b',
              background: '#201e1a',
              textDecoration: 'none',
              fontSize: '11px',
              letterSpacing: '1px',
              whiteSpace: 'nowrap',
              cursor: 'pointer',
            }}
          >
            <span aria-hidden="true">♙</span>
            {isSignedIn ? 'MY ACCOUNT' : 'SIGN IN'}
          </Link>

          <button
            className="bag"
            onClick={() => setCartOpen(true)}
            aria-label={`Open shopping bag with ${cartCount} items`}
          >
            Bag ({cartCount})
          </button>
        </div>
      </header>

      {/* Main editorial hero */}
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">SEROW STUDIO · THE ART OF DRESSING</p>

          <h1>
            Elegance is an
            <br />
            <em>attitude.</em>
          </h1>

          <p className="hero-sub">
            Discover thoughtfully selected styles that make every day feel
            exceptional.
          </p>

          <a className="dark-button" href="#shop">
            Explore the collection <span>↗</span>
          </a>

          <p className="hero-note">PERSONAL STYLE. TIMELESS FEELING.</p>
        </div>

        <div
          className="hero-image"
          role="img"
          aria-label="Fashion editorial featuring everyday clothing"
        >
          <div className="hero-label">
            THE SEROW EDIT
            <br />
            <span>SIMPLICITY, REDEFINED.</span>
          </div>
        </div>

        <div className="hero-index">01 / SEROW STUDIO</div>
      </section>

      {/* Brand values strip */}
      <section className="serow-values" aria-label="Our design philosophy">
        <div>
          <span className="value-symbol">✳</span>
          <p>THOUGHTFUL STYLE</p>
        </div>

        <span className="value-divider" aria-hidden="true" />

        <div>
          <span className="value-symbol">◇</span>
          <p>TIMELESS DETAILS</p>
        </div>

        <span className="value-divider" aria-hidden="true" />

        <div>
          <span className="value-symbol">✧</span>
          <p>YOUR EVERYDAY EDIT</p>
        </div>
      </section>

      {/* Brand story */}
      <section className="intro" id="story">
        <p className="eyebrow">THE SEROW PHILOSOPHY</p>

        <h2>
          Less noise.
          <br />
          <em>More you.</em>
        </h2>

        <p>
          Personal style should feel effortless. Discover pieces that bring
          together considered details, versatile styling and a modern point
          of view.
        </p>

        <a href="#shop" className="text-link">
          Discover your style ↗
        </a>
      </section>

      {/* Collection */}
      <section className="shop-section" id="shop">
        <div className="section-heading">
          <div>
            <p className="eyebrow">CURATED FOR YOU</p>
            <h2>The collection.</h2>
            <p className="collection-subtitle">
              Find your next everyday favourite.
            </p>
          </div>

          <div className="filters" aria-label="Filter products by category">
            {['All', 'Women', 'Men'].map((c) => (
              <button
                key={c}
                className={category === c ? 'active' : ''}
                aria-pressed={category === c}
                onClick={() => setCategory(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

                <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 12,
            margin: '25px 0',
            padding: 18,
            background: '#f5f2ec',
            border: '1px solid #e4ddd1',
          }}
        >
          <input
            type="search"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search products"
            style={{
              padding: 12,
              border: '1px solid #d8d0c2',
              background: '#fffefa',
              minWidth: 0,
            }}
          />

          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value)}
            aria-label="Filter by product type"
            style={{
              padding: 12,
              border: '1px solid #d8d0c2',
              background: '#fffefa',
            }}
          >
            {productTypes.map((type) => (
              <option key={type} value={type}>
                {type === 'All' ? 'All product types' : type}
              </option>
            ))}
          </select>

          <input
            type="number"
            min="0"
            placeholder="Minimum price ₹"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            aria-label="Minimum price"
            style={{
              padding: 12,
              border: '1px solid #d8d0c2',
              background: '#fffefa',
              minWidth: 0,
            }}
          />

          <input
            type="number"
            min="0"
            placeholder="Maximum price ₹"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            aria-label="Maximum price"
            style={{
              padding: 12,
              border: '1px solid #d8d0c2',
              background: '#fffefa',
              minWidth: 0,
            }}
          />

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            aria-label="Sort products"
            style={{
              padding: 12,
              border: '1px solid #d8d0c2',
              background: '#fffefa',
            }}
          >
            <option value="newest">Newest first</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="name">Name: A to Z</option>
          </select>

          <button
            type="button"
            onClick={() => {
              setCategory('All');
              setSearch('');
              setProductType('All');
              setSortBy('newest');
              setMinPrice('');
              setMaxPrice('');
            }}
            style={{
              padding: 12,
              border: '1px solid #927747',
              background: '#191813',
              color: '#fffefa',
              cursor: 'pointer',
            }}
          >
            Clear filters
          </button>
        </div>

        <p style={{ fontSize: 12, color: '#817b70', marginBottom: 18 }}>
          Showing {shown.length} of {products.length} products
        </p>

        {shown.length === 0 ? (
          <div className="empty-collection">
            <p className="eyebrow">THE COLLECTION</p>
            <h3>Something beautiful is on its way.</h3>
            <p>There are no products in this category just yet.</p>

            <button
              className="dark-button"
              onClick={() => setCategory('All')}
            >
              Explore all products ↗
            </button>
          </div>
        ) : (
          <div className="product-grid">
            {shown.map((p) => {
              const color = getColor(p);
              const images = color?.images.length ? color.images : [p.image];

              const imageIndex = Math.min(
                activeImage[p.id] ?? 0,
                Math.max(images.length - 1, 0)
              );

              const availableSizes = getAvailableSizes(color);
              const allSizes = color?.sizes ?? [];

              const size =
                selectedSize[p.id] &&
                availableSizes.includes(selectedSize[p.id])
                  ? selectedSize[p.id]
                  : availableSizes[0] ?? '';

              const soldOut = availableSizes.length === 0;

              return (
                <article className="product" key={p.id}>
                  <div className="product-photo">
                    {images[imageIndex] ? (
                      <img
                        src={images[imageIndex]}
                        alt={`${p.name} - ${color?.color ?? ''}`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="image-unavailable">
                        Image unavailable
                      </div>
                    )}

                    {p.tag && <span className="tag">{p.tag}</span>}

                    <button
                      className="quick-add"
                      onClick={() => add(p.id)}
                      disabled={soldOut}
                    >
                      {soldOut ? 'Sold out' : '＋ Add to bag'}
                    </button>
                  </div>

                  {images.length > 1 && (
                    <div
                      className="product-gallery"
                      aria-label={`${p.name} image gallery`}
                    >
                      {images.map((src, index) => (
                        <button
                          key={`${src}-${index}`}
                          className={
                            imageIndex === index ? 'gallery-active' : ''
                          }
                          onClick={() =>
                            setActiveImage((prev) => ({
                              ...prev,
                              [p.id]: index,
                            }))
                          }
                          aria-label={`View image ${index + 1} of ${p.name}`}
                          aria-pressed={imageIndex === index}
                        >
                          <img src={src} alt="" loading="lazy" />
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="product-info">
                    <div>
                      <p className="product-type">
                        {p.category.toUpperCase()} · {p.type.toUpperCase()}
                      </p>

                      <h3>{p.name}</h3>

                      <p className="product-color">
                        {color?.color ?? 'No color selected'}
                      </p>
                    </div>

                    <div className="price">
                      {money(color?.price ?? p.price)}
                    </div>
                  </div>

                  {p.colors.length > 0 && (
                    <div className="product-options">
                      <p className="option-heading">
                        COLOUR: <strong>{color?.color}</strong>
                      </p>

                      <div className="color-options">
                        {p.colors.map((option) => (
                          <button
                            key={option.id}
                            className={
                              color?.id === option.id
                                ? 'color-option color-option-active'
                                : 'color-option'
                            }
                            onClick={() => chooseColor(p, option.id)}
                            aria-pressed={color?.id === option.id}
                          >
                            {option.color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <label className="size-label">
                    SIZE

                    <select
                      aria-label={`Choose size for ${p.name}`}
                      value={size}
                      disabled={soldOut}
                      onChange={(e) =>
                        setSelectedSize((prev) => ({
                          ...prev,
                          [p.id]: e.target.value,
                        }))
                      }
                    >
                      {soldOut ? (
                        <option value="">Sold out</option>
                      ) : (
                        allSizes.map((s) => {
                          const outOfStock = getStock(color, s) <= 0;

                          return (
                            <option key={s} value={s} disabled={outOfStock}>
                              {s}
                              {outOfStock ? ' — Sold out' : ''}
                            </option>
                          );
                        })
                      )}
                    </select>
                  </label>
                </article>
              );
            })}
          </div>
        )}

        <div className="collection-footer">
          <span>THE SEROW COLLECTION</span>
          <a href="#top">Back to top ↑</a>
        </div>
      </section>

      {/* Brand statement */}
      <section className="quote">
        <p className="eyebrow">A NOTE ON PERSONAL STYLE</p>

        <h2>
          Trends come and go.
          <br />
          <em>Your style stays.</em>
        </h2>

        <p className="quote-description">
          Build a wardrobe that feels like you, one considered piece at a time.
        </p>

        <a href="#shop" className="text-link">
          Find your everyday pieces ↗
        </a>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-top">
          <SerowLogo footer />
          <p>Everyday style, elevated.</p>
          <a href="mailto:hello@serow.example">Contact</a>
        </div>

        <div className="footer-bottom">
          <span>© 2026 SEROW STUDIO</span>
          <span>MADE FOR EVERY DAY.</span>
          <span>INDIA · INR ₹</span>
        </div>
      </footer>

      {/* Notifications */}
      {notice && (
        <div
          className={`toast ${
            noticeType === 'success' ? 'toast-success' : 'toast-error'
          }`}
          role="status"
          aria-live="polite"
        >
          {notice}
        </div>
      )}

      {/* Shopping bag */}
      {cartOpen && (
        <div className="overlay" onClick={() => setCartOpen(false)}>
          <aside
            className="cart-drawer"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Your shopping bag"
          >
            <div className="cart-head">
              <h2>
                Your bag <span>({cartCount})</span>
              </h2>

              <button
                onClick={() => setCartOpen(false)}
                aria-label="Close bag"
              >
                ✕
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="empty-cart">
                <p>Your bag is taking a breather.</p>

                <button
                  className="dark-button"
                  onClick={() => setCartOpen(false)}
                >
                  Continue shopping ↗
                </button>
              </div>
            ) : (
              <>
                <div className="cart-lines">
                  {cart.map((line) => {
                    const p = products.find((item) => item.id === line.id);

                    const color = p?.colors.find(
                      (c) => c.id === line.colorId
                    );

                    if (!p || !color) return null;

                    const images = color.images.length
                      ? color.images
                      : p.images;

                    return (
                      <div
                        className="cart-line"
                        key={`${line.id}-${line.colorId}-${line.size}`}
                      >
                        <img
                          src={images[0] ?? p.image}
                          alt={`${p.name} - ${line.color}`}
                        />

                        <div className="line-detail">
                          <h3>{p.name}</h3>
                          <p>Colour: {line.color}</p>
                          <p>Size: {line.size}</p>
                          <p>{money(color.price)}</p>

                          <div className="qty">
                            <button
                              onClick={() => changeQty(line, -1)}
                              aria-label={`Decrease quantity of ${p.name}`}
                            >
                              −
                            </button>

                            <span>{line.qty}</span>

                            <button
                              disabled={
                                line.qty >= getStock(color, line.size)
                              }
                              onClick={() => changeQty(line, 1)}
                              aria-label={`Increase quantity of ${p.name}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="cart-foot">
                  <div className="subtotal">
                    <span>Subtotal</span>
                    <strong>{money(total)}</strong>
                  </div>

                  <p>Shipping and taxes calculated at checkout.</p>

                  <button
                    className="dark-button checkout"
                    onClick={goToCheckout}
                  >
                    Continue to checkout ↗
                  </button>

                  <p className="demo-note">
                    Cash on Delivery · Orders are subject to stock validation
                  </p>
                </div>
              </>
            )}
          </aside>
        </div>
      )}
    </main>
  );
}
