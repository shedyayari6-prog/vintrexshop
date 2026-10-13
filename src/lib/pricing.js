// Shared pricing logic: use it in the Customize preview, StoreView and the cart/checkout.

export const DEFAULT_DISCOUNT = { enabled: false, type: "percent", value: 10, scope: "all", product_ids: [] };

const appliesTo = (rule, product) =>
  rule.scope === "all" || (rule.product_ids || []).includes(product.id);

const round = (n) => Math.round(n * 100) / 100;

/** Unit price after the store discount, or null when no discount applies. */
export function salePrice(product, discount) {
  if (!discount?.enabled || !Number(discount.value) || !appliesTo(discount, product)) return null;
  const price = Number(product.price) || 0;
  const next = discount.type === "percent" ? price * (1 - Number(discount.value) / 100) : price - Number(discount.value);
  return round(Math.min(price, Math.max(0, next)));
}

/** Offers (buy X get Y free) that apply to a product. */
export function offersFor(product, offers = []) {
  return offers.filter((o) => o.buy > 0 && o.free > 0 && appliesTo(o, product));
}

export const offerLabel = (o) => `Buy ${o.buy}, get ${o.free} free`;

/** Adds `sale_price` and `offer_labels` to a product for display. */
export function priceProduct(product, store) {
  return {
    ...product,
    sale_price: salePrice(product, store.discount),
    offer_labels: offersFor(product, store.offers).map(offerLabel),
  };
}

/** Cart line total. Picks the offer that gives the most free items. */
export function lineTotal(product, qty, store) {
  const unit = salePrice(product, store.discount) ?? (Number(product.price) || 0);
  let freeUnits = 0;
  for (const o of offersFor(product, store.offers)) {
    const free = Math.floor(qty / (o.buy + o.free)) * o.free;
    if (free > freeUnits) freeUnits = free;
  }
  return { unit, freeUnits, total: round(unit * (qty - freeUnits)) };
}
