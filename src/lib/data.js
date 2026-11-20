// Seed data for the prototype. All prices are placeholders (₹, before GST).
// Option choice fields: add = ₹ added per piece, mult = multiplier on per-piece price, flat = one-time setup charge.

const STAGES = [
  { name: 'Order placed', by: 'Automatic' },
  { name: 'Payment received', by: 'Automatic' },
  { name: 'Artwork checked', by: 'Admin' },
  { name: 'Design approved', by: 'Customer / Admin' },
  { name: 'Printing', by: 'Production' },
  { name: 'Finishing', by: 'Production' },
  { name: 'Quality check', by: 'Production' },
  { name: 'Packed', by: 'Production' },
  { name: 'Shipped', by: 'Admin' },
  { name: 'Delivered', by: 'Admin' },
  { name: 'Completed', by: 'Automatic' },
];

const CATEGORIES = [
  { id: 'cards', name: 'Visiting Cards' },
  { id: 'marketing', name: 'Brochures, Flyers & Posters' },
  { id: 'stickers', name: 'Stickers & Labels' },
  { id: 'stationery', name: 'Stationery & Booklets' },
  { id: 'packaging', name: 'Boxes & Paper Bags' },
];

const O = {
  sides: { key: 'sides', label: 'Printing', choices: [{ label: 'Single side' }, { label: 'Double side', mult: 1.35 }] },
  colour: { key: 'colour', label: 'Colour', choices: [{ label: 'Full colour' }, { label: 'Black & white', mult: 0.7 }] },
  lam: { key: 'lamination', label: 'Lamination', choices: [{ label: 'None' }, { label: 'Matte', add: 0.25, mult: 1.08 }, { label: 'Gloss', add: 0.25, mult: 1.08 }, { label: 'Velvet', add: 0.6, mult: 1.15 }] },
  paperStd: { key: 'paper', label: 'Paper material', choices: [{ label: 'Matte' }, { label: 'Gloss' }, { label: 'Art paper', mult: 1.05 }, { label: 'Textured', mult: 1.25 }, { label: 'Premium', mult: 1.4 }] },
  sizeA: { key: 'size', label: 'Size', choices: [{ label: 'A4 (210 × 297 mm)' }, { label: 'A5 (148 × 210 mm)', mult: 0.55 }, { label: 'A3 (297 × 420 mm)', mult: 1.9 }, { label: 'Custom size', custom: true }] },
};

const PRODUCTS = [
  {
    id: 'visiting-cards', name: 'Visiting Cards', cat: 'cards', art: 'card', color: '#1f6feb', popular: true,
    desc: 'Crisp business cards on thick card stock. The first impression that stays in a wallet.',
    specs: ['Standard 89 × 54 mm', 'Bleed 3 mm on all sides', 'CMYK, 300 DPI artwork'],
    base: 1.4, minQty: 100, step: 100, days: 3,
    options: [
      { key: 'size', label: 'Size', choices: [{ label: 'Standard (89 × 54 mm)' }, { label: 'Square (64 × 64 mm)', mult: 1.15 }] },
      { key: 'gsm', label: 'Paper thickness', choices: [{ label: '300 GSM' }, { label: '250 GSM', mult: 0.92 }] },
      O.paperStd, O.sides, O.colour, O.lam,
      { key: 'finishing', label: 'Finishing', multi: true, choices: [
        { label: 'Spot UV', add: 0.5, flat: 400 }, { label: 'Foiling', add: 1.0, flat: 600 }, { label: 'Embossing', add: 1.0, flat: 800 },
        { label: 'Corner rounding', add: 0.2 }, { label: 'Die cutting', add: 0.5, flat: 1000 }] },
    ],
  },
  {
    id: 'brochures', name: 'Tri-fold Brochures', cat: 'marketing', art: 'brochure', color: '#c2185b', popular: true,
    desc: 'Folded brochures for menus, product ranges and services. Delivered folded and ready to hand out.',
    specs: ['Tri-fold or bi-fold', 'Delivered folded', 'Leave 5 mm safe area near folds'],
    base: 9, minQty: 50, step: 50, days: 4,
    options: [
      { key: 'size', label: 'Size', choices: [{ label: 'A4 (folds to DL)' }, { label: 'A3 (folds to A4)', mult: 1.9 }] },
      { key: 'gsm', label: 'Paper thickness', choices: [{ label: '130 GSM' }, { label: '170 GSM', mult: 1.15 }, { label: '250 GSM', mult: 1.35 }] },
      O.paperStd, { ...O.sides, choices: [{ label: 'Double side' }, { label: 'Single side', mult: 0.75 }] }, O.colour, O.lam,
      { key: 'finishing', label: 'Finishing', multi: true, choices: [{ label: 'UV coating', add: 1.5 }, { label: 'Spot UV', add: 3, flat: 800 }] },
    ],
  },
  {
    id: 'flyers', name: 'Flyers & Leaflets', cat: 'marketing', art: 'flyer', color: '#f57c00', popular: true,
    desc: 'Promote offers, events and launches. Budget-friendly in large runs.',
    specs: ['Sizes A5, A4, A3 or custom', 'Bleed 3 mm', 'PDF preferred'],
    base: 3.2, minQty: 100, step: 100, days: 2,
    options: [
      O.sizeA,
      { key: 'gsm', label: 'Paper thickness', choices: [{ label: '130 GSM' }, { label: '100 GSM', mult: 0.85 }, { label: '170 GSM', mult: 1.15 }] },
      O.paperStd, O.sides, O.colour, O.lam,
    ],
  },
  {
    id: 'posters', name: 'Posters', cat: 'marketing', art: 'poster', color: '#6a1b9a',
    desc: 'High-impact posters for shops, events and walls.',
    specs: ['Up to A0 on request', 'Minimum 150 DPI at print size'],
    base: 45, minQty: 5, step: 5, days: 2,
    options: [
      { key: 'size', label: 'Size', choices: [{ label: 'A3 (297 × 420 mm)' }, { label: 'A4 (210 × 297 mm)', mult: 0.55 }, { label: 'Custom size', custom: true, customBase: 'A3' }] },
      { key: 'gsm', label: 'Paper thickness', choices: [{ label: '170 GSM' }, { label: '250 GSM', mult: 1.2 }, { label: '300 GSM', mult: 1.35 }] },
      { key: 'paper', label: 'Paper material', choices: [{ label: 'Gloss' }, { label: 'Matte' }, { label: 'Premium', mult: 1.4 }] },
      O.lam,
    ],
  },
  {
    id: 'stickers', name: 'Custom Stickers', cat: 'stickers', art: 'sticker', color: '#00897b', popular: true,
    desc: 'Vinyl and paper stickers for branding, packaging and giveaways.',
    specs: ['Any shape with die cutting', 'Waterproof vinyl option'],
    base: 2.5, minQty: 100, step: 100, days: 3,
    options: [
      { key: 'size', label: 'Size', choices: [{ label: '50 × 50 mm' }, { label: '75 × 75 mm', mult: 1.6 }, { label: '100 × 100 mm', mult: 2.5 }] },
      { key: 'paper', label: 'Material', choices: [{ label: 'Gloss paper' }, { label: 'Matte paper' }, { label: 'Vinyl (waterproof)', mult: 1.8 }] },
      { key: 'finishing', label: 'Finishing', multi: true, choices: [{ label: 'Die cutting', add: 0.4, flat: 500 }, { label: 'UV coating', add: 0.3 }] },
    ],
  },
  {
    id: 'labels', name: 'Product Labels (Roll)', cat: 'stickers', art: 'label', color: '#558b2f',
    desc: 'Roll labels for bottles, jars and boxes, ready for hand or machine application.',
    specs: ['Supplied on rolls', 'Core size 76 mm'],
    base: 0.9, minQty: 500, step: 500, days: 4,
    options: [
      { key: 'size', label: 'Size', choices: [{ label: '40 × 60 mm' }, { label: '60 × 90 mm', mult: 1.7 }] },
      { key: 'paper', label: 'Material', choices: [{ label: 'Chromo paper' }, { label: 'Kraft', mult: 1.2 }, { label: 'Vinyl', mult: 1.6 }] },
      { key: 'finishing', label: 'Finishing', multi: true, choices: [{ label: 'Foiling', add: 0.4, flat: 1200 }, { label: 'Numbering', add: 0.1 }] },
    ],
  },
  {
    id: 'letterheads', name: 'Letterheads', cat: 'stationery', art: 'letterhead', color: '#283593',
    desc: 'Professional A4 letterheads for invoices, letters and quotations.',
    specs: ['A4 210 × 297 mm', 'Laser-printer safe'],
    base: 3.5, minQty: 100, step: 100, days: 3,
    options: [
      { key: 'gsm', label: 'Paper thickness', choices: [{ label: '100 GSM' }, { label: '80 GSM', mult: 0.85 }, { label: '130 GSM', mult: 1.15 }] },
      { key: 'paper', label: 'Paper material', choices: [{ label: 'Bond / Matte' }, { label: 'Textured', mult: 1.3 }, { label: 'Premium', mult: 1.5 }] },
      O.sides, O.colour,
    ],
  },
  {
    id: 'booklets', name: 'Booklets & Catalogues', cat: 'stationery', art: 'booklet', color: '#ad1457',
    desc: 'Multi-page catalogues, manuals and company profiles with your choice of binding.',
    specs: ['Page count in multiples of 4', 'Cover 300 GSM'],
    base: 40, minQty: 25, step: 25, days: 6,
    options: [
      { key: 'size', label: 'Size', choices: [{ label: 'A4' }, { label: 'A5', mult: 0.6 }] },
      { key: 'pages', label: 'Pages', choices: [{ label: '8 pages' }, { label: '16 pages', mult: 1.8 }, { label: '32 pages', mult: 3.3 }] },
      { key: 'gsm', label: 'Inner paper thickness', choices: [{ label: '130 GSM' }, { label: '100 GSM', mult: 0.9 }, { label: '170 GSM', mult: 1.15 }] },
      O.colour,
      { key: 'binding', label: 'Binding', choices: [{ label: 'Saddle stitch' }, { label: 'Spiral', add: 15 }, { label: 'Wire', add: 18 }, { label: 'Perfect', add: 25 }, { label: 'Hard binding', add: 90 }] },
      O.lam,
    ],
  },
  {
    id: 'boxes', name: 'Product Boxes', cat: 'packaging', art: 'box', color: '#8d6e63', popular: true,
    desc: 'Printed folding boxes for cosmetics, food and retail products.',
    specs: ['Die-line provided after order', 'Delivered flat'],
    base: 22, minQty: 100, step: 100, days: 8,
    options: [
      { key: 'size', label: 'Size', choices: [{ label: 'Small (100 × 60 × 40 mm)' }, { label: 'Medium (150 × 100 × 60 mm)', mult: 1.5 }, { label: 'Large (250 × 180 × 80 mm)', mult: 2.3 }] },
      { key: 'gsm', label: 'Board thickness', choices: [{ label: '300 GSM' }, { label: '250 GSM', mult: 0.9 }] },
      { key: 'paper', label: 'Material', choices: [{ label: 'SBS white board' }, { label: 'Kraft', mult: 0.95 }, { label: 'Premium', mult: 1.4 }] },
      O.lam,
      { key: 'finishing', label: 'Finishing', multi: true, choices: [{ label: 'Spot UV', add: 2, flat: 1500 }, { label: 'Foiling', add: 3, flat: 2000 }, { label: 'Embossing', add: 3, flat: 2500 }] },
    ],
  },
  {
    id: 'paper-bags', name: 'Paper Bags', cat: 'packaging', art: 'bag', color: '#a1887f',
    desc: 'Eco-friendly printed paper bags with twisted or flat handles.',
    specs: ['Handles included', 'Load up to 3 kg (medium)'],
    base: 16, minQty: 100, step: 100, days: 7,
    options: [
      { key: 'size', label: 'Size', choices: [{ label: 'Small (8 × 10 in)' }, { label: 'Medium (10 × 12 in)', mult: 1.3 }, { label: 'Large (12 × 16 in)', mult: 1.7 }] },
      { key: 'paper', label: 'Material', choices: [{ label: 'Kraft' }, { label: 'White art paper', mult: 1.1 }, { label: 'Premium', mult: 1.5 }] },
      O.colour, O.lam,
    ],
  },
];

const SEED_COUPONS = [
  { code: 'WELCOME10', type: 'pct', value: 10, min: 500, expires: '2026-12-31', limit: 500, used: 41 },
  { code: 'CORP500', type: 'flat', value: 500, min: 5000, expires: '2027-03-31', limit: 50, used: 6 },
];

const SAMPLE_LIBRARY = [
  { name: 'Paper samples (photo sheet)', type: 'Paper samples' },
  { name: 'GSM thickness guide', type: 'Paper samples' },
  { name: 'CMYK colour chart', type: 'Colour charts' },
  { name: 'Visiting card template (AI / PDF)', type: 'Templates' },
  { name: 'Tri-fold brochure template', type: 'Templates' },
  { name: 'Velvet vs matte lamination', type: 'Texture photos' },
];

const OPERATORS = ['Suresh', 'Fathima', 'Arun', 'Nikhil'];
const MACHINES = ['Offset — Heidelberg SM52', 'Digital — Konica C4080', 'Large format — Roland', 'Die cutter', 'Lamination unit'];

export { STAGES, CATEGORIES, PRODUCTS, SEED_COUPONS, SAMPLE_LIBRARY, OPERATORS, MACHINES };
