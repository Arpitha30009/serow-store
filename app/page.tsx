
import { getProducts } from '@/lib/supabase/products';
import Storefront from './storefront';

export default async function Home() {
  const products = await getProducts();

  return <Storefront products={products} />;
}
