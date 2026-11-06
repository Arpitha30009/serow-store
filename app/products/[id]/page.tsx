
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProducts } from '@/lib/supabase/products';
import ProductImageGallery from './product-image-gallery';

export default async function ProductDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const products = await getProducts();
  const product = products.find((item) => item.id === id);

  if (!product) {
    notFound();
  }

  const firstColor = product.colors[0];

  const images =
    firstColor?.images?.length
      ? firstColor.images
      : product.images?.length
        ? product.images
        : [product.image];

  const price = firstColor?.price ?? product.price;

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: '30px 20px 60px',
        background: '#fbfaf8',
        color: '#29251f',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}
    >
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <header
          style={{
            padding: '22px',
            background: '#191813',
            color: '#f8f6f1',
            textAlign: 'center',
          }}
        >
          <Link
            href="/"
            style={{
              color: 'inherit',
              textDecoration: 'none',
              fontSize: 25,
              fontWeight: 700,
              letterSpacing: 3,
            }}
          >
            SEROW
          </Link>

          <p style={{ color: '#c6b38b', fontSize: 11 }}>
            TIMELESS STYLE
          </p>
        </header>

        <div style={{ padding: '25px 0' }}>
          <Link
            href="/#shop"
            style={{
              color: '#a1844b',
              textDecoration: 'none',
              fontSize: 13,
            }}
          >
            ← BACK TO COLLECTION
          </Link>
        </div>

        <section
          style={{
            display: 'grid',
            gridTemplateColumns:
              'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 35,
            alignItems: 'start',
          }}
        >
          <ProductImageGallery
            images={images}
            productName={product.name}
          />

          <div style={{ padding: '10px 0' }}>
            <p
              style={{
                color: '#a1844b',
                fontSize: 11,
                letterSpacing: 2,
              }}
            >
              {product.category.toUpperCase()} · {product.type.toUpperCase()}
            </p>

            <h1
              style={{
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 400,
                lineHeight: 1.2,
              }}
            >
              {product.name}
            </h1>

            <p style={{ fontSize: 22, fontWeight: 600 }}>
              {new Intl.NumberFormat('en-IN', {
                style: 'currency',
                currency: 'INR',
                maximumFractionDigits: 2,
              }).format(price)}
            </p>

            {product.tag && (
              <p style={{ color: '#a1844b', fontSize: 12 }}>
                {product.tag}
              </p>
            )}

            <div
              style={{
                borderTop: '1px solid #e4ddd1',
                marginTop: 25,
                paddingTop: 20,
              }}
            >
              <h3 style={{ fontSize: 12, letterSpacing: 1.5 }}>
                PRODUCT DETAILS
              </h3>

              <p style={{ color: '#817b70', lineHeight: 1.9 }}>
                {product.description || 'A timeless piece from SEROW.'}
              </p>
            </div>

            {product.colors.length > 0 && (
              <div style={{ marginTop: 25 }}>
                <h3 style={{ fontSize: 12, letterSpacing: 1.5 }}>
                  AVAILABLE COLOURS
                </h3>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 9,
                  }}
                >
                  {product.colors.map((color) => (
                    <span
                      key={color.id}
                      style={{
                        padding: '9px 13px',
                        border: '1px solid #e4ddd1',
                        background: '#fffefa',
                        fontSize: 13,
                      }}
                    >
                      {color.color}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 25 }}>
              <h3 style={{ fontSize: 12, letterSpacing: 1.5 }}>
                AVAILABLE SIZES
              </h3>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 9,
                }}
              >
                {(firstColor?.sizes ?? product.sizes).map((size) => (
                  <span
                    key={size}
                    style={{
                      padding: '10px 14px',
                      border: '1px solid #e4ddd1',
                      background: '#fffefa',
                      fontSize: 13,
                    }}
                  >
                    {size}
                  </span>
                ))}
              </div>
            </div>

            <Link
              href="/#shop"
              style={{
                display: 'inline-flex',
                justifyContent: 'center',
                alignItems: 'center',
                marginTop: 30,
                minHeight: 48,
                padding: '0 25px',
                background: '#191813',
                border: '1px solid #927747',
                borderRadius: 3,
                color: '#fffefa',
                textDecoration: 'none',
                fontSize: 11,
                letterSpacing: 1.5,
              }}
            >
              CONTINUE SHOPPING →
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
