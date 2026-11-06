
'use client';

import { useState } from 'react';

type ProductImageGalleryProps = {
  images: string[];
  productName: string;
};

export default function ProductImageGallery({
  images,
  productName,
}: ProductImageGalleryProps) {
  const validImages = images.filter(Boolean);
  const galleryImages = validImages.length
    ? validImages
    : ['/placeholder.png'];

  const [selectedImage, setSelectedImage] = useState(0);

  return (
    <div>
      <div
        style={{
          width: '100%',
          background: '#f1eee8',
          overflow: 'hidden',
        }}
      >
        <img
          src={galleryImages[selectedImage]}
          alt={productName}
          style={{
            display: 'block',
            width: '100%',
            maxHeight: 650,
            aspectRatio: '4 / 5',
            objectFit: 'contain',
            transition: 'opacity 0.2s ease',
          }}
        />
      </div>

      {galleryImages.length > 1 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 10,
            marginTop: 12,
          }}
        >
          {galleryImages.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedImage(index)}
              aria-label={`View product image ${index + 1}`}
              aria-pressed={selectedImage === index}
              style={{
                padding: 0,
                border:
                  selectedImage === index
                    ? '2px solid #927747'
                    : '2px solid transparent',
                background: '#f1eee8',
                cursor: 'pointer',
                overflow: 'hidden',
              }}
            >
              <img
                src={image}
                alt={`${productName} view ${index + 1}`}
                style={{
                  display: 'block',
                  width: '100%',
                  aspectRatio: '3 / 4',
                  objectFit: 'cover',
                }}
              />
            </button>
          ))}
        </div>
      )}

      {galleryImages.length > 1 && (
        <p
          style={{
            marginTop: 9,
            color: '#817b70',
            fontSize: 11,
            textAlign: 'center',
          }}
        >
          {selectedImage + 1} / {galleryImages.length} IMAGES
        </p>
      )}
    </div>
  );
}
