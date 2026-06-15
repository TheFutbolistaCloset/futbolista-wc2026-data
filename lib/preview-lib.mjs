// Shared read-only product fetch for the LOCAL previews (build-preview + build-options-preview).
// Mirrors what the live storefront's collection.products returns so previews never mislead.
import { spawnSync } from 'child_process';

const STORE = process.env.SHOPIFY_STORE || '143f82.myshopify.com';

export function gql(query) {
  const r = spawnSync('shopify', ['store', 'execute', '--store', STORE, '--json', '--query', query], { encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 });
  const out = r.stdout || ''; const i = out.indexOf('{'), j = out.lastIndexOf('}');
  try { return JSON.parse(out.slice(i, j + 1)); } catch { return null; }
}

// `status` mirrors the live storefront's collection.products: the Admin API otherwise leaks
// DRAFT/ARCHIVED products into the preview (publishedOnCurrentPublication needs
// read_product_listings, which this token lacks — status alone covers the draft case).
export function productsFor(slug) {
  const q = `query{ c: collectionByHandle(handle:"wc2026-${slug}"){ products(first:24){ nodes{ title status featuredImage{ url } priceRangeV2{ minVariantPrice{ amount currencyCode } } } } } }`;
  const d = gql(q); const nodes = ((d && (d.data || d).c) || {}).products?.nodes || [];
  return nodes
    .filter((n) => n.status === 'ACTIVE') // storefront-visible only; never DRAFT/ARCHIVED
    .map((n) => ({
      title: n.title,
      img: n.featuredImage ? n.featuredImage.url : null,
      price: n.priceRangeV2 ? Math.round(Number(n.priceRangeV2.minVariantPrice.amount)) : null,
    }))
    .filter((p) => p.img)
    .slice(0, 12);
}
