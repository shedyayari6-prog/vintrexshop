// Sample products so a new store never looks empty. The seller can edit or delete them.
// Images are small inline SVG illustrations (no external files needed).

const SHAPES = {
  tee: `<path d="M70 38 L38 54 L24 92 L52 102 L56 92 L56 164 L144 164 L144 92 L148 102 L176 92 L162 54 L130 38 C124 56 76 56 70 38 Z"/>`,
  hoodie: `<path d="M72 40 L36 58 L20 112 L50 120 L56 108 L56 168 L144 168 L144 108 L150 120 L180 112 L164 58 L128 40 C124 66 76 66 72 40 Z"/><path d="M76 44 C80 20 120 20 124 44 C118 62 82 62 76 44 Z" fill="#fff" opacity=".35" stroke="none"/>`,
  cap: `<path d="M38 124 C38 74 162 74 162 124 Z"/><path d="M150 122 C176 120 192 126 196 134 C176 138 156 134 150 130 Z"/>`,
  tote: `<path d="M52 82 H148 L156 172 H44 Z"/><path d="M78 82 C78 38 122 38 122 82" fill="none" stroke-width="7" stroke-linecap="round"/>`,
  sneaker: `<path d="M26 134 V102 C58 102 70 88 80 72 L102 90 C118 102 142 102 172 122 C182 128 182 146 170 146 H34 C28 146 26 140 26 134 Z"/><path d="M26 146 H176 V156 H26 Z" fill="#fff" opacity=".45" stroke="none"/>`,
  mug: `<path d="M56 70 H134 V148 C134 166 56 166 56 148 Z"/><path d="M134 86 C170 84 170 128 134 126" fill="none" stroke-width="9" stroke-linecap="round"/>`,
};

function art(shape, bg1, bg2, fg) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 250">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg1}"/><stop offset="1" stop-color="${bg2}"/></linearGradient></defs>` +
    `<rect width="200" height="250" fill="url(#g)"/>` +
    `<ellipse cx="100" cy="212" rx="52" ry="7" fill="#000" opacity=".12"/>` +
    `<g transform="translate(0,22)" fill="${fg}" stroke="${fg}" stroke-width="2" stroke-linejoin="round">${SHAPES[shape]}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const sizes = (list) => ({ type: "size", values: list.map((label) => ({ label })) });
const colors = (list) => ({ type: "color", values: list.map(([label, hex]) => ({ label, hex })) });
const CLOTHES = ["S", "M", "L", "XL", "XXL"];

export const DEMO_PRODUCTS = [
  {
    name: "Classic Tee", price: 49, stock: 40, category: "T-shirts",
    description: "Soft heavyweight cotton with a relaxed fit. Made to be worn every day.",
    image_url: art("tee", "#E8F1F2", "#C9DFE3", "#0F4C5C"),
    options: [colors([["Black", "#111111"], ["White", "#F4F4F0"], ["Blue", "#1F5FBF"]]), sizes(CLOTHES)],
  },
  {
    name: "Oversized Hoodie", price: 129, stock: 25, category: "Hoodies",
    description: "Thick brushed fleece, dropped shoulders and a roomy hood.",
    image_url: art("hoodie", "#F6EBDD", "#EBCFAE", "#7A3E1D"),
    options: [colors([["Black", "#111111"], ["Red", "#C23B32"], ["Sand", "#D9C3A0"]]), sizes(CLOTHES)],
  },
  {
    name: "Everyday Cap", price: 35, stock: 30, category: "Accessories",
    description: "Adjustable cotton cap with a curved brim.",
    image_url: art("cap", "#E7ECF7", "#C5D0EC", "#26407A"),
    options: [colors([["Black", "#111111"], ["Navy", "#1D2D50"], ["Red", "#C23B32"]])],
  },
  {
    name: "Canvas Tote", price: 25, stock: 50, category: "Accessories",
    description: "Strong canvas bag with room for everything. Fits a laptop.",
    image_url: art("tote", "#EEF3E6", "#D3E1BF", "#3F6B2A"),
    options: [],
  },
  {
    name: "Street Sneakers", price: 189, stock: 15, category: "Shoes",
    description: "Light and comfortable with a grippy sole for city walking.",
    image_url: art("sneaker", "#F4E6E6", "#E8C6C6", "#8E2B2B"),
    options: [sizes(["40", "41", "42", "43", "44", "45"])],
  },
  {
    name: "Ceramic Mug", price: 22, stock: 60, category: "Home",
    description: "Handmade-look ceramic mug, 350 ml. Dishwasher safe.",
    image_url: art("mug", "#EFE9F6", "#D7CBE9", "#503A82"),
    options: [],
  },
];

export async function seedDemoProducts(supabase, storeId) {
  const rows = DEMO_PRODUCTS.map((p) => ({ ...p, store_id: storeId, is_demo: true }));
  const { error } = await supabase.from("products").insert(rows);
  return error;
}

export async function removeDemoProducts(supabase, storeId) {
  const { error } = await supabase.from("products").delete().eq("store_id", storeId).eq("is_demo", true);
  return error;
}
