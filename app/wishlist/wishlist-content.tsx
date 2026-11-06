'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Product } from '@/lib/supabase/products';

export default function WishlistContent({
  products,
}: {
  products: Product[];
}) {
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;

    async function load() {
      try {
        const saved = localStorage.getItem('serow_wishlist');
        const guestIds: string[] = saved ? JSON.parse(saved) : [];

        const response = await fetch('/api/account/wishlist', {
          cache: 'no-store',
        });

        let accountIds: string[] = [];

        if (response.ok) {
          const data = await response.json();
          accountIds = Array.isArray(data.wishlist)
            ? data.wishlist
                .map((item: { product_id?: string }) => item.product_id)
                .filter((id: unknown): id is string => typeof id === 'string')
            : [];
        }

        if (!active) return;

        const combined = Array.from(new Set([...guestIds, ...accountIds]));
        setSavedIds(combined);
      } catch (error) {
        console.error('Could not load wishlist:', error);
      } finally {
        if (active) setLoaded(true);
      }
    }

    load();

    return () => {
      active = false;
    };
  }, []);

  async function removeProduct(productId: string) {
    const updated = savedIds.filter((id) => id !== productId);
    setSavedIds(updated);
    localStorage.setItem('serow_wishlist', JSON.stringify(updated));

    try {
      await fetch('/api/account/wishlist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
    } catch (error) {
      console.error('Could not remove wishlist item:', error);
    }
  }

  const savedProducts = products.filter((product) =>
    savedIds.includes(product.id)
  );

  return (
    <main style={{
      minHeight: '100vh',
      background: '#f5f2eb',
      color: '#29251e',
      padding: '40px 6%',
    }}>
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 16,
        borderBottom: '1px solid #c8b994',
        paddingBottom: 20,
      }}>
        <Link href="/" style={{
          color: '#29251e',
          textDecoration: 'none',
          fontSize: 22,
          letterSpacing: 5,
          fontWeight: 600,
        }}>
          SEROW
        </Link>

        <Link href="/" style={{ color: '#68583a' }}>
          ← Continue shopping
        </Link>
      </header>

      <section style={{ maxWidth: 1200, margin: '55px auto' }}>
        <p style={{
          fontSize: 11,
          letterSpacing: 3,
          color: '#8b7448',
        }}>
          YOUR PERSONAL COLLECTION
        </p>

        <h1 style={{
          fontSize: 36,
          fontWeight: 400,
          margin: '12px 0 30px',
        }}>
          My Wishlist ♡
        </h1>

        {!loaded ? (
          <p>Loading your wishlist...</p>
        ) : savedProducts.length === 0 ? (
          <div style={{
            padding: '55px 20px',
            textAlign: 'center',
            border: '1px solid #d6cbb5',
          }}>
            <h2 style={{ fontWeight: 400 }}>
              Your wishlist is waiting.
            </h2>
            <p style={{ color: '#746b5c' }}>
              Save the pieces you love and find them here.
            </p>
            <Link href="/" style={{
              display: 'inline-block',
              marginTop: 18,
              padding: '13px 22px',
              background: '#29251e',
              color: '#fff',
              textDecoration: 'none',
            }}>
              Explore the collection
            </Link>
          </div>
        ) : (
          <>
            <p style={{ color: '#746b5c', marginBottom: 25 }}>
              {savedProducts.length} saved {savedProducts.length === 1 ? 'piece' : 'pieces'}
            </p>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: 25,
            }}>
              {savedProducts.map((product) => (
                <article key={product.id}>
                  <Link href={`/products/${product.id}`}>
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{
                        width: '100%',
                        aspectRatio: '3 / 4',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                  </Link>

                  <p style={{
                    fontSize: 10,
                    letterSpacing: 2,
                    color: '#8b7448',
                    marginTop: 14,
                  }}>
                    {product.category.toUpperCase()} · {product.type.toUpperCase()}
                  </p>

                  <h3 style={{ fontWeight: 500 }}>{product.name}</h3>

                  <p>{new Intl.NumberFormat('en-IN', {
                    style: 'currency',
                    currency: 'INR',
                    maximumFractionDigits: 0,
                  }).format(product.price)}</p>

                  <div style={{
                    display: 'flex',
                    gap: 12,
                    alignItems: 'center',
                    marginTop: 12,
                  }}>
                    <Link
                      href={`/products/${product.id}`}
                      style={{ color: '#68583a', fontSize: 12 }}
                    >
                      VIEW PRODUCT →
                    </Link>

                    <button
                      onClick={() => removeProduct(product.id)}
                      style={{
                        border: '1px solid #927747',
                        background: 'transparent',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        color: '#68583a',
                      }}
                    >
                      Remove ♡
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
