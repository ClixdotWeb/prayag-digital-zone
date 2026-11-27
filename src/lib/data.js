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
  { id: 'a3-express', name: 'A3 Express Printing', blurb: 'High-quality, high-speed digital printing up to A3 size.' },
  { id: 'cards', name: 'Visiting Cards' },
  { id: 'marketing', name: 'Brochures, Flyers & Posters' },
  { id: 'stickers', name: 'Sticker Printing' },
  { id: 'stationery', name: 'Booklets & Catalogues' },
  { id: 'binding', name: 'Book Binding', blurb: 'Hard, perfect, soft, spiral and wiro binding for academic, corporate and personal documents.' },
  { id: 'services', name: 'Other Services', blurb: 'Offset printing, shape cutting, seals, PVC ID cards, envelopes and badges.' },
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
    id: 'visiting-cards', sections: ['a3-express'], name: 'Visiting Cards', cat: 'cards', art: 'card', color: '#1f6feb', popular: true,
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
    id: 'brochures', sections: ['a3-express'], name: 'Tri-fold Brochures', cat: 'marketing', art: 'brochure', color: '#c2185b', popular: true,
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
    id: 'flyers', sections: ['a3-express'], name: 'Flyers & Leaflets', cat: 'marketing', art: 'flyer', color: '#f57c00', popular: true,
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
    id: 'posters', sections: ['a3-express'], name: 'Posters', cat: 'marketing', art: 'poster', color: '#6a1b9a',
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
    keywords: 'sticker printing art pvc clear die-cut custom',
    options: [
      { key: 'stype', label: 'Sticker type', choices: [{ label: 'Art sticker' }, { label: 'PVC sticker', quote: true }, { label: 'Clear sticker', quote: true }, { label: 'Die-cut sticker', quote: true }, { label: 'Custom sticker', quote: true }] },
      { key: 'size', label: 'Size', choices: [{ label: '50 × 50 mm' }, { label: '75 × 75 mm', mult: 1.6 }, { label: '100 × 100 mm', mult: 2.5 }] },
      { key: 'paper', label: 'Material', choices: [{ label: 'Gloss paper' }, { label: 'Matte paper' }, { label: 'Vinyl (waterproof)', mult: 1.8 }] },
      { key: 'finishing', label: 'Finishing', multi: true, choices: [{ label: 'Die cutting', add: 0.4, flat: 500 }, { label: 'UV coating', add: 0.3 }] },
    ],
  },
  {
    id: 'booklets', sections: ['a3-express'], name: 'Booklets & Catalogues', cat: 'stationery', art: 'booklet', color: '#ad1457',
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
  /* ===================== Flyer services (quote-only until admin sets a base price) =====================
     base: null → no price yet: the site shows "Get a quote" instead of a price and Add to cart.
     Field types besides choice groups: text, number, dims (width × height), upload (extra file slot).
     showIf: { key, in: [choice indexes] } shows a field only for those choices. */
  /* ---------- A3 Express Printing (new items) ---------- */
  {
    id: 'magazines', name: 'Magazines', cat: 'a3-express', art: 'booklet', color: '#ad1457', base: null, minQty: 1, step: 1, days: null,
    desc: 'Full-colour magazines and newsletters, printed on our A3 express press.',
    specs: ['A4 or A5', 'Page count in multiples of 4', 'Price on request'],
    options: [
      { key: 'size', label: 'Size', choices: [{ label: 'A4' }, { label: 'A5' }] },
      { key: 'pages', label: 'Number of pages', type: 'number', min: 4, placeholder: 'e.g. 24' },
      { key: 'binding', label: 'Binding', choices: [{ label: 'Centre staple' }, { label: 'Perfect binding' }] },
      { key: 'lamination', label: 'Cover lamination', choices: [{ label: 'None' }, { label: 'Matte' }, { label: 'Gloss' }] },
    ],
  },
  {
    id: 'certificates', name: 'Certificates', cat: 'a3-express', art: 'letterhead', color: '#b8860b', base: null, minQty: 1, step: 1, days: null,
    desc: 'Certificates for schools, events and awards on thick card.',
    specs: ['A4 or A3', 'Names can be printed individually', 'Price on request'],
    options: [
      { key: 'size', label: 'Size', choices: [{ label: 'A4' }, { label: 'A3' }] },
      { key: 'paper', label: 'Paper material', choices: [{ label: 'Art card' }, { label: 'Textured' }, { label: 'Premium' }] },
      { key: 'finishing', label: 'Finishing', multi: true, choices: [{ label: 'Gold foiling' }, { label: 'Individual names printed' }] },
      { key: 'names', label: 'Names list (Excel / CSV)', type: 'upload', allow: ['xlsx', 'xls', 'csv'], hint: 'Optional — one name per row' },
    ],
  },
  {
    id: 'wedding-cards', name: 'Wedding Cards', cat: 'a3-express', art: 'card', color: '#8e1b24', base: null, minQty: 1, step: 1, days: null,
    desc: 'Wedding and event invitations, with matching envelopes on request.',
    specs: ['Your design or ours', 'Price on request'],
    options: [
      { key: 'size', label: 'Size', choices: [{ label: '5 × 7 in' }, { label: '6 × 6 in' }, { label: 'Custom size' }] },
      { key: 'customSize', label: 'Custom size', type: 'dims', unit: 'in', showIf: { key: 'size', in: [2] } },
      { key: 'paper', label: 'Paper material', choices: [{ label: 'Art card' }, { label: 'Textured' }, { label: 'Premium' }] },
      { key: 'finishing', label: 'Finishing', multi: true, choices: [{ label: 'Gold foiling' }, { label: 'Embossing' }, { label: 'Matching envelope' }] },
    ],
  },
  {
    id: 'souvenirs', name: 'Souvenirs', cat: 'a3-express', art: 'booklet', color: '#00695c', base: null, minQty: 1, step: 1, days: null,
    desc: 'Souvenir books for anniversaries, festivals and functions.',
    specs: ['A4 or A5', 'Price on request'],
    options: [
      { key: 'size', label: 'Size', choices: [{ label: 'A4' }, { label: 'A5' }] },
      { key: 'pages', label: 'Number of pages', type: 'number', min: 4, placeholder: 'e.g. 48' },
      { key: 'colour', label: 'Inside pages', choices: [{ label: 'Full colour' }, { label: 'Black & white' }, { label: 'Mixed' }] },
      { key: 'binding', label: 'Binding', choices: [{ label: 'Centre staple' }, { label: 'Perfect binding' }] },
    ],
  },
  {
    id: 'notices', name: 'Notices', cat: 'a3-express', art: 'flyer', color: '#455a64', base: null, minQty: 1, step: 1, days: null,
    desc: 'Notices and handbills for announcements, meetings and offers.',
    specs: ['A5, A4 or A3', 'Price on request'],
    options: [
      { key: 'size', label: 'Size', choices: [{ label: 'A5' }, { label: 'A4' }, { label: 'A3' }] },
      { key: 'colour', label: 'Colour', choices: [{ label: 'Black & white' }, { label: 'Full colour' }] },
      { key: 'sides', label: 'Printing', choices: [{ label: 'Single side' }, { label: 'Double side' }] },
    ],
  },

  /* ---------- Book Binding ---------- */
  {
    id: 'book-binding', name: 'Book Binding', cat: 'binding', art: 'booklet', color: '#8e1b24', base: null, minQty: 1, step: 1, days: null,
    desc: 'Hard, perfect, soft, spiral and wiro binding for theses, projects, reports and personal documents.',
    specs: ['Thesis hard binding with gold lettering', 'Upload your file or bring printed sheets', 'Price on request'],
    keywords: 'thesis project report dissertation',
    options: [
      { key: 'binding', label: 'Binding type', choices: [{ label: 'Hard binding' }, { label: 'Perfect binding' }, { label: 'Soft binding' }, { label: 'Spiral binding' }, { label: 'Wiro binding' }] },
      { key: 'lettering', label: 'Gold lettering on cover', type: 'text', multiline: true, placeholder: 'e.g. thesis title, your name, university, year', showIf: { key: 'binding', in: [0] } },
      { key: 'size', label: 'Size', choices: [{ label: 'A4' }, { label: 'A5' }, { label: 'Legal' }] },
      { key: 'pages', label: 'Number of pages', type: 'number', min: 1, placeholder: 'e.g. 120' },
      { key: 'cover', label: 'Cover colour', choices: [{ label: 'Maroon' }, { label: 'Black' }, { label: 'Navy blue' }, { label: 'Dark green' }, { label: 'Other (tell us)' }] },
    ],
  },

  /* ---------- Other Services ---------- */
  {
    id: 'offset-printing', name: 'Offset Printing', cat: 'services', art: 'flyer', color: '#283593', base: null, minQty: 1, step: 1, days: null,
    desc: 'Form sheets, UV print, embossing, cloth, flex and vinyl printing.',
    specs: ['Best value for large quantities', 'Price on request'],
    options: [
      { key: 'type', label: 'Service', choices: [{ label: 'Form sheets' }, { label: 'UV print' }, { label: 'Embossing' }, { label: 'Cloth print' }, { label: 'Flex print' }, { label: 'Vinyl print' }] },
      { key: 'size', label: 'Size', choices: [{ label: 'A4' }, { label: 'A3' }, { label: 'Other (tell us)' }], showIf: { key: 'type', in: [0, 1, 2] } },
      { key: 'dims', label: 'Width × height', type: 'dims', unit: 'ft', showIf: { key: 'type', in: [3, 4, 5] } },
      { key: 'colour', label: 'Colour', choices: [{ label: 'Full colour' }, { label: 'Single colour' }] },
    ],
  },
  {
    id: 'shape-cutting', name: 'Shape Cutting & Scoring', cat: 'services', art: 'box', color: '#8d6e63', base: null, minQty: 1, step: 1, days: null,
    desc: 'Custom shape cutting, and scoring & creasing for folders, boxes and cards.',
    specs: ['Send your die-line or shape', 'Price on request'],
    options: [
      { key: 'type', label: 'Service', choices: [{ label: 'Custom shape cutting' }, { label: 'Scoring & creasing' }] },
      { key: 'for', label: 'For', choices: [{ label: 'Folders' }, { label: 'Boxes' }, { label: 'Cards' }, { label: 'Other (tell us)' }] },
      { key: 'dims', label: 'Finished size', type: 'dims', unit: 'mm' },
    ],
  },
  {
    id: 'seal-making', name: 'Seal Making', cat: 'services', art: 'card', color: '#b71c1c', base: null, minQty: 1, step: 1, days: null,
    desc: 'Pre-ink, rubber, address and custom seals made to your text or logo.',
    specs: ['Send your text and logo', 'Price on request'],
    keywords: 'stamp rubber stamp',
    options: [
      { key: 'type', label: 'Seal type', choices: [{ label: 'Pre-ink seal' }, { label: 'Rubber seal' }, { label: 'Address seal' }, { label: 'Custom seal' }] },
      { key: 'sealText', label: 'Seal text', type: 'text', multiline: true, placeholder: 'Type the text exactly as it should appear' },
      { key: 'size', label: 'Size', choices: [{ label: 'Small (up to 40 mm)' }, { label: 'Medium (up to 60 mm)' }, { label: 'Large (up to 80 mm)' }, { label: 'Other (tell us)' }] },
      { key: 'ink', label: 'Ink colour', choices: [{ label: 'Blue' }, { label: 'Black' }, { label: 'Red' }, { label: 'Violet' }, { label: 'Green' }] },
      { key: 'logo', label: 'Logo', type: 'upload', allow: ['png', 'jpg', 'jpeg', 'pdf', 'svg', 'ai', 'cdr'], hint: 'Optional' },
    ],
  },
  {
    id: 'pvc-id-cards', name: 'PVC ID Card Printing', cat: 'services', art: 'card', color: '#1565c0', base: null, minQty: 1, step: 1, days: null,
    desc: 'PVC ID cards, smart cards and membership cards, printed with each person’s name and photo.',
    specs: ['CR80 card size (85.6 × 54 mm)', 'Upload a data sheet and photos', 'Price on request'],
    keywords: 'identity card school office staff employee',
    options: [
      { key: 'type', label: 'Card type', choices: [{ label: 'PVC ID card' }, { label: 'Smart card' }, { label: 'Membership card' }] },
      { key: 'sides', label: 'Printing', choices: [{ label: 'Single side' }, { label: 'Double side' }] },
      { key: 'datasheet', label: 'Data sheet (Excel / CSV)', type: 'upload', allow: ['xlsx', 'xls', 'csv'], hint: 'Name, ID number and other details, one person per row' },
      { key: 'photos', label: 'Photos (ZIP)', type: 'upload', allow: ['zip'], hint: 'Name each photo to match the data sheet' },
    ],
  },
  {
    id: 'lanyards', name: 'Customized Lanyards', cat: 'services', art: 'card', color: '#0d47a1', base: null, minQty: 1, step: 1, days: null,
    desc: 'Printed lanyards with your name or logo, to go with ID cards.',
    specs: ['Your logo or text printed along the strap', 'Price on request'],
    keywords: 'id card tag strap',
    options: [
      { key: 'width', label: 'Strap width', choices: [{ label: '12 mm' }, { label: '16 mm' }, { label: '20 mm' }, { label: '25 mm' }] },
      { key: 'sides', label: 'Printing', choices: [{ label: 'One side' }, { label: 'Both sides' }] },
      { key: 'hook', label: 'Hook', choices: [{ label: 'Metal hook' }, { label: 'Plastic hook' }, { label: 'With card holder' }] },
    ],
  },
  {
    id: 'envelopes', name: 'Envelope Printing', cat: 'services', art: 'letterhead', color: '#5d4037', base: null, minQty: 1, step: 1, days: null,
    desc: 'Custom and branded envelopes in all sizes.',
    specs: ['All sizes', 'Price on request'],
    options: [
      { key: 'type', label: 'Envelope', choices: [{ label: 'Custom envelope' }, { label: 'Branded envelope' }] },
      { key: 'size', label: 'Size', choices: [{ label: 'DL (110 × 220 mm)' }, { label: 'C5 (162 × 229 mm)' }, { label: 'C4 (229 × 324 mm)' }, { label: 'Custom size' }] },
      { key: 'customSize', label: 'Custom size', type: 'dims', unit: 'mm', showIf: { key: 'size', in: [3] } },
      { key: 'colour', label: 'Colour', choices: [{ label: 'Full colour' }, { label: 'Single colour' }] },
    ],
  },
  {
    id: 'button-badges', name: 'Button Badges', cat: 'services', art: 'sticker', color: '#c62828', base: null, minQty: 1, step: 1, days: null,
    desc: 'Pin badges, button badges, event badges and custom badges with your artwork.',
    specs: ['Round badges', 'Price on request'],
    keywords: 'pin badge',
    options: [
      { key: 'type', label: 'Badge type', choices: [{ label: 'Pin badge' }, { label: 'Button badge' }, { label: 'Event badge' }, { label: 'Custom badge' }] },
      { key: 'size', label: 'Size', choices: [{ label: '32 mm' }, { label: '44 mm' }, { label: '58 mm' }, { label: '75 mm' }] },
    ],
  },
];

// Ids with a photo at /public/img/<id>.jpg; everything else shows the same-size branded placeholder tile.
const PHOTO_IDS = ['hero', 'about-hero', 'button-badges', 'envelopes', 'lanyards', 'pvc-id-cards', 'seal-making', 'shape-cutting', 'offset-printing', 'book-binding', 'notices', 'souvenirs', 'wedding-cards', 'magazines', 'certificates', 'visiting-cards', 'brochures', 'flyers', 'posters', 'stickers', 'booklets'];

// Home page "Our Services" (the flyer's groups) and highlights.
const SERVICE_GROUPS = [
  { title: 'A3 Express Printing', items: 'Brochures, magazines, posters, visiting cards, certificates, wedding cards, souvenirs, flyers, notices, booklets, catalogues', href: '/products?cat=a3-express' },
  { title: 'Book Binding', items: 'Hard, perfect, soft, spiral and wiro binding', href: '/product/book-binding' },
  { title: 'Sticker Printing', items: 'Art, PVC, clear, die-cut and custom stickers', href: '/product/stickers' },
  { title: 'Offset Printing', items: 'Form sheets, UV print, embossing, cloth, flex and vinyl print', href: '/product/offset-printing' },
  { title: 'Shape Cutting & Scoring', items: 'Custom shapes, scoring and creasing for folders, boxes and cards', href: '/product/shape-cutting' },
  { title: 'Seal Making', items: 'Pre-ink, rubber, address and custom seals', href: '/product/seal-making' },
  { title: 'PVC ID Card Printing', items: 'PVC ID, smart and membership cards, customised lanyards', href: '/product/pvc-id-cards' },
  { title: 'Envelope Printing', items: 'Custom and branded envelopes, all sizes', href: '/product/envelopes' },
  { title: 'Button Badges', items: 'Pin, button, event and custom badges', href: '/product/button-badges' },
];
const HIGHLIGHTS = [['award', 'High Quality Printing'], ['bolt', 'Fast Turnaround'], ['layers', 'Multiple Media Options'], ['star', 'Custom Finishing'], ['box', 'Bulk & Retail Orders']];

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

export { STAGES, CATEGORIES, PRODUCTS, PHOTO_IDS, SERVICE_GROUPS, HIGHLIGHTS, SEED_COUPONS, SAMPLE_LIBRARY, OPERATORS, MACHINES };
