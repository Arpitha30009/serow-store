import { getProducts } from '@/lib/supabase/products';
import WishlistContent from './wishlist-content';

export const dynamic = 'force-dynamic';

export default async function WishlistPage() {
  const products = await getProducts();

  return <WishlistContent products={products} />;
}
