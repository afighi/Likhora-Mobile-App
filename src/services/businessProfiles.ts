/**
 * Business profiles — what makes onboarding ask the RIGHT questions and creates
 * rich, actionable business roadmaps tailored to each specific trade.
 *
 * Micro-businesses in the Philippines vary dramatically: a laundry shop, carinderia,
 * water refilling station, pharmacy, or online shop requires specific commercial
 * machines, foot-traffic setup, unit costing formulas, operational SOPs, and
 * neighborhood customer acquisition strategies.
 *
 * Each profile below owns the trade-specific business execution blueprints as well
 * as customer segments, risks, extra questions, and permit guidance.
 */

export interface RiskOption {
  risk: string;
  contingency: string;
}

export interface ExtraQuestion {
  id: string;
  label: string;
  type: 'choice' | 'text';
  options?: string[];
  placeholder?: string;
}

/** A roadmap task before it is bound to a user id and step number. */
export interface TaskBlueprint {
  title: string;
  desc: string;
  category: string;
  agency: string;
  legal_basis: string;
  estimated_time: string;
  estimated_cost: string;
  required_docs: string[];
  sub_steps: string[];
}

export interface BusinessProfile {
  id: string; // stored verbatim in profiles.business_type
  label: string;
  desc: string;
  iconName: 'store' | 'utensils' | 'globe' | 'wrench' | 'shopping-bag' | 'plus-circle' | 'droplets';

  /** False for labour/service businesses — drives wording, not just content. */
  isProductBased: boolean;

  customerSegments: string[];
  differentiatorPlaceholder: string;
  researchStages: { id: string; label: string }[];
  risks: RiskOption[];
  permits: string[];
  extraQuestions: ExtraQuestion[];

  /** Legacy single-task fallback: supplies/operations */
  operationsTask: TaskBlueprint;
  /** Legacy single-task fallback: storefront/launch */
  launchTask: TaskBlueprint;

  /** Multi-stage, actionable business execution guide tailored specifically to this trade */
  businessExecutionTasks?: TaskBlueprint[];
}

const SHARED_PERMITS = ['Barangay clearance', 'DTI', "Mayor's / Business Permit", 'BIR'];

// ---------------------------------------------------------------------------
// 1. Sari-sari Store
// ---------------------------------------------------------------------------
const SARI_SARI: BusinessProfile = {
  id: 'Sari-sari Store',
  label: 'Sari-sari Store',
  desc: 'Neighborhood retail, groceries & load',
  iconName: 'store',
  isProductBased: true,
  customerSegments: ['Local Residents', 'Students', 'Commuters', 'Construction Workers', 'Tricycle Drivers'],
  differentiatorPlaceholder: 'e.g. cheaper, sells e-load, opens early, near the school...',
  researchStages: [
    { id: 'not_yet', label: 'Not yet' },
    { id: 'asked', label: 'Asked around friends/neighbors' },
    { id: 'checked', label: 'Checked nearby sari-sari stores' },
    { id: 'sold', label: 'Already sold test items' },
  ],
  risks: [
    { risk: 'Slow sales', contingency: 'Run a 3-day opening promo and stock the fast-moving sachet items your neighbors actually ask for.' },
    { risk: 'Strong competition', contingency: 'Offer what the nearest store does not — e-load, longer hours, or GCash cash-in convenience.' },
    { risk: 'Rising supply prices', contingency: 'Buy in bulk from Divisoria or your local wholesaler and lock in wholesale rates before prices move.' },
    { risk: 'Spoilage', contingency: 'Keep week-1 inventory lean and run a strict first-in, first-out system on anything with an expiry date.' },
    { risk: 'Unpaid credit (utang)', contingency: 'Set a written credit limit per customer from day one, and never let credit exceed one day of sales.' },
    { risk: 'Running out of cash', contingency: 'Keep part of your starting budget untouched as emergency capital and review expenses weekly.' },
    { risk: 'Typhoons or outages', contingency: 'Prepare rechargeable lights and waterproof storage for stock that must stay dry.' },
    { risk: 'Permit problems', contingency: 'Finish your Barangay Micro-Business Clearance first — the Mayor permit application needs it.' },
  ],
  permits: SHARED_PERMITS,
  extraQuestions: [
    { id: 'sells_load', label: 'Will you sell mobile load / e-load?', type: 'choice', options: ['Yes', 'No', 'Planning to'] },
    { id: 'store_space', label: 'Do you have a space to sell from?', type: 'choice', options: ['At our house', 'Renting a space', 'Still looking'] },
  ],
  operationsTask: {
    title: 'Source Wholesale Stock & Price Your Items',
    desc: 'Build your supplier list and work out a selling price for every item you carry.',
    category: 'Supplies',
    agency: 'Private Suppliers & Wholesalers',
    legal_basis: 'RA 9178 BMBE Financial Compliance & Cost Accounting',
    estimated_time: '2 - 3 Days',
    estimated_cost: 'Operating Budget',
    required_docs: ['Supplier Contacts List', 'Costing Sheet', 'GCash Merchant QR'],
    sub_steps: [
      'Canvass 3 wholesalers (Divisoria, Balintawak, or your local trading post) and compare bulk prices',
      'List your starting items and record the cost per piece of each',
      'Use the Smart Calculator to set a selling price and profit for every item',
      'Set up a dedicated business e-wallet / GCash Merchant account',
    ],
  },
  launchTask: {
    title: 'Store Display, Price Tags & Soft Opening',
    desc: 'Open with compliant signage, visible prices, and a promo that brings the neighborhood in.',
    category: 'Launch',
    agency: 'DTI Fair Trade Bureau & Local Community',
    legal_basis: 'RA 7394 Consumer Act of the Philippines (Price Tag Law)',
    estimated_time: '2 Days',
    estimated_cost: '₱1,000 - ₱2,500',
    required_docs: ['Compliance Posters (BIR 2303, DTI)', 'Price List Board', 'Promo Flyers'],
    sub_steps: [
      'Display your permits where customers can see them (BIR 2303, DTI, Sanitary Permit)',
      'Put a clear price tag on every item — this is required by RA 7394',
      'Set up a GCash / Maya QR standee at the counter',
      'Run a 3-day soft opening promo and note which items move fastest',
    ],
  },
  businessExecutionTasks: [
    {
      title: 'Neighborhood Foot-Traffic Corner Spotting & Security Layout',
      desc: 'Secure a high-visibility corner spot and build a secure counter with weatherproofing and night lighting.',
      category: 'Planning',
      agency: 'Local Barangay & Property Owner',
      legal_basis: 'Civil Code (Commercial Lease) & Barangay Safety Standards',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱2,000 - ₱8,000',
      required_docs: ['Store Location Sketch', 'Barangay Clearance Form', 'Grille Layout Plan'],
      sub_steps: [
        'Survey pedestrian traffic during morning (6–8 AM) and evening (5–7 PM) near schools, terminals, or street corners',
        'Fabricate or install a sturdy metal security grille counter with double-padlock latches for safe night operations',
        'Install weatherproofing: an extendable sunshade awning and wooden floor pallets to keep rice sacks and dry goods dry',
        'Equip the store with rechargeable LED emergency lights and a battery fan for neighborhood power outages',
      ],
    },
    {
      title: 'Wholesale FMCG Canvassing & Direct Beverage Consignment',
      desc: 'Canvass fast-moving consumer goods wholesale and secure free distributor beverage freezers.',
      category: 'Supplies',
      agency: 'FMCG Wholesalers & Direct Beverage Distributors',
      legal_basis: 'RA 9178 BMBE Financial Compliance & Commercial Contracts',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱10,000 - ₱25,000 (stock capital)',
      required_docs: ['Wholesale Price List', 'Beverage Consignment Form', 'Initial Stock Checklist'],
      sub_steps: [
        'Canvass at least 3 wholesalers (Puregold, Divisoria, Balintawak, or local trading post) for volume discounts',
        'Prioritize high-turnover staples: sachet shampoos, 3-in-1 coffee, canned sardines, noodles, and 1L cooking oil pouches',
        'Apply for direct soda (Coke/Pepsi) and ice cream freezer consignment to get commercial chillers without equipment rental fees',
        'Partner with a neighborhood bakery for daily early-morning fresh pandesal deliveries on consignment',
      ],
    },
    {
      title: 'Tingi-Tingi Unit Costing & Smart Margin Pricing',
      desc: 'Break down wholesale cartons into piece-level costs and set pricing that protects profit margins.',
      category: 'Operations',
      agency: 'Self-managed & Financial Costing',
      legal_basis: 'RA 7394 Consumer Act (Price Tag Law) & RA 9178 BMBE Act',
      estimated_time: '1 - 2 Days',
      estimated_cost: 'Operating Budget',
      required_docs: ['Piece-Level Costing Sheet', 'Store Price Board', 'Digital Scale'],
      sub_steps: [
        'Calculate exact per-piece cost from wholesale cartons/dozens to know your true baseline cost per sachet',
        'Set retail markups: target 15–20% gross margin on staple commodities (rice, sugar) and 25–35% on snacks, candies, and cold beverages',
        'Display an easily readable price tag or painted price board visible to customers under RA 7394 Price Tag Law',
        'Repack refined sugar, cooking oil, and vinegar into small sealed plastic pouches with accurate kitchen scale weighing',
      ],
    },
    {
      title: 'Anti-Utang Policy & Micro-Credit Financial Controls',
      desc: 'Establish strict credit rules and separate business cash flow from personal household expenses.',
      category: 'Finance',
      agency: 'Internal Store Financial Management',
      legal_basis: 'RA 9178 BMBE Financial Accounting Standards',
      estimated_time: '1 Day',
      estimated_cost: '₱200 - ₱500 (lockbox & ledger)',
      required_docs: ['Credit Policy Guideline', 'Daily Sales Record Book', 'Separate Cash Drawer'],
      sub_steps: [
        'Enforce a written credit limit rule: cap credit to a strict maximum of ₱300 per trusted household with weekly cutoff',
        'Maintain a dedicated, locked cash drawer and NEVER mix daily store sales with household grocery money',
        'Conduct daily cash reconciliation every evening: count cash on hand against estimated sales and replenish small change (barya)',
        'Allocate daily replenishment funds so fast-moving items are reordered before running out of stock',
      ],
    },
    {
      title: 'Digital Services Hub & Store Opening Promo',
      desc: 'Offer GCash cash-in, e-load, and run an opening neighborhood promo to drive foot traffic.',
      category: 'Launch',
      agency: 'GCash / Maya / Telco Distributor & Local Community',
      legal_basis: 'BSP Circular 942 & RA 7394 Consumer Act',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱3,000 - ₱6,000 (float & promo)',
      required_docs: ['GCash/Maya Merchant QR', 'E-Load Retailer Account', 'Opening Promo Signage'],
      sub_steps: [
        'Setup GCash and Maya Merchant QR standees at the counter to accept cashless payments and earn cash-in/out commissions',
        'Register as an e-load retailer (Smart, Globe, DITO) to attract daily foot traffic from students and commuters',
        'Organize merchandise shelves: place colorful snacks and candies at eye level and essentials within arm’s reach',
        'Run a 3-day opening promotion offering a free candy or snack for every ₱100 purchase to build neighborhood goodwill',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 2. Carinderia / Food Stall
// ---------------------------------------------------------------------------
const FOOD: BusinessProfile = {
  id: 'Carinderia / Food Stall',
  label: 'Carinderia / Food Stall',
  desc: 'Cooked meals, kiosks, food carts & drinks',
  iconName: 'utensils',
  isProductBased: true,
  customerSegments: ['Office Workers', 'Students', 'Construction Workers', 'Jeepney / Tricycle Drivers', 'Local Residents'],
  differentiatorPlaceholder: 'e.g. home-cooked, unlimited rice, served fast, secret sauce...',
  researchStages: [
    { id: 'not_yet', label: 'Not yet' },
    { id: 'asked', label: 'Asked around friends/neighbors' },
    { id: 'checked', label: 'Checked nearby eatery prices' },
    { id: 'sold', label: 'Already did a test sale or taste test' },
  ],
  risks: [
    { risk: 'Spoilage', contingency: 'Cook only what a day realistically sells, and keep a strict first-in, first-out system on ingredients.' },
    { risk: 'Rising ingredient prices', contingency: 'Buy from the wet market early in the morning, and adjust portion size before adjusting price.' },
    { risk: 'Slow sales', contingency: 'Offer a lunch-hour meal deal and take orders for delivery to nearby offices or terminals.' },
    { risk: 'Strong competition', contingency: 'Pick 2-3 dishes you can cook better than anyone nearby and make those your identity.' },
    { risk: 'Health inspection issues', contingency: 'Secure Sanitary Permits and Health Cards for everyone handling food BEFORE opening day.' },
    { risk: 'Running out of cash', contingency: 'Keep one week of ingredient money untouched, and count your takings against costs daily.' },
    { risk: 'Typhoons or outages', contingency: 'Have an ice chest and a cooking method that does not depend on electricity.' },
  ],
  permits: [...SHARED_PERMITS, 'Sanitary Permit', 'Health Card (Food Handlers)'],
  extraQuestions: [
    { id: 'menu_size', label: 'How many dishes will you serve each day?', type: 'choice', options: ['1 - 3', '4 - 6', '7 or more', 'Not sure yet'] },
    { id: 'service_style', label: 'How will you serve customers?', type: 'choice', options: ['Dine-in', 'Take-out only', 'Dine-in and take-out', 'Delivery too'] },
  ],
  operationsTask: {
    title: 'Cost Your Recipes & Set Your Serving Prices',
    desc: 'Work out what one serving truly costs you, then price it so the profit covers gas, rent and labor.',
    category: 'Supplies',
    agency: 'Wet Market Suppliers & Wholesalers',
    legal_basis: 'RA 9178 BMBE Financial Compliance & Cost Accounting',
    estimated_time: '2 - 3 Days',
    estimated_cost: 'Operating Budget',
    required_docs: ['Supplier Contacts List', 'Recipe / Costing Sheet', 'GCash Merchant QR'],
    sub_steps: [
      'Canvass your wet market and trading-post suppliers for regular ingredient prices',
      'Write down each recipe and how many servings one batch yields',
      'Use the Smart Calculator to get the cost and selling price per serving',
      'Decide your daily cooking volume so leftovers stay minimal',
    ],
  },
  launchTask: {
    title: 'Menu Board, Sanitary Compliance & Soft Opening',
    desc: 'Open with a visible menu, the health requirements settled, and a first-week promo.',
    category: 'Launch',
    agency: 'City Health Office & Local Community',
    legal_basis: 'RA 7394 (Price Tag Law) & Sanitation Code of the Philippines (PD 856)',
    estimated_time: '2 - 3 Days',
    estimated_cost: '₱1,500 - ₱3,000',
    required_docs: ['Health Cards', 'Sanitary Permit', 'Menu Price Board', 'Compliance Posters'],
    sub_steps: [
      'Secure Health Cards for everyone who will handle food',
      'Put up a menu board with clear prices per serving (RA 7394)',
      'Display your Sanitary Permit, BIR 2303 and DTI certificate visibly',
      'Run a soft opening for 2-3 days and track which dish sells out first',
    ],
  },
  businessExecutionTasks: [
    {
      title: 'Foot-Traffic Assessment & Kitchen Space Layout',
      desc: 'Count lunch rush foot traffic, install grease traps, and organize safe food preparation stations.',
      category: 'Planning',
      agency: 'Local Lessor & City Health Office (Sanitary Section)',
      legal_basis: 'PD 856 Sanitation Code of the Philippines & Civil Code (Lease)',
      estimated_time: '3 - 5 Days',
      estimated_cost: '₱5,000 - ₱15,000',
      required_docs: ['Commercial Lease Agreement', 'Kitchen Floor Plan', 'Grease Trap Receipt'],
      sub_steps: [
        'Count pedestrian foot traffic during breakfast (6:30–8:30 AM) and lunch rush (11:30 AM–1:30 PM)',
        'Install a stainless grease trap under the washing sink to prevent drain clogs and pass City Sanitary Inspection',
        'Setup kitchen exhaust hood over primary cooking burners to vent smoke and reduce kitchen heat',
        'Organize separate prep zones: raw meat cutting board, vegetable sink, cooking range, and clean serving counter',
      ],
    },
    {
      title: 'Wet Market Wholesale Canvassing & Recipe Yield Testing',
      desc: 'Canvass bulk meat and vegetable prices at dawn and standardize cooking batch yields.',
      category: 'Supplies',
      agency: 'Local Public Wet Market & Rice Wholesalers',
      legal_basis: 'RA 9178 BMBE Financial Compliance',
      estimated_time: '3 - 4 Days',
      estimated_cost: '₱5,000 - ₱15,000 (initial market run)',
      required_docs: ['Market Supplier Contact List', 'Recipe Yield Sheet', 'LPG Safety Hose Check'],
      sub_steps: [
        'Canvass meat and vegetable vendors at 4:30–5:30 AM to negotiate wholesale pricing (presyong bulto)',
        'Partner with a rice wholesaler for consistent 25kg/50kg sacks of well-milled rice (Sinandomeng/Dinorado)',
        'Cook test batches of your 3–5 signature recipes and record exact raw ingredient weights and serving yields',
        'Contract a licensed commercial LPG distributor with auto-shutoff safety valves and leak-detector regulators',
      ],
    },
    {
      title: 'Recipe Food Costing & Menu Margin Engineering',
      desc: 'Target a 30–35% food cost ratio, standardize portion ladles, and engineer combo meals.',
      category: 'Operations',
      agency: 'Self-managed & Financial Costing',
      legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
      estimated_time: '2 Days',
      estimated_cost: 'Operating Budget',
      required_docs: ['Recipe Costing Worksheet', 'Menu Price Board', 'Portion Control Ladles'],
      sub_steps: [
        'Compute exact ingredient cost per serving: aim for 30–35% food cost ratio (e.g. ₱22 ingredients = ₱65–₱70 selling price)',
        'Standardize portion sizes using dedicated measuring ladles and tongs so every customer receives equal value',
        'Design attractive budget combos: Ulam + Rice + Free Sabaw/Iced Tea to boost average order value during lunch rush',
        'Set daily cooking quotas based on past sales to minimize end-of-day leftovers and prevent food spoilage losses',
      ],
    },
    {
      title: 'Food Safety Protocols, Temperature Holding & Sanitary Setup',
      desc: 'Equip electric food warmers, maintain safe temperatures, and enforce strict food handler hygiene.',
      category: 'Operations',
      agency: 'City Health Office & Food Safety Bureau',
      legal_basis: 'PD 856 Sanitation Code of the Philippines & RA 10611 Food Safety Act',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱2,000 - ₱5,000',
      required_docs: ['Sanitary Permit', 'Food Handlers Health Cards', 'Daily Temperature Log'],
      sub_steps: [
        'Ensure all kitchen and serving staff secure pink health cards and wear clean aprons and hairnets',
        'Equip display counter with electric food warmers or bain-marie to keep hot viands above 60°C',
        'Enforce First-In, First-Out (FIFO) refrigeration protocol for raw meat and dairy stock',
        'Implement 3-compartment sink dishwashing: Wash (hot soapy water), Rinse (clean water), Sanitize (chlorine dip)',
      ],
    },
    {
      title: 'Soft Opening Taste-Test, Lunch Rush Dry-Run & Grand Opening',
      desc: 'Host a soft opening taste run, test lunch packaging, and launch takeout delivery pre-orders.',
      category: 'Launch',
      agency: 'Local Community & Social Media',
      legal_basis: 'RA 7394 Consumer Act (Price Tag Law)',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱1,500 - ₱3,500',
      required_docs: ['Menu Price Board', 'Takeout Containers Stock', 'GCash Merchant QR Standee'],
      sub_steps: [
        'Mount an attractive, legible menu board with clear prices per dish compliant with RA 7394 Price Tag Law',
        'Conduct a 1-day dry run with neighbor tasting feedback to fine-tune seasoning and portion perception',
        'Stock microwaveable takeout containers, soup cups, paper bags, and wrapped plastic utensils',
        'Setup GCash/Maya QR at the counter and take advance pre-orders from nearby construction sites and offices',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 3. Laundry Shop (Wash-Dry-Fold / Laundromat)
// ---------------------------------------------------------------------------
const LAUNDRY: BusinessProfile = {
  id: 'Laundry Shop',
  label: 'Laundry Shop',
  desc: 'Wash, dry & fold, drop-off and pickup service',
  iconName: 'droplets',
  isProductBased: false,
  customerSegments: ['Condo & Apartment Tenants', 'College Students & Dormers', 'Working Professionals', 'Busy Families & Households', 'Nearby Airbnbs / Spas / Salons'],
  differentiatorPlaceholder: 'e.g. 4-hour rush turnaround, free fabric softener, pickup & delivery, gentle on whites...',
  researchStages: [
    { id: 'not_yet', label: 'Not yet' },
    { id: 'asked', label: 'Asked around nearby apartments/dorms' },
    { id: 'checked', label: 'Checked competing laundry rates' },
    { id: 'served', label: 'Already tested wash loads with commercial equipment' },
  ],
  risks: [
    { risk: 'Machine breakdown', contingency: 'Partner with commercial equipment suppliers offering 24-48hr on-site technician servicing and keep spare belts and water valves.' },
    { risk: 'High utility bills (water & power)', contingency: 'Use commercial LPG gas dryers and high-efficiency front-load inverter washers to cut energy expenses by up to 40%.' },
    { risk: 'Lost or mixed-up garments', contingency: 'Enforce waterproof numbered claim tags per basket and photograph high-value items upon drop-off.' },
    { risk: 'Color bleeding or fabric damage', contingency: 'Strictly segregate whites from colored clothes, check care labels, and use color-catcher sheets.' },
    { risk: 'Low foot traffic / slow season', contingency: 'Offer a 10th-wash free loyalty card and partner with nearby dorms, gyms, and tricycle terminals for referrals.' },
    { risk: 'Water interruption or low pressure', contingency: 'Install a 1,000L stainless elevated water storage tank with an automatic 1HP booster pump.' },
    { risk: 'Permit delays', contingency: 'Secure your Barangay and Sanitary clearances early — laundry wastewater drainage requires local health clearance.' },
  ],
  permits: [...SHARED_PERMITS, 'Sanitary Clearance (Wastewater Drainage)'],
  extraQuestions: [
    {
      id: 'laundry_type',
      label: 'What kind of laundry setup are you planning?',
      type: 'choice',
      options: ['Drop-off Wash-Dry-Fold', 'Self-service Coin/Card', 'Commercial & Linens', 'Pickup & Delivery only'],
    },
    {
      id: 'water_source',
      label: 'What is your water supply setup?',
      type: 'choice',
      options: ['Municipal water line (Maynilad/Manila Water)', 'Deep-well with filtration', 'Still securing location'],
    },
    {
      id: 'dryer_type',
      label: 'What dryer heating method will you use?',
      type: 'choice',
      options: ['Commercial LPG Gas (Fast & cost-effective)', 'Electric Dryers (Dedicated 220V/high amp)', 'Not sure yet'],
    },
  ],
  operationsTask: {
    title: 'Commercial Machinery, Water & Utility Setup',
    desc: 'Canvass commercial washers/dryers with technician warranty, test water pressure (30–40 PSI), and install greywater drainage.',
    category: 'Operations',
    agency: 'Commercial Laundry Equipment Suppliers & Local Utilities',
    legal_basis: 'PD 856 Sanitation Code of the Philippines & Philippine Electrical Code',
    estimated_time: '5 - 10 Days',
    estimated_cost: '₱50,000 - ₱150,000',
    required_docs: ['Equipment Quotations (3 Suppliers)', 'Lease Agreement', 'Water Pressure Test', 'Electrical Load Assessment'],
    sub_steps: [
      'Canvass at least 3 commercial laundry equipment distributors and compare drum capacity (10.5kg–15kg) and cycle times',
      'Inspect location water pressure (minimum 30–40 PSI) and verify dedicated 220V electrical panel or LPG lines',
      'Install lint/grease trap before wastewater discharge into municipal drainage',
      'Stock concentrated liquid detergent carboys (20L), fabric conditioner, and plastic packaging bags',
    ],
  },
  launchTask: {
    title: 'Per-Kilo Costing, Claim Stub SOPs & Loyalty Launch',
    desc: 'Calculate exact wash-dry-fold per-kilo margins, setup tagging claim stubs, and launch neighborhood loyalty promotions.',
    category: 'Launch',
    agency: 'Local Community & DTI Fair Trade Bureau',
    legal_basis: 'RA 7394 Consumer Act (Price Tag Law & Service Standards)',
    estimated_time: '2 - 3 Days',
    estimated_cost: '₱2,000 - ₱5,000',
    required_docs: ['Per-Kilo Rate Board', 'Claim Stub Booklets', 'Loyalty Cards', 'Opening Promo Flyers'],
    sub_steps: [
      'Compute exact cost per load (detergent + water + power + labor) and set per-kilo rate (₱30–₱40/kg) with 5kg minimum',
      'Post a prominent weatherproof rate board at storefront detailing turnaround times and rush rates (RA 7394)',
      'Setup numbered waterproof claim stub system to prevent garment mix-ups and track order status',
      'Launch opening promo (20% off first 50 loads) and distribute "10th Wash Free" loyalty punch cards to nearby households',
    ],
  },
  businessExecutionTasks: [
    {
      title: 'Commercial Location, Water Pressure & Utility Feasibility',
      desc: 'Verify continuous water pressure, dedicated electrical circuits/LPG lines, and drainage slope.',
      category: 'Planning',
      agency: 'Local Water Utility & Meralco / Electric Cooperative',
      legal_basis: 'PD 856 Sanitation Code of the Philippines & Philippine Electrical Code',
      estimated_time: '3 - 5 Days',
      estimated_cost: '₱3,000 - ₱10,000 (site inspection / deposit)',
      required_docs: ['Commercial Lease Agreement', 'Water Pressure PSI Reading', 'Electrical Panel Load Assessment'],
      sub_steps: [
        'Test water pressure during peak hours (minimum 30–40 PSI required) and verify steady daily municipal supply',
        'Inspect electrical service panel: ensure dedicated 220V single/three-phase wiring for heavy pump and motor loads',
        'Check wastewater drainage slope and install a lint filter basin before connecting to the municipal drainage',
        'Negotiate lease terms near dense rental markets: condominiums, student dorms, apartment rows, or subdivisions',
      ],
    },
    {
      title: 'Commercial Machinery Canvassing & Technician Warranty',
      desc: 'Canvass commercial front-load washers and dryers with local on-site technician maintenance contracts.',
      category: 'Supplies',
      agency: 'Commercial Laundry Equipment Suppliers (LG, Speed Queen, Huebsch, Maytag)',
      legal_basis: 'RA 7394 Consumer Act of the Philippines (Commercial Warranty)',
      estimated_time: '4 - 7 Days',
      estimated_cost: '₱60,000 - ₱180,000 (equipment capital)',
      required_docs: ['Supplier Equipment Quotations', 'Warranty Agreement', 'Maintenance Service Contract'],
      sub_steps: [
        'Canvass at least 3 authorized commercial laundry distributors and compare stackable commercial washers and dryers',
        'Select equipment with at least 1–3 years warranty, local technician service availability, and accessible replacement parts',
        'Compare commercial LPG gas dryers (faster drying, lower utility cost) versus high-amperage electric heating elements',
        'Schedule professional technician delivery, leveling, plumbing hookup, and test cycle calibration',
      ],
    },
    {
      title: 'Bulk Detergent, Chemical Sourcing & Consumables Inventory',
      desc: 'Source commercial liquid detergent drums, color-safe fabric softeners, and laundry packaging.',
      category: 'Supplies',
      agency: 'Direct Chemical Manufacturers & Packaging Distributors',
      legal_basis: 'RA 9178 BMBE Financial Compliance & Cost Accounting',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱5,000 - ₱12,000 (initial chemicals & bags)',
      required_docs: ['Chemical Supplier List', 'Material Safety Data Sheets (MSDS)', 'Inventory Tracking Log'],
      sub_steps: [
        'Source 20L carboy drums of high-concentrate liquid laundry detergent directly from industrial chemical blenders',
        'Canvass commercial fabric conditioner, oxygen bleach (color-safe), and pre-spotting stain removers',
        'Order heavy-duty plastic laundry packaging bags (medium, large, comforter sizes) and plastic twist ties',
        'Procure an accurate commercial digital platform scale (up to 30kg capacity) and durable plastic sorting baskets',
      ],
    },
    {
      title: 'Wash-Dry-Fold Unit Costing & Pricing Architecture',
      desc: 'Compute cost per load including water, power, and labor to establish profitable per-kilo pricing.',
      category: 'Operations',
      agency: 'Self-managed & Financial Costing',
      legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
      estimated_time: '2 Days',
      estimated_cost: 'Operating Budget',
      required_docs: ['Cost Per Load Worksheet', 'Service Rate Menu Card', 'Claim Stub Ticket Books'],
      sub_steps: [
        'Calculate total utility cost per load: detergent (₱8–₱12) + water (₱5–₱8) + power/gas (₱15–₱25) + labor overhead',
        'Set profitable per-kilo Wash-Dry-Fold rates (e.g. ₱30–₱40/kilo) with a strict minimum load charge (e.g. 5kg minimum)',
        'Price specialized services: Heavy comforters/duvets (₱150–₱250 flat), towel/linen loads, and 4-hour rush turnaround (+50%)',
        'Design numbered duplicate claim stub receipts recording customer name, phone number, weight, and special instructions',
      ],
    },
    {
      title: 'Garment Tagging, Sorting & Operational SOPs',
      desc: 'Enforce garment tag systems to prevent lost clothes, color bleeding, and ensure daily lint filter cleaning.',
      category: 'Operations',
      agency: 'Internal Operations & Quality Control',
      legal_basis: 'RA 7394 Consumer Act (Service Standard & Due Diligence)',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱1,000 - ₱2,500 (tagging guns & logbooks)',
      required_docs: ['Standard Operating Procedures (SOP) Manual', 'Claim Stub Logbook', 'Daily Maintenance Checklist'],
      sub_steps: [
        'Implement waterproof tagging: pin color-coded numbered tags onto garment baskets and bags before washing',
        'Enforce strict sorting protocols: separate white garments from dark colored fabrics and inspect pockets for pens or coins',
        'Establish mandatory dryer maintenance: clean lint filter screens after EVERY cycle to prevent fire hazard and maintain drying airflow',
        'Perform weekly drum cleaning cycles with hot water and sanitizing solution to prevent musty odor buildup',
      ],
    },
    {
      title: 'Opening Promo, Neighborhood Loyalty & Pickup/Delivery Setup',
      desc: 'Launch a 10th-wash free loyalty program, distribute opening promo flyers, and setup neighborhood pickup.',
      category: 'Launch',
      agency: 'Local Community & Barangay Promotion',
      legal_basis: 'RA 7394 Consumer Act of the Philippines',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱1,500 - ₱4,000',
      required_docs: ['Weatherproof Rate Board', 'Loyalty Punch Cards', 'Opening Promo Flyers'],
      sub_steps: [
        'Mount a prominent, weatherproof rate board at storefront with complete service rates, turnaround times, and cut-off hours',
        'Distribute opening promo flyers (e.g. 20% off first 50 wash loads or free premium downy upgrade) to nearby dorms and condos',
        'Launch a "10th Wash Free" loyalty punch card to incentivize weekly repeat household laundry customers',
        'Partner with local tricycle drivers or delivery riders for scheduled neighborhood laundry pickup and drop-off',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 4. Water Refilling Station
// ---------------------------------------------------------------------------
const WATER_STATION: BusinessProfile = {
  id: 'Water Refilling Station',
  label: 'Water Refilling Station',
  desc: 'Purified, alkaline & mineral water refill and delivery',
  iconName: 'droplets',
  isProductBased: true,
  customerSegments: ['Neighborhood Households', 'Local Eateries & Carinderias', 'Offices & Commercial Hubs', 'Schools & Clinics', 'Construction Sites'],
  differentiatorPlaceholder: 'e.g. free 5-gallon dispenser loan, tested 0 TDS purified, guaranteed 30-min delivery...',
  researchStages: [
    { id: 'not_yet', label: 'Not yet' },
    { id: 'asked', label: 'Surveyed subdivision & office water needs' },
    { id: 'checked', label: 'Canvassed nearby water station refill rates' },
    { id: 'served', label: 'Tested source water potability with laboratory' },
  ],
  risks: [
    { risk: 'Water contamination / failed test', contingency: 'Install UV sterilizer, replace sediment filters monthly, and conduct monthly bacteriological water tests.' },
    { risk: 'Power outages / brownouts', contingency: 'Equip an automatic generator or inverter system to keep booster pumps running during water demand surges.' },
    { risk: 'High competition from nearby stations', contingency: 'Compete on 30-minute delivery speed, free hot/cold dispenser loans for offices, and alkaline water options.' },
    { risk: 'Damaged or lost 5-gallon bottles', contingency: 'Require a bottle deposit fee for new clients and use durable food-grade polycarbonate containers.' },
    { risk: 'High electricity & water bills', contingency: 'Monitor membrane backwashing efficiency and recover greywater for cleaning and vehicle washing.' },
    { risk: 'Permit delays', contingency: 'Submit water samples to DOH-accredited laboratory early — Mayor’s permit requires physical-chemical clearance.' },
  ],
  permits: [...SHARED_PERMITS, 'DOH Potability Laboratory Clearance', 'Sanitary Permit (PD 856)'],
  extraQuestions: [
    {
      id: 'water_tech',
      label: 'What water purification system will you install?',
      type: 'choice',
      options: ['Reverse Osmosis (Purified)', 'Alkaline Water', 'Mineral Water', 'Combo RO + Alkaline'],
    },
    {
      id: 'delivery_service',
      label: 'Will you offer home & office delivery?',
      type: 'choice',
      options: ['Yes, with delivery motorcycle/trike', 'Walk-in refills only at first', 'Both walk-in & scheduled delivery'],
    },
  ],
  operationsTask: {
    title: 'Water Testing, Filtration Equipment & Container Sourcing',
    desc: 'Submit source water for DOH potability testing, install multi-stage RO/Alkaline filtration, and canvass 5-gallon bottles.',
    category: 'Operations',
    agency: 'DOH-Accredited Water Laboratory & Water Equipment Suppliers',
    legal_basis: 'Philippine National Standards for Drinking Water (PNSDW AO 2017-0010) & PD 856',
    estimated_time: '7 - 14 Days',
    estimated_cost: '₱120,000 - ₱250,000',
    required_docs: ['PNSDW Laboratory Analysis', 'Equipment Warranty Contract', 'Container Quotations'],
    sub_steps: [
      'Submit raw feed water sample to a DOH-accredited laboratory for microbiological and physical-chemical analysis',
      'Canvass at least 3 water filtration equipment suppliers and install 21-stage RO/Alkaline machinery with UV sterilizer',
      'Install food-grade stainless steel storage tanks (500L–1000L) with air vent filters and automatic pressure pumps',
      'Source 100–200 food-grade 5-gallon containers (round and slim dispenser types), non-spill caps, and heat-shrink seals',
    ],
  },
  launchTask: {
    title: 'Refill Costing, Bottle Sanitization SOPs & Route Delivery',
    desc: 'Calculate cost per 5-gallon container, enforce sanitizing bath protocols, and launch weekly delivery routes.',
    category: 'Launch',
    agency: 'City Health Office & Local Community',
    legal_basis: 'PD 856 Sanitation Code & RA 7394 Price Tag Law',
    estimated_time: '2 - 3 Days',
    estimated_cost: '₱2,000 - ₱5,000',
    required_docs: ['Refill Price Board', 'Daily TDS Calibration Log', 'Neighborhood Delivery Map'],
    sub_steps: [
      'Compute cost per 5-gal refill: water (₱1.50) + power (₱2.00) + cap/seal (₱2.50) + delivery fuel to set ₱30–₱45 refill prices',
      'Implement 3-step bottle sanitizing SOP: exterior high-pressure rinse, food-grade disinfectant soak, and purified water flush',
      'Calibrate digital TDS meter every morning (target <10 ppm for purified RO) and log readings before opening',
      'Launch opening promo: distribute free 1st-refill vouchers to local households and secure weekly office refill subscriptions',
    ],
  },
  businessExecutionTasks: [
    {
      title: 'Water Source Viability & DOH Potability Laboratory Testing',
      desc: 'Collect raw feed water samples and secure mandatory PNSDW laboratory clearances.',
      category: 'Planning',
      agency: 'Local Water District & DOH-Accredited Water Laboratory',
      legal_basis: 'Philippine National Standards for Drinking Water (PNSDW AO 2017-0010) & PD 856',
      estimated_time: '5 - 10 Days',
      estimated_cost: '₱3,500 - ₱7,000 (laboratory testing fees)',
      required_docs: ['Raw Water Potability Certificate', 'Bacteriological Water Analysis', 'Physical-Chemical Test Report'],
      sub_steps: [
        'Collect raw feed water sample and submit to a DOH-accredited laboratory for comprehensive PNSDW potability testing',
        'Verify continuous water pressure and daily volume from municipal water district or deep-well commercial source',
        'Ensure testing covers microbiological (coliform/E. coli), physical-chemical (pH, turbidity, heavy metals), and radiological tests',
        'Design a cleanroom partition with double-door entry separating the filling room from the customer waiting area',
      ],
    },
    {
      title: 'Commercial RO / Alkaline Machinery Canvassing & Installation',
      desc: 'Canvass multi-stage Reverse Osmosis and Alkaline filtration systems with UV sterilizers.',
      category: 'Supplies',
      agency: 'Commercial Water Equipment Manufacturers & Installers',
      legal_basis: 'RA 9178 BMBE Financial Compliance & DOH AO 2017-0010',
      estimated_time: '7 - 14 Days',
      estimated_cost: '₱120,000 - ₱280,000 (equipment capital)',
      required_docs: ['Equipment Purchase Agreement', 'Filtration Schematic Blueprint', 'Commissioning Test Report'],
      sub_steps: [
        'Canvass at least 3 reputable water filtration equipment suppliers and compare Reverse Osmosis and Alkaline packages',
        'Inspect system components: multi-media sand filters, activated carbon, RO membranes, post-carbon polishing, and UV lamp',
        'Install food-grade 304 stainless steel product water storage tanks (500L–1000L) with airtight breather filters',
        'Conduct equipment commissioning: test automatic booster pumps, pressure shutoff switches, and digital TDS monitors',
      ],
    },
    {
      title: 'Bottles, Caps, Heat-Shrink Seals & Delivery Logistics Canvassing',
      desc: 'Procure 5-gallon containers, non-spill caps, heat-shrink seals, and custom delivery racks.',
      category: 'Supplies',
      agency: 'Packaging Wholesalers & Plastic Container Distributors',
      legal_basis: 'RA 7394 Consumer Act of the Philippines',
      estimated_time: '3 - 5 Days',
      estimated_cost: '₱15,000 - ₱35,000 (bottles, caps & racks)',
      required_docs: ['Container Inventory Log', 'Custom Waterproof Sticker Design', 'Delivery Carrier Specs'],
      sub_steps: [
        'Order initial stock of 100–200 food-grade 5-gallon containers (both round dispenser type and slim faucet containers)',
        'Source wholesale sanitary non-spill caps, tamper-proof heat-shrink neck seals, and an electric heat-shrink heat gun',
        'Print custom waterproof vinyl labels with station business name, permit registration details, and emergency refill hotline',
        'Equip delivery motorcycle or tricycle with custom welded metal racks capable of transporting 8–16 bottles safely',
      ],
    },
    {
      title: 'Cost per Gallon & Subscription Refill Pricing Architecture',
      desc: 'Calculate exact cost per 5-gallon bottle and formulate attractive walk-in and delivery subscription rates.',
      category: 'Operations',
      agency: 'Self-managed & Financial Costing',
      legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
      estimated_time: '2 Days',
      estimated_cost: 'Operating Budget',
      required_docs: ['Cost Per Bottle Worksheet', 'Station Price Board', 'Subscription Delivery Log'],
      sub_steps: [
        'Compute cost per 5-gallon refill: raw water (₱1.50) + power (₱2.00) + cap/seal (₱2.50) + filter amortization (₱1.00) + fuel',
        'Set competitive prices: walk-in refill (₱25–₱35 per 5-gal), delivered refill (₱35–₱50 per 5-gal), and new container deposit',
        'Formulate corporate/household weekly subscription plans: free water dispenser loan for 6-month contracts with 4 bottles/week',
        'Provide cashless payment convenience (GCash / Maya QR) and issue numbered delivery receipt slips',
      ],
    },
    {
      title: 'Bottle Sanitization SOPs, Daily TDS Calibration & Route Opening',
      desc: 'Enforce 3-stage bottle washing, calibrate daily TDS readings, and launch neighborhood delivery routes.',
      category: 'Launch',
      agency: 'City Health Office (Sanitation Section) & Local Community',
      legal_basis: 'PD 856 Sanitation Code & PNSDW Standards',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱1,500 - ₱3,500',
      required_docs: ['Daily TDS Logbook', 'Sanitary Inspection Checklist', 'Neighborhood Route Map'],
      sub_steps: [
        'Implement 3-step bottle sanitizing: exterior pressure wash, food-grade disinfectant soak, and product water final flush',
        'Calibrate handheld digital TDS meter every morning (target <10 ppm for purified RO) and record readings in daily logbook',
        'Distribute "Free 1st 5-Gallon Refill" opening flyers to households in your target subdivisions and barangay streets',
        'Schedule fixed morning (8–11 AM) and afternoon (2–5 PM) delivery routes for local restaurants, offices, and homes',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 5. Online Selling / E-Commerce
// ---------------------------------------------------------------------------
const ONLINE: BusinessProfile = {
  id: 'Online Selling',
  label: 'Online Selling',
  desc: 'Shopee, Lazada, TikTok & Facebook selling',
  iconName: 'globe',
  isProductBased: true,
  customerSegments: ['Online Shoppers', 'Students', 'Young Professionals', 'Resellers', 'OFW Families'],
  differentiatorPlaceholder: 'e.g. ships faster, own designs, cheaper shipping...',
  researchStages: [
    { id: 'not_yet', label: 'Not yet' },
    { id: 'asked', label: 'Asked around friends/online groups' },
    { id: 'checked', label: 'Checked competitor shops & prices' },
    { id: 'sold', label: 'Already made test sales online' },
  ],
  risks: [
    { risk: 'Slow orders', contingency: 'Post consistently, join platform campaigns, and ask early buyers for reviews that lift your listing.' },
    { risk: 'Strong competition', contingency: 'Compete on photos, response speed and bundle deals rather than dropping your price.' },
    { risk: 'Shipping delays or damage', contingency: 'Use two couriers, pack fragile items properly, and set honest delivery expectations on your listing.' },
    { risk: 'COD rejects / fake buyers', contingency: 'Require a downpayment on high-value items and keep a blocklist of repeat non-receivers.' },
    { risk: 'Returns & refunds', contingency: 'Write a clear return policy on every listing and photograph each parcel before handing it to the courier.' },
    { risk: 'Running out of cash', contingency: 'Do not tie up all your capital in stock — keep a cash buffer for shipping and ad spend.' },
    { risk: 'Dead stock', contingency: 'Start with small quantities per variant and reorder only what actually sells.' },
  ],
  permits: ['Barangay clearance', 'DTI', 'BIR'],
  extraQuestions: [
    { id: 'platform', label: 'Where will you sell?', type: 'choice', options: ['Shopee', 'Lazada', 'TikTok Shop', 'Facebook / Messenger', 'Several of these'] },
    { id: 'stock_model', label: 'Will you hold your own stock?', type: 'choice', options: ['Yes, I hold stock', 'Dropship / pre-order', 'A mix of both'] },
  ],
  operationsTask: {
    title: 'Source Stock & Compute Your Landed Cost',
    desc: 'Know the true cost per item once shipping, packaging and platform fees are counted in.',
    category: 'Supplies',
    agency: 'Private Suppliers & Online Wholesalers',
    legal_basis: 'RA 9178 BMBE Financial Compliance & Cost Accounting',
    estimated_time: '2 - 4 Days',
    estimated_cost: 'Operating Budget',
    required_docs: ['Supplier Contacts List', 'Costing Sheet', 'Courier Rate Card'],
    sub_steps: [
      'Canvass 3 suppliers and request their reseller or bulk price list',
      'Add packaging, courier and platform commission to get your true cost per item',
      'Use the Smart Calculator to set a price that survives free-shipping promos',
      'Open a business bank or e-wallet account for payouts',
    ],
  },
  launchTask: {
    title: 'Set Up Your Shop Page & First Promo',
    desc: 'Get the shop looking trustworthy, then drive the first orders that build your ratings.',
    category: 'Launch',
    agency: 'E-commerce Platforms & Social Media',
    legal_basis: 'RA 7394 Consumer Act & RA 8792 E-Commerce Act',
    estimated_time: '2 - 3 Days',
    estimated_cost: '₱500 - ₱2,000',
    required_docs: ['Product Photos', 'Shop Policies', 'Courier Account'],
    sub_steps: [
      'Take clean, well-lit photos of every product on a plain background',
      'Write complete listings — size, material, what is included, and your return policy',
      'Link your courier accounts and set realistic handling times',
      'Run a launch discount and ask your first buyers to leave a review',
    ],
  },
  businessExecutionTasks: [
    {
      title: 'E-Commerce Storefront Setup, Branding & Platform Seller Accounts',
      desc: 'Register merchant accounts on Shopee, Lazada, and TikTok Shop, and set up brand visual identity.',
      category: 'Planning',
      agency: 'E-Commerce Platforms & DTI E-Commerce Bureau',
      legal_basis: 'RA 8792 Electronic Commerce Act & RA 11967 Internet Transactions Act',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱500 - ₱1,500',
      required_docs: ['Government ID', 'Business Bank / E-Wallet Account', 'Brand Logo & Banner Files'],
      sub_steps: [
        'Open official merchant seller accounts on Shopee Seller Centre, Lazada Seller Center, and TikTok Shop',
        'Verify payout accounts with dedicated business bank account or upgraded GCash/Maya business wallet',
        'Design cohesive shop branding: high-resolution logo, banner visuals, and clear shop bio with operational hours',
        'Configure essential shop settings: automated chat greeting reply, return address, and default shipping options',
      ],
    },
    {
      title: 'Direct Manufacturer Sourcing & Landed Cost Architecture',
      desc: 'Canvass direct factories, order sample batches, and compute true landed cost including platform commissions.',
      category: 'Supplies',
      agency: 'Private Wholesalers, Importers & Direct Factories',
      legal_basis: 'RA 9178 BMBE Financial Compliance & RA 8792 E-Commerce Act',
      estimated_time: '3 - 5 Days',
      estimated_cost: '₱5,000 - ₱20,000 (sample order & stock)',
      required_docs: ['Supplier Price Comparison', 'True Landed Cost Worksheet', 'Sample Quality Checklist'],
      sub_steps: [
        'Canvass at least 3 direct factories or importers (Divisoria, 168, Greenhills, or Alibaba/Shopee wholesale)',
        'Order small sample lots to inspect stitching, material durability, and packaging before placing large volume orders',
        'Calculate true landed cost: purchase price + inbound shipping + polymailer/box + bubble wrap per piece',
        'Factor platform transaction commissions (8–15% on Shopee/Lazada/TikTok) and return allowance into retail prices',
      ],
    },
    {
      title: 'High-Converting Product Photography & Listing Optimization',
      desc: 'Shoot well-lit product photos, produce 15-second demo videos, and write SEO-optimized titles.',
      category: 'Operations',
      agency: 'E-commerce Platforms (Shopee, Lazada, TikTok Shop)',
      legal_basis: 'RA 7394 Consumer Act & RA 8792 E-Commerce Act',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱1,000 - ₱3,000 (lighting / backdrops)',
      required_docs: ['High-Resolution Product Images', 'Product Spec Sheet', 'Return/Refund Policy Draft'],
      sub_steps: [
        'Photograph products in clean natural lighting against a neutral aesthetic backdrop, capturing detail and dimension shots',
        'Record a 15-second product demonstration video highlighting primary customer benefits for TikTok Shop and Shopee Video',
        'Write search-optimized listing titles: Brand + Keyword Descriptor + Size/Variant + Key Benefit',
        'Publish clear specifications: exact dimensions, materials, package inclusions, and hassle-free return policy',
      ],
    },
    {
      title: 'Fulfillment Station, Packaging Stock & Courier Linkage',
      desc: 'Set up thermal waybill printing, stock polymailers and bubble wrap, and link integrated couriers.',
      category: 'Operations',
      agency: 'Courier Logistics Partners (J&T, Flash, SPX, Ninja Van)',
      legal_basis: 'RA 8792 Electronic Commerce Act',
      estimated_time: '2 Days',
      estimated_cost: '₱3,000 - ₱7,000 (thermal printer & polymailers)',
      required_docs: ['Thermal Waybill Printer Setup', 'Courier Merchant Dashboard', 'Packaging Inventory Log'],
      sub_steps: [
        'Setup a dedicated packaging table with a Bluetooth/USB thermal waybill printer (100x150mm sticker rolls)',
        'Stock high-strength self-adhesive polymailers, corrugated cardboard boxes, and heavy-duty bubble wrap',
        'Link integrated courier pickup services (J&T Express, Flash Express, SPX) with automatic daily dispatch scheduling',
        'Implement fragile item packaging SOP: wrap items in at least 3 layers of bubble wrap and affix bold fragile labels',
      ],
    },
    {
      title: 'Platform Campaign Launch, Flash Deals & Review Seeding',
      desc: 'Join payday campaigns, setup introductory shop vouchers, and seed verified 5-star customer reviews.',
      category: 'Launch',
      agency: 'E-commerce Platforms & Social Media Channels',
      legal_basis: 'RA 7394 Consumer Act (Fair Trade & Advertising)',
      estimated_time: 'Ongoing (Week 1 Focus)',
      estimated_cost: '₱1,000 - ₱3,000 voucher promo budget',
      required_docs: ['Campaign Discount Calendar', 'Seller Center Voucher Dashboard', 'Review Collection Script'],
      sub_steps: [
        'Join official platform monthly mega-campaigns (Payday Sales, Double-Digit Sales) and create 10–15% shop vouchers',
        'Seed early verified orders with friends and early supporters to establish your first 10 verified photo/video reviews',
        'Include a personalized thank-you insert card in every parcel offering a discount voucher for leaving a 5-star review',
        'Maintain 100% on-time same-day or next-day shipping dispatch to secure Preferred Seller and Top Merchant badges',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 6. Serbisyo / Services (Salon, Pet Grooming, Repairs, Personal Care)
// ---------------------------------------------------------------------------
const SERVICES: BusinessProfile = {
  id: 'Serbisyo / Services',
  label: 'Serbisyo / Services',
  desc: 'Pet grooming, salon, repair, tutoring, personal care',
  iconName: 'wrench',
  isProductBased: false,
  customerSegments: ['Local Residents', 'Households', 'Office Workers', 'Pet Owners', 'Small Businesses'],
  differentiatorPlaceholder: 'e.g. home service, finished faster, with warranty, gentle with pets...',
  researchStages: [
    { id: 'not_yet', label: 'Not yet' },
    { id: 'asked', label: 'Asked around friends/neighbors' },
    { id: 'checked', label: 'Checked what nearby providers charge' },
    { id: 'served', label: 'Already served test clients' },
  ],
  risks: [
    { risk: 'Few bookings', contingency: 'Offer an introductory rate to the first 10 clients and ask each one for a referral or a photo you can post.' },
    { risk: 'Strong competition', contingency: 'Compete on convenience — home service, faster turnaround, or weekend slots others do not offer.' },
    { risk: 'No-show clients', contingency: 'Require a small booking fee or confirm by text the day before every appointment.' },
    { risk: 'Equipment breakdown', contingency: 'Keep a maintenance schedule and set aside a monthly amount for repairs and a backup unit.' },
    { risk: 'Rising supply costs', contingency: 'Track your consumable cost per service and review your rate whenever supply prices jump.' },
    { risk: 'Injury or accidents', contingency: 'Prepare a first-aid kit, handle equipment safely, and look into simple liability coverage.' },
    { risk: 'Running out of cash', contingency: 'Charge a downpayment on bigger jobs so materials are never funded out of your own pocket.' },
    { risk: 'Doing everything alone', contingency: 'Cap your daily bookings at what you can finish well, and train one helper before you scale up.' },
  ],
  permits: [...SHARED_PERMITS, 'Occupational / Working Permit'],
  extraQuestions: [
    { id: 'service_duration', label: 'How long does one service take?', type: 'choice', options: ['Under 1 hour', '1 - 2 hours', 'Half a day', 'A full day or more'] },
    { id: 'staffing', label: 'Are you working alone or with staff?', type: 'choice', options: ['Just me', '1 - 2 helpers', '3 or more staff'] },
    { id: 'service_location', label: 'Where will you do the work?', type: 'choice', options: ['At my own place', 'Home service (I go to the client)', 'Both'] },
  ],
  operationsTask: {
    title: 'Price Your Services & Prepare Your Tools',
    desc: 'Set a rate per service that pays for your materials, your hours and your equipment — not just supplies.',
    category: 'Operations',
    agency: 'Self-managed & Equipment Suppliers',
    legal_basis: 'RA 9178 BMBE Financial Compliance & Cost Accounting',
    estimated_time: '2 - 3 Days',
    estimated_cost: 'Operating Budget',
    required_docs: ['Service List', 'Rate Sheet', 'Equipment & Supplies Inventory'],
    sub_steps: [
      'List every service you offer and how long each one actually takes',
      'Compute the cost per service: consumables + your hours + a share of rent, water and electricity',
      'Check what nearby providers charge, then set your rate per service',
      'Buy or check your tools and equipment, and set a maintenance schedule',
      'Choose how clients will book you — text, Messenger, or a simple appointment notebook',
    ],
  },
  launchTask: {
    title: 'Service Menu, Booking Channel & First Clients',
    desc: 'Publish clear rates, make yourself easy to book, and win the first clients who will refer you.',
    category: 'Launch',
    agency: 'Local Community & Social Media',
    legal_basis: 'RA 7394 Consumer Act of the Philippines (posted rates)',
    estimated_time: '2 Days',
    estimated_cost: '₱800 - ₱2,000',
    required_docs: ['Service Rate Board', 'Booking Contact', 'Before/After Photos'],
    sub_steps: [
      'Post a clear service menu with the rate for each service',
      'Set up one booking channel and answer it consistently — Messenger, text, or a posted number',
      'Display your permits and rates where clients can see them',
      'Offer an introductory rate to your first clients and ask permission to post before/after photos',
      'Ask every satisfied client for a referral — word of mouth is how service businesses grow',
    ],
  },
  businessExecutionTasks: [
    {
      title: 'Commercial Space Feasibility, Workstation Ergonomics & Facility Setup',
      desc: 'Verify location accessibility, commercial lease terms, and design an ergonomic service floor plan.',
      category: 'Planning',
      agency: 'Local Property Owner & City Building Official',
      legal_basis: 'PD 1096 National Building Code & PD 856 Sanitation Code',
      estimated_time: '3 - 5 Days',
      estimated_cost: '₱5,000 - ₱15,000',
      required_docs: ['Commercial Lease Agreement', 'Floor Layout Sketch', 'Utility Verification'],
      sub_steps: [
        'Survey location foot traffic and parking accessibility for booking clients and service staff',
        'Negotiate lease terms with landlord or set up a dedicated, well-ventilated home-based studio space',
        'Ensure adequate water drainage, stable 220V power circuits, and reliable high-speed Wi-Fi connectivity',
        'Procure safety gear: fire extinguisher, fully stocked first-aid kit, and emergency task lighting',
      ],
    },
    {
      title: 'Tooling, Commercial Consumables & Workstation Setup',
      desc: 'Canvass professional instruments, source bulk consumables, and setup an ergonomic workspace.',
      category: 'Supplies',
      agency: 'Professional Equipment Suppliers',
      legal_basis: 'PD 856 Sanitation Code & Occupational Safety Standards',
      estimated_time: '3 - 5 Days',
      estimated_cost: '₱15,000 - ₱45,000',
      required_docs: ['Equipment Purchase Invoices', 'Consumables Inventory Log', 'Sanitizing Kit'],
      sub_steps: [
        'Canvass professional-grade tools (shears, clippers, grooming tables, styling chairs, or diagnostic kits) with warranty',
        'Source hypoallergenic commercial-grade consumables in bulk containers to minimize per-client material expenses',
        'Setup an ergonomic workstation with non-slip flooring, bright task lighting, and dedicated electrical outlets',
        'Install a UV barbicide or alcohol sterilizing station to disinfect all instruments between client sessions',
      ],
    },
    {
      title: 'Service Rate Card & Labor Costing Architecture',
      desc: 'Calculate cost per service including consumables, labor hours, and overhead to build a rate menu.',
      category: 'Operations',
      agency: 'Self-managed & Financial Costing',
      legal_basis: 'RA 7394 Consumer Act (Posted Rates) & RA 9178 BMBE Act',
      estimated_time: '2 Days',
      estimated_cost: 'Operating Budget',
      required_docs: ['Service Rate Menu', 'Consumable Cost Worksheet', 'Client Intake Sheet'],
      sub_steps: [
        'Compute true cost per service: direct consumables used + labor hours + share of rent, power, and equipment wear',
        'Canvass competitor rates within your 3km radius and set competitive tiered service packages (Basic, Premium, Deluxe)',
        'Formulate transparent add-on service pricing (deep treatment, rush booking, or home service travel surcharge)',
        'Print and display a clean, laminated service menu card visible to walk-in and booking clients under RA 7394',
      ],
    },
    {
      title: 'Booking Channels, Client Management SOPs & Hygiene Protocols',
      desc: 'Configure WhatsApp/Messenger booking, require booking confirmations, and enforce sanitation standards.',
      category: 'Operations',
      agency: 'Internal Operations & City Health Office',
      legal_basis: 'PD 856 Sanitation Code of the Philippines',
      estimated_time: '2 Days',
      estimated_cost: '₱500 - ₱1,500',
      required_docs: ['Appointment Calendar', 'Client Intake / Consent Form', 'Daily Sanitation Log'],
      sub_steps: [
        'Setup a dedicated WhatsApp / Messenger business booking channel with automated greeting, price list, and business hours',
        'Require a 20% downpayment or automated SMS confirmation 24 hours prior to eliminate costly client no-shows',
        'Implement client intake forms: record allergies, skin sensitivities, pet temperament, or device passcodes before starting',
        'Clean and disinfect the workstation after every client and replace disposable protective covers',
      ],
    },
    {
      title: 'Portfolio Showcase, Intro Promo & Referral Growth Kickoff',
      desc: 'Capture before-and-after photos, run an introductory promotion, and distribute referral cards.',
      category: 'Launch',
      agency: 'Local Community & Social Media Platforms',
      legal_basis: 'RA 7394 Consumer Act of the Philippines',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱1,000 - ₱3,000',
      required_docs: ['Before/After Photo Portfolio', 'Referral Discount Cards', 'Promo Signage'],
      sub_steps: [
        'Capture high-quality before-and-after photos of your first 10 client transformations (with client permission) for social media',
        'Offer an introductory promotion: 15% discount for the first 25 clients or a free add-on with any premium package',
        'Distribute "Refer-a-Friend" cards giving ₱50 discounts to both the referring client and their friend on next visits',
        'Request Google Maps and Facebook page reviews from every satisfied customer right upon service completion',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 7. Buy & Sell / Reselling (Gadgets, RTW, Surplus, Vehicles)
// ---------------------------------------------------------------------------
const BUY_SELL: BusinessProfile = {
  id: 'Buy & Sell / Reselling',
  label: 'Buy & Sell / Reselling',
  desc: 'Ukay-ukay, gadgets, vehicles, appliances & reselling',
  iconName: 'shopping-bag',
  isProductBased: true,
  customerSegments: ['Local Residents', 'Students', 'Online Shoppers', 'Resellers', 'Market-goers'],
  differentiatorPlaceholder: 'e.g. new stock weekly, tested before selling, with warranty...',
  researchStages: [
    { id: 'not_yet', label: 'Not yet' },
    { id: 'asked', label: 'Asked around friends/neighbors' },
    { id: 'checked', label: 'Checked competitor prices' },
    { id: 'sold', label: 'Already sold test items' },
  ],
  risks: [
    { risk: 'Unsold / dead stock', contingency: 'Buy small quantities first, and discount anything that has not moved in a month rather than letting capital sit in it.' },
    { risk: 'Slow sales', contingency: 'Refresh what is on display weekly and announce new stock so regulars have a reason to come back.' },
    { risk: 'Strong competition', contingency: 'Specialise in one category you know well rather than carrying a little of everything.' },
    { risk: 'Defective or faulty items', contingency: 'Test or inspect every item on arrival and agree a return arrangement with your supplier before paying.' },
    { risk: 'Stolen or undocumented goods', contingency: 'For anything with papers — vehicles, phones, appliances — check ownership documents and serial numbers before buying. Selling stolen goods is a criminal offence under RA 10883 and PD 1612.' },
    { risk: 'Rising supplier prices', contingency: 'Build relationships with 2-3 suppliers so you are never captive to one source or one price.' },
    { risk: 'Running out of cash', contingency: 'Reinvest only part of your sales into new stock and keep the rest as working capital.' },
    { risk: 'Damage in storage', contingency: 'Store stock off the floor and covered — water or dust damage writes off inventory instantly.' },
  ],
  permits: SHARED_PERMITS,
  extraQuestions: [
    {
      id: 'resell_type',
      label: 'What do you mainly buy and sell?',
      type: 'choice',
      options: ['Clothing / RTW', 'Gadgets & electronics', 'Vehicles & parts', 'Appliances & furniture', 'Mixed items'],
    },
    {
      id: 'stock_source',
      label: 'Where will you get your stock?',
      type: 'choice',
      options: ['Wholesaler or bale supplier', 'Divisoria or Baclaran', 'Online / individual sellers', 'Not sure yet'],
    },
    { id: 'item_condition', label: 'What condition?', type: 'choice', options: ['Brand new', 'Preloved / second-hand', 'Both'] },
  ],
  operationsTask: {
    title: 'Source Your Stock & Price Per Item',
    desc: 'Find reliable suppliers, check each item on arrival, and price it for a real profit.',
    category: 'Supplies',
    agency: 'Private Suppliers & Wholesalers',
    legal_basis: 'RA 9178 BMBE Financial Compliance & Cost Accounting',
    estimated_time: '2 - 4 Days',
    estimated_cost: 'Operating Budget',
    required_docs: ['Supplier Contacts List', 'Costing Sheet', 'GCash Merchant QR'],
    sub_steps: [
      'Canvass 3 suppliers or sources and compare the price per item',
      'Inspect or test a sample before committing to a large order',
      'For items with papers — vehicles, phones, appliances — verify ownership documents and serial numbers',
      'Use the Smart Calculator to set a price per item, allowing for markdowns later',
      'Set up a business e-wallet / GCash Merchant account',
    ],
  },
  launchTask: {
    title: 'Display Setup, Price Tags & Opening Sale',
    desc: 'Make the stock easy to browse, clearly priced, and worth a first visit.',
    category: 'Launch',
    agency: 'DTI Fair Trade Bureau & Local Community',
    legal_basis: 'RA 7394 Consumer Act of the Philippines (Price Tag Law)',
    estimated_time: '2 Days',
    estimated_cost: '₱1,000 - ₱3,000',
    required_docs: ['Racks / Display Fixtures', 'Price Tags', 'Promo Flyers'],
    sub_steps: [
      'Arrange stock so customers can browse by category without having to ask',
      'Attach a clear price tag to every item (RA 7394 Price Tag Law)',
      'Note the condition and any warranty on second-hand items, so buyers know what they are getting',
      'Display your permits and set up a GCash / Maya QR standee',
      'Run an opening sale and note which items move fastest',
    ],
  },
  businessExecutionTasks: [
    {
      title: 'Authentic Inventory Due Diligence & Legal Anti-Fencing Checklist',
      desc: 'Verify proof of ownership, run IMEI/serial number checks, and execute notarized deeds of sale.',
      category: 'Legal',
      agency: 'PNP-HPG / LTO / Seller Verification Desk',
      legal_basis: 'PD 1612 (Anti-Fencing Law) & RA 10883 (Anti-Carnapping Act)',
      estimated_time: 'Per purchase protocol',
      estimated_cost: 'Varies',
      required_docs: ['Notarized Deed of Absolute Sale', 'OR/CR (Vehicles)', 'Seller Valid Government IDs', 'IMEI Check Log'],
      sub_steps: [
        'Require notarized Deed of Absolute Sale and 2 valid government IDs for all high-value resold items (gadgets, vehicles)',
        'For electronics and phones: run serial/IMEI checks against blacklist databases and ensure iCloud/Google accounts are signed out',
        'For motor vehicles: cross-reference OR/CR against chassis and engine numbers and verify clearance with PNP-HPG',
        'Maintain a detailed purchase inventory ledger with seller contact info and serial numbers to avoid criminal fencing liability',
      ],
    },
    {
      title: 'Surplus & Wholesale Supplier Sourcing & Testing Protocol',
      desc: 'Canvass surplus importers or bale distributors and test every item before committing payment.',
      category: 'Supplies',
      agency: 'Surplus Importers, Bale Wholesalers & Auctions',
      legal_basis: 'RA 9178 BMBE Financial Compliance',
      estimated_time: '3 - 5 Days',
      estimated_cost: '₱15,000 - ₱50,000 (initial inventory)',
      required_docs: ['Supplier Comparison Sheet', 'Item Testing Checklist', 'Refurbishing Cost Log'],
      sub_steps: [
        'Canvass at least 3 surplus importers, bale suppliers, or liquidation auctions and compare price-per-unit lots',
        'Test every incoming unit: inspect battery health, charging ports, screen touch response, mechanical joints, and motors',
        'Clean, detail, and refurbish secondhand goods thoroughly to maximize perceived customer value and command premium pricing',
        'Sort stock into clear quality grades: Grade A (mint/like new), Grade B (minor cosmetic wear), and Bargain Clearance',
      ],
    },
    {
      title: 'Reselling Costing, Margin Formulas & Pricing Architecture',
      desc: 'Factor refurbishing, replacement parts, and bargaining buffers into listed prices.',
      category: 'Operations',
      agency: 'Self-managed & Financial Costing',
      legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
      estimated_time: '2 Days',
      estimated_cost: 'Operating Budget',
      required_docs: ['Costing & Margin Sheet', 'Price Tags', 'Warranty Policy Terms'],
      sub_steps: [
        'Compute total invested cost per item: purchase price + freight + replacement parts + cleaning and testing labor',
        'Set target profit margins: minimum 30–50% on preloved apparel/small goods and 15–25% on higher-ticket electronics and appliances',
        'Incorporate a haggling buffer (tawad buffer) into listed prices so customer discounts never breach your required profit floor',
        'Attach clear price tags detailing item specs, condition grade, and warranty coverage under RA 7394 Price Tag Law',
      ],
    },
    {
      title: 'Refurbishing Standards, Testing Protocols & Safe Storage SOPs',
      desc: 'Enforce multi-point item testing, cosmetic detailing, and organized, secure inventory storage.',
      category: 'Operations',
      agency: 'Internal Operations & DTI Fair Trade Bureau',
      legal_basis: 'RA 7394 Consumer Act of the Philippines',
      estimated_time: '2 Days',
      estimated_cost: '₱1,000 - ₱2,500',
      required_docs: ['Multi-Point Inspection Checklist', 'Inventory Bin Labels', 'Repair Log'],
      sub_steps: [
        'Execute standardized multi-point testing for every piece: power, buttons, seals, zipper glide, and structural integrity',
        'Deep-clean, polish, and detail items to like-new aesthetic condition before moving to inventory shelves',
        'Assign unique SKU numbers and store goods in dry, moisture-protected, lockable storage bins or racks',
        'Enforce daily inventory audits to prevent loss, mishandling damage, and tracking discrepancies',
      ],
    },
    {
      title: 'Marketplace Listings, Warranty Protection & Trust-Building Launch',
      desc: 'Publish transparent condition photos, offer a 7-day warranty, and establish safe meetup points.',
      category: 'Launch',
      agency: 'Facebook Marketplace, Carousell & Local Community',
      legal_basis: 'RA 7394 Consumer Act (Fair Trade)',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱1,000 - ₱2,500',
      required_docs: ['Detailed Condition Photos', 'Written 7-Day Warranty Slip', 'Safe Meetup Location Map'],
      sub_steps: [
        'Photograph each item with transparent condition disclosure: clearly show any scratches or cosmetic wear to prevent disputes',
        'Provide a written 7-day to 30-day replacement or repair warranty on tested electronics to immediately establish customer trust',
        'Designate safe public meetup locations (mall lobbies, police station frontages, or active barangay halls) or COD couriers',
        'Post new stock arrivals weekly on local social media buy-and-sell groups to cultivate a following of bargain-hunting regulars',
      ],
    },
  ],
};

// ---------------------------------------------------------------------------
// 8. Pharmacy / Community Drugstore / Botika
// ---------------------------------------------------------------------------
const PHARMACY: BusinessProfile = {
  id: 'Pharmacy / Drugstore',
  label: 'Pharmacy / Drugstore',
  desc: 'Retail medicines, generics & healthcare items',
  iconName: 'store',
  isProductBased: true,
  customerSegments: ['Senior Citizens (SC)', 'PWD & Chronic Patients', 'Local Families & Parents', 'Barangay Walk-ins', 'Nearby Clinics / Workers'],
  differentiatorPlaceholder: 'e.g. 24/7, stocks low-cost generics, free blood pressure check, fast delivery...',
  researchStages: [
    { id: 'not_yet', label: 'Not yet' },
    { id: 'asked', label: 'Surveyed neighborhood medicine needs' },
    { id: 'checked', label: 'Canvassed nearby generic drugstores' },
    { id: 'sold', label: 'Already partnered with licensed pharmacist' },
  ],
  risks: [
    { risk: 'FDA regulatory compliance', contingency: 'Partner with a PRC-registered Pharmacist and prepare cold-chain fridge logs before submitting FDA eServices application.' },
    { risk: 'High cost of branded inventory', contingency: 'Prioritize high-demand generic equivalents under RA 6675 with 40–60% higher gross margins.' },
    { risk: 'Senior & PWD discount margin squeeze', contingency: 'Factor the mandatory 20% discount and 12% VAT exemption into unit costing and claim tax deductions under RA 9994.' },
    { risk: 'Spoilage & near-expiry inventory', contingency: 'Enforce a strict FEFO (First-Expired, First-Out) shelf protocol and return near-expiry stock to distributors 6 months in advance.' },
    { risk: 'Strong competition from major chains', contingency: 'Compete on neighborhood proximity, personalized patient care, free BP monitoring, and emergency home delivery.' },
    { risk: 'Running out of cash', contingency: 'Keep at least 3 months of operating expenses in reserve while FDA LTO application is being processed.' },
    { risk: 'Permit problems', contingency: 'Finish your Barangay clearance and City Health clearance first — the FDA LTO inspection requires them.' },
  ],
  permits: [...SHARED_PERMITS, 'FDA License to Operate (LTO)', 'PRC Pharmacist Board Registration'],
  extraQuestions: [
    {
      id: 'has_pharmacist',
      label: 'Do you already have a PRC Registered Pharmacist?',
      type: 'choice',
      options: ['Yes, already contracted', 'Currently looking', 'Owner is licensed pharmacist'],
    },
    {
      id: 'cold_chain',
      label: 'Do you have cold-chain refrigeration for vaccines and insulin?',
      type: 'choice',
      options: ['Yes, dedicated pharmaceutical fridge', 'Standard fridge with thermometer', 'Planning to purchase'],
    },
  ],
  operationsTask: {
    title: 'Pharmacist Contract & Pharmaceutical Cold-Chain Setup',
    desc: 'Notarize employment agreement with a PRC-licensed supervising pharmacist and calibrate temperature-controlled medicine storage.',
    category: 'Permits',
    agency: 'Food and Drug Administration (FDA) & PRC',
    legal_basis: 'RA 10918 (Philippine Pharmacy Act) & RA 9711',
    estimated_time: '5 - 10 Days',
    estimated_cost: '₱15,000 - ₱30,000 (retainer/fridge)',
    required_docs: ['PRC Pharmacist ID & Board Certificate', 'Pharmacist-Owner Contract', 'Refrigerator Thermometer Calibration Logbook', 'Philippine National Drug Formulary (PNDF)'],
    sub_steps: [
      'Contract a PRC-registered Pharmacist and notarize official Pharmacist-Owner Employment Agreement',
      'Equip store with dedicated pharmaceutical refrigerator maintaining 2°C–8°C with dual-temperature thermometer',
      'Acquire official FDA prescription book, senior citizen sales record book, and latest PNDF formulary reference',
      'Establish partitioned dispensing counter preventing unauthorized customer access to prescription medicines',
    ],
  },
  launchTask: {
    title: 'FDA Drug Outlet LTO & Senior/PWD Dispensing Setup',
    desc: 'Secure official FDA License to Operate as retail drug outlet and establish mandatory Senior/PWD discount and prescription recording books.',
    category: 'Launch',
    agency: 'FDA eServices & Local DTI/BPLO',
    legal_basis: 'RA 9994 (Senior Citizens Act) & RA 10754 (PWD Act) & RA 6675 (Generics Act)',
    estimated_time: '15 - 30 Days',
    estimated_cost: '₱2,000 - ₱5,000',
    required_docs: ['FDA LTO Certificate', 'Senior/PWD Sales Book', 'Prescription Record Book', 'Posted Generic Menu Board'],
    sub_steps: [
      'File online FDA License to Operate (LTO) application via FDA eServices portal (eservices.fda.gov.ph)',
      'Undergo FDA post-marketing inspection and display official framed LTO in customer service area',
      'Display mandatory signage informing customers of generic alternatives under RA 6675 Generics Act',
      'Implement strict 20% discount and 12% VAT exemption protocol for Senior Citizens and PWD customers',
    ],
  },
  businessExecutionTasks: [
    {
      title: 'Storefront Layout, Partitioned Dispensing Counter & Cold Storage',
      desc: 'Design physical pharmacy layout with partitioned counter and 2°C–8°C calibrated refrigeration.',
      category: 'Planning',
      agency: 'Local Government BPLO & FDA Licensing Division',
      legal_basis: 'RA 10918 Philippine Pharmacy Act & RA 9711 FDA Act',
      estimated_time: '5 - 10 Days',
      estimated_cost: '₱25,000 - ₱50,000 (counter & fridge)',
      required_docs: ['Store Vicinity & Floor Plan Map', 'Commercial Lease Contract', 'Digital Thermometer Calibration Log'],
      sub_steps: [
        'Design physical pharmacy floor plan with a partitioned dispensing counter preventing unauthorized public access to prescription stock',
        'Equip store with a dedicated pharmaceutical refrigerator maintaining 2°C–8°C for vaccines, insulin, and biologicals',
        'Install dual-temperature digital min/max thermometers and maintain daily temperature logbooks',
        'Ensure the air-conditioned medicine storage area never exceeds 30°C to comply with FDA good distribution practice',
      ],
    },
    {
      title: 'PRC Pharmacist Partnership & FDA eServices LTO Filing',
      desc: 'Contract a supervising PRC pharmacist, notarize employment terms, and file online FDA LTO.',
      category: 'Permits',
      agency: 'Professional Regulation Commission (PRC) & FDA Philippines',
      legal_basis: 'RA 10918 (Philippine Pharmacy Act) & DOH AO 2020-0017',
      estimated_time: '15 - 30 Days',
      estimated_cost: '₱15,000 - ₱35,000 (retainer & FDA fees)',
      required_docs: ['PRC Pharmacist Board Certificate & ID', 'Notarized Pharmacist-Owner Agreement', 'FDA eServices Application'],
      sub_steps: [
        'Contract a licensed PRC Registered Pharmacist as Supervising Pharmacist and notarize official employment agreement',
        'File online FDA License to Operate (LTO) as Retail Drug Outlet via FDA eServices portal (eservices.fda.gov.ph)',
        'Acquire official FDA-mandated record books: Prescription Book, Senior Citizen Sales Book, PWD Record Book',
        'Procure the latest physical reference copies of Philippine National Drug Formulary (PNDF) and United States Pharmacopeia',
      ],
    },
    {
      title: 'Wholesale Distributor Canvassing & Generic Formulation Sourcing',
      desc: 'Open accounts with licensed distributors and stock high-margin generic equivalents.',
      category: 'Supplies',
      agency: 'FDA-Licensed Pharmaceutical Distributors (Zuellig, Metro Drug, Unilab, RiteMed)',
      legal_basis: 'RA 6675 Generics Act of 1988 & RA 9178 BMBE Act',
      estimated_time: '7 - 14 Days',
      estimated_cost: '₱80,000 - ₱200,000 (initial medicine inventory)',
      required_docs: ['Distributor Credit Application', 'Certificate of Product Registration (CPR)', 'Batch Release Certs'],
      sub_steps: [
        'Submit FDA LTO credentials and BIR 2303 to major pharmaceutical distributors to open wholesale credit accounts',
        'Stock high-margin generic equivalents (Paracetamol, Amoxicillin, Losartan, Metformin) with 40–60% profit margins',
        'Stock essential branded over-the-counter (OTC) medicines, vitamins, first-aid items, and infant hygiene consumables',
        'Enforce strict First-Expired, First-Out (FEFO) shelf organization protocol and record batch numbers and expiry dates',
      ],
    },
    {
      title: 'Senior/PWD 20% Discount Architecture & POS Prescription Setup',
      desc: 'Configure POS for mandatory 20% discount and 12% VAT exemption and display generic price comparison.',
      category: 'Operations',
      agency: 'DTI Fair Trade Bureau & Office of Senior Citizens Affairs (OSCA)',
      legal_basis: 'RA 9994 Expanded Senior Citizens Act & RA 10754 PWD Act',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱2,000 - ₱5,000',
      required_docs: ['Generics Menu Board', 'Senior/PWD Discount Register', 'VAT-Exempt Receipt Template'],
      sub_steps: [
        'Display mandatory Generics Menu Board in customer service area showing brand names side-by-side with lower-cost generic alternatives',
        'Configure Point of Sale (POS) or sales calculator with one-touch 20% discount and 12% VAT exemption formula for Senior/PWD cardholders',
        'Establish protocol for recording prescription medicines: verify doctor PRC license, S2 license (for regulated drugs), and patient details',
        'Train pharmacy assistant on checking OSCA/PWD booklets and signing customer purchase logbooks accurately',
      ],
    },
    {
      title: 'Community Health Care Outreach, Free BP Checks & Grand Opening',
      desc: 'Provide complimentary blood pressure checks, distribute emergency medicine hotlines, and launch cashier QR.',
      category: 'Launch',
      agency: 'Local Barangay Health Center & Neighborhood Community',
      legal_basis: 'RA 7394 Consumer Act (Price Tag Law)',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱1,500 - ₱3,500',
      required_docs: ['Calibrated BP Monitor', 'Grand Opening Health Flyers', 'Emergency Hotline Stickers'],
      sub_steps: [
        'Setup a complimentary blood pressure (BP) and weight check station at the entrance to welcome barangay senior citizens and families',
        'Distribute community flyers with emergency medicine delivery hotline and list of affordable maintenance medicine packages',
        'Display framed FDA LTO, DTI Certificate, Mayor’s Permit, and BIR 2303 prominently in customer dispensing area',
        'Provide cashless payment convenience (GCash and Maya QR) and small first-aid giveaway kits for the first 50 opening day customers',
      ],
    },
  ],
};

export const BUSINESS_PROFILES: BusinessProfile[] = [
  SARI_SARI,
  FOOD,
  LAUNDRY,
  WATER_STATION,
  ONLINE,
  SERVICES,
  BUY_SELL,
  PHARMACY,
];

export const CUSTOM_BUSINESS_ID = 'other';

/**
 * Neutral profile used when a business type is unknown and Khora AI could not
 * be reached. Deliberately avoids both "your products" and "your services"
 * wording, so it never reads wrong for either kind of business.
 */
export const GENERIC_PROFILE: BusinessProfile = {
  id: 'Custom Business',
  label: 'Custom Business',
  desc: 'Something else',
  iconName: 'plus-circle',
  isProductBased: true,
  customerSegments: ['Local Residents', 'Students', 'Office Workers', 'Online Customers', 'Small Businesses'],
  differentiatorPlaceholder: 'e.g. cheaper, faster, offers something no one else does...',
  researchStages: [
    { id: 'not_yet', label: 'Not yet' },
    { id: 'asked', label: 'Asked around friends/neighbors' },
    { id: 'checked', label: 'Checked nearby competitors' },
    { id: 'sold', label: 'Already had test customers' },
  ],
  risks: [
    { risk: 'Slow start', contingency: 'Run an introductory offer and ask your first customers for referrals.' },
    { risk: 'Strong competition', contingency: 'Pick one thing you can do better than anyone nearby and lead with it.' },
    { risk: 'Rising costs', contingency: 'Track your cost per sale monthly and review your price whenever inputs jump.' },
    { risk: 'Running out of cash', contingency: 'Keep part of your starting budget untouched as emergency capital.' },
    { risk: 'Permit problems', contingency: 'Finish your Barangay clearance first — the Mayor permit application needs it.' },
    { risk: 'Doing everything alone', contingency: 'Set fixed working hours and delegate the tasks that do not need you personally.' },
  ],
  permits: SHARED_PERMITS,
  extraQuestions: [],
  operationsTask: {
    title: 'Work Out Your Costs & Set Your Prices',
    desc: 'Know what one sale actually costs you before deciding what to charge for it.',
    category: 'Operations',
    agency: 'Self-managed & Suppliers',
    legal_basis: 'RA 9178 BMBE Financial Compliance & Cost Accounting',
    estimated_time: '2 - 3 Days',
    estimated_cost: 'Operating Budget',
    required_docs: ['Supplier / Equipment List', 'Costing Sheet'],
    sub_steps: [
      'List everything you need to buy or prepare before your first sale',
      'Compute what one sale costs you, including your own time',
      'Use the Smart Calculator to set a price with a real margin',
      'Set up a business e-wallet / GCash Merchant account',
    ],
  },
  launchTask: {
    title: 'Publish Your Prices & Serve Your First Customers',
    desc: 'Make it obvious what you offer and what it costs, then win your first customers.',
    category: 'Launch',
    agency: 'Local Community & Social Media',
    legal_basis: 'RA 7394 Consumer Act of the Philippines',
    estimated_time: '2 Days',
    estimated_cost: '₱800 - ₱2,500',
    required_docs: ['Price List', 'Contact Channel', 'Promo Materials'],
    sub_steps: [
      'Post a clear list of what you offer and what each one costs',
      'Display your permits where customers can see them',
      'Set up one channel customers can reach you on, and answer it consistently',
      'Run an introductory offer and ask your first customers for referrals',
    ],
  },
  businessExecutionTasks: [
    {
      title: 'Commercial Feasibility, Location Scouting & Space Setup',
      desc: 'Verify commercial location, utility requirements, and negotiate lease terms.',
      category: 'Planning',
      agency: 'Local Property Owner & Utility Providers',
      legal_basis: 'Civil Code of the Philippines (Commercial Lease)',
      estimated_time: '3 - 5 Days',
      estimated_cost: '₱3,000 - ₱10,000',
      required_docs: ['Commercial Lease Contract', 'Space Layout Sketch', 'Utility Verification'],
      sub_steps: [
        'Survey target market foot traffic or online audience demand in your chosen area',
        'Verify required physical utilities: electrical capacity, clean water, drainage, and internet connectivity',
        'Negotiate lease terms with landlord or set up dedicated home-based workspace',
        'Procure safety essentials: fire extinguisher, first aid kit, and emergency lighting',
      ],
    },
    {
      title: 'Equipment Canvassing & Direct Supplier Sourcing',
      desc: 'Canvass at least 3 suppliers, compare warranties, and secure wholesale supplies.',
      category: 'Supplies',
      agency: 'Private Suppliers, Distributors & Equipment Vendors',
      legal_basis: 'RA 9178 BMBE Financial Compliance & Cost Accounting',
      estimated_time: '3 - 5 Days',
      estimated_cost: 'Operating Budget',
      required_docs: ['Supplier Price Comparison', 'Warranty Contracts', 'Initial Inventory List'],
      sub_steps: [
        'Canvass at least 3 authorized suppliers or equipment vendors and compare bulk pricing and warranty coverage',
        'Inspect sample units or test product batches before committing large capital orders',
        'Negotiate payment terms or volume discount rebate tiers with preferred suppliers',
        'Establish an inventory tracking sheet with minimum reorder point thresholds',
      ],
    },
    {
      title: 'Unit Costing, Pricing Strategy & Margin Architecture',
      desc: 'Calculate direct costs, overhead expenses, and set prices with sustainable gross margins.',
      category: 'Operations',
      agency: 'Self-managed & Financial Costing',
      legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
      estimated_time: '2 Days',
      estimated_cost: 'Operating Budget',
      required_docs: ['Unit Costing Worksheet', 'Published Price List', 'Breakeven Calculation'],
      sub_steps: [
        'Calculate direct cost per sale (supplies/materials) + labor time + share of utilities and rent',
        'Benchmark competitor rates and set profitable pricing with at least 30–45% gross margin cushion',
        'Create attractive product or service packages to increase average transaction ticket size',
        'Publish clear, transparent price lists compliant with RA 7394 Consumer Act (Price Tag Law)',
      ],
    },
    {
      title: 'Operational SOPs, Quality Control & Day-to-Day Systems',
      desc: 'Document step-by-step operating checklists and separate business cash flow.',
      category: 'Operations',
      agency: 'Internal Business Operations',
      legal_basis: 'RA 9178 BMBE Financial Accounting Standards',
      estimated_time: '2 Days',
      estimated_cost: '₱500 - ₱1,500',
      required_docs: ['Standard Operating Procedures (SOP)', 'Daily Checklist', 'Dedicated Cash Drawer'],
      sub_steps: [
        'Document standard operating procedures (SOPs) for opening, service delivery/prep, and daily closing',
        'Implement quality inspection checklist before handing any finished product or service to a customer',
        'Maintain a separate business cash box and bank/e-wallet account — never mix with personal household funds',
        'Record daily sales and expenses every evening to maintain accurate bookkeeping records',
      ],
    },
    {
      title: 'Soft Opening Dry-Run, Customer Acquisition & Promotional Kickoff',
      desc: 'Conduct a soft launch test, offer introductory promos, and launch customer referral incentives.',
      category: 'Launch',
      agency: 'Local Community & Social Media',
      legal_basis: 'RA 7394 Consumer Act of the Philippines',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱1,000 - ₱3,000',
      required_docs: ['Price Board / Service Menu', 'Cashless Payment QR Standee', 'Promo Materials'],
      sub_steps: [
        'Conduct a 1-day soft opening dry run with friends or neighbors to test operational speed and workflow',
        'Display official business permits and setup a GCash / Maya QR Code standee at customer checkout',
        'Launch an introductory opening promotion (e.g. 15–20% launch discount or free bonus add-on)',
        'Ask every satisfied early customer for a written review or referral to accelerate word-of-mouth growth',
      ],
    },
  ],
};

/**
 * Dynamic Philippine Trade Engine for Custom Businesses.
 * Generates comprehensive, industry-specific 5-phase business execution blueprints
 * for businesses not on the fixed 8-option list (e.g. Bakery, Motorcycle/Auto Repair,
 * Printing/Sublimation, Barbershop/Salon, Poultry/Farming, Gym, Hardware, Tailoring,
 * or ANY novel custom business entered by the user).
 */
export const buildCustomBusinessProfile = (businessType: string): BusinessProfile => {
  const cleanName = (businessType || '').trim() || 'Custom Business';
  const lower = cleanName.toLowerCase();

  // 1. Bakery / Pastry / Cakes / Panaderia
  if (
    lower.includes('bakery') ||
    lower.includes('bakeshop') ||
    lower.includes('pastry') ||
    lower.includes('bread') ||
    lower.includes('tinapay') ||
    lower.includes('pandesal') ||
    lower.includes('cake') ||
    lower.includes('kakanin') ||
    lower.includes('panaderia')
  ) {
    return {
      id: cleanName,
      label: cleanName,
      desc: 'Fresh bread, pandesal, pastries & baked goods',
      iconName: 'utensils',
      isProductBased: true,
      customerSegments: ['Neighborhood Breakfast Commuters', 'School Children & Merienda Buyers', 'Office Workers & Coffee Drinkers', 'Local Canteens & Resellers', 'Event & Birthday Celebrants'],
      differentiatorPlaceholder: 'e.g. freshly baked pandesal at 5 AM, ube cheese pandesal, custom birthday cakes...',
      researchStages: [
        { id: 'not_yet', label: 'Not yet' },
        { id: 'asked', label: 'Asked neighbors about daily bread consumption' },
        { id: 'checked', label: 'Canvassed nearby panaderias & flour suppliers' },
        { id: 'sold', label: 'Already tested baking batches at home' },
      ],
      risks: [
        { risk: 'Flour & sugar price volatility', contingency: 'Lock in wholesale 25kg flour sacks from direct mill distributors and monitor daily dough yields.' },
        { risk: 'Day-old unsold bread staling', contingency: 'Repurpose day-old loaves into toasted biscocho, breadcrumbs, or bread pudding to recover ingredient costs.' },
        { risk: 'Oven breakdown & uneven heating', contingency: 'Clean deck burners weekly, keep backup heating elements, and calibrate analog oven thermometers.' },
        { risk: 'Yeast fermentation timing', contingency: 'Standardize proofing time and water temperature according to ambient morning room humidity.' },
        { risk: 'Sanitary & pest control compliance', contingency: 'Procure Food Handler Health Cards from City Health and store all flour in sealed, elevated plastic bins.' },
        { risk: 'High LPG & electricity bills', contingency: 'Consolidate daily baking into two fixed production schedules (4:00 AM and 2:00 PM) to avoid oven preheat waste.' },
      ],
      permits: [...SHARED_PERMITS, 'City Health Food Handler Certificate', 'Fire Safety Clearance (LPG/Ovens)'],
      extraQuestions: [
        {
          id: 'baking_focus',
          label: 'What will be your primary bakery focus?',
          type: 'choice',
          options: ['Daily breakfast staple (pandesal, pan de coco)', 'Specialty cakes & birthday pastries', 'Kakanin & traditional delicacies', 'Commercial wholesale supply to sari-sari stores'],
        },
        {
          id: 'oven_setup',
          label: 'What type of commercial oven will you operate?',
          type: 'choice',
          options: ['2-deck or 3-deck gas oven', 'Electric convection oven', 'Wood-fired brick oven (pugon)'],
        },
      ],
      operationsTask: {
        title: 'Baking Equipment Procurement & Direct Flour Sourcing',
        desc: 'Canvass commercial deck ovens, spiral dough mixers, and source 25kg flour sacks from mill distributors.',
        category: 'Supplies',
        agency: 'Commercial Bakery Equipment Vendors & Flour Mills',
        legal_basis: 'RA 9178 BMBE Financial Compliance & Consumer Act',
        estimated_time: '3 - 5 Days',
        estimated_cost: '₱35,000 - ₱90,000 (oven, mixer & initial flour)',
        required_docs: ['Equipment Invoices & Warranty', 'Flour Distributor Price List', 'Bakery Smallwares Checklist'],
        sub_steps: [
          'Canvass commercial 2-deck 4-tray gas/electric deck oven and 12.5kg–25kg spiral dough mixer with local warranty',
          'Source 25kg commercial flour sacks (hard flour for pandesal, soft flour for pastries) from direct mill distributors',
          'Procure essential bakery wares: 100+ corrugated baking sheet pans (planchas), bench scrapers, and digital weighing scales',
          'Stock essential bulk ingredients: active dry yeast, iodized salt, refined sugar, shortening/margarine, and food-grade packaging bags',
        ],
      },
      launchTask: {
        title: 'Grand Panaderia Opening & Morning Hot Pandesal Sampling',
        desc: 'Distribute hot pandesal tasting packs to early commuters and establish neighborhood morning foot traffic.',
        category: 'Launch',
        agency: 'Local Barangay Community & Neighborhood Commuters',
        legal_basis: 'RA 7394 Consumer Act of the Philippines',
        estimated_time: '2 - 3 Days',
        estimated_cost: '₱1,500 - ₱3,500',
        required_docs: ['Bakery Price Board', 'Cashless QR Standee', 'Opening Promotion Flyers'],
        sub_steps: [
          'Distribute "Free 3 Hot Pandesal" sample tasting packs to early morning walkers, tricycle drivers, and churchgoers on day one',
          'Display framed DTI, Barangay Clearance, and Sanitary Permit prominently near the bread display glass showcase',
          'Setup high-visibility outdoor bakery signage and maintain warm interior lighting focused on freshly baked display showcases',
          'Provide cashless payment options (GCash / Maya QR standee) for speedy morning checkout without loose change delays',
        ],
      },
      businessExecutionTasks: [
        {
          title: 'Bakery Workspace Ergonomics, Commercial Oven Ventilation & Space Layout',
          desc: 'Design clean two-zone bakery layout separating dough prep from high-heat oven and cooling racks.',
          category: 'Planning',
          agency: 'Local Property Owner & City Building Official',
          legal_basis: 'PD 1096 National Building Code & PD 856 Sanitation Code',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱10,000 - ₱25,000',
          required_docs: ['Commercial Lease Contract', 'Bakery Floor Layout Plan', 'Fire Safety Layout'],
          sub_steps: [
            'Design clean two-zone bakery layout separating dough prep/kneading area from high-heat oven and cooling racks',
            'Install heavy-duty commercial exhaust hood over deck ovens and verify safe LPG tank placement outside baking area',
            'Procure stainless steel dough preparation tables (at least 6-foot food grade) and heavy-duty flour storage bins with covers',
            'Verify adequate 220V electrical circuits for spiral mixer and proofing cabinets without tripping main breakers',
          ],
        },
        {
          title: 'Baking Equipment Procurement & Direct Flour Sourcing',
          desc: 'Canvass commercial deck ovens, spiral dough mixers, and source 25kg flour sacks from mill distributors.',
          category: 'Supplies',
          agency: 'Commercial Bakery Equipment Vendors & Flour Mills',
          legal_basis: 'RA 9178 BMBE Financial Compliance & Consumer Act',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱35,000 - ₱90,000 (oven, mixer & initial flour)',
          required_docs: ['Equipment Invoices & Warranty', 'Flour Distributor Price List', 'Bakery Smallwares Checklist'],
          sub_steps: [
            'Canvass commercial 2-deck 4-tray gas/electric deck oven and 12.5kg–25kg spiral dough mixer with local warranty',
            'Source 25kg commercial flour sacks (hard flour for pandesal, soft flour for pastries) from direct mill distributors',
            'Procure essential bakery wares: 100+ corrugated baking sheet pans (planchas), bench scrapers, and digital weighing scales',
            'Stock essential bulk ingredients: active dry yeast, iodized salt, refined sugar, shortening/margarine, and food-grade packaging bags',
          ],
        },
        {
          title: 'Recipe Yield Costing, Pan-Per-Dough Batch & Pricing Architecture',
          desc: 'Weigh exact dough batch outputs and compute unit margins for staple breads and specialty pastries.',
          category: 'Operations',
          agency: 'Self-managed & Financial Costing',
          legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
          estimated_time: '2 Days',
          estimated_cost: 'Operating Budget',
          required_docs: ['Dough Batch Costing Worksheet', 'Bakery Price List', 'Gross Margin Formulas'],
          sub_steps: [
            'Weigh exact dough batch outputs to compute precise gram weight per dough ball (e.g. 25g–35g per pandesal)',
            'Calculate total ingredient cost per pancha (24 pieces) including flour, sugar, yeast, shortening, LPG gas, and labor',
            'Set retail prices: affordable daily staple breads (pandesal at ₱2.50–₱4.00) and higher-margin specialty pastries (ensaymada at ₱8–₱15)',
            'Implement bundle promotions (e.g. buy 10 pandesal get 2 free, or breakfast hot coffee + 3 pandesal combo)',
          ],
        },
        {
          title: 'Morning/Merienda Baking Schedules, Proofing SOPs & Waste Prevention',
          desc: 'Establish 4:00 AM production schedules, monitor dough proofing, and repurpose day-old bread.',
          category: 'Operations',
          agency: 'Internal Bakery Operations & City Health Office',
          legal_basis: 'PD 856 Sanitation Code of the Philippines',
          estimated_time: '2 Days',
          estimated_cost: '₱500 - ₱1,500',
          required_docs: ['Daily Baking Schedule Log', 'Proofing Temperature Chart', 'FIFO Storage Sheet'],
          sub_steps: [
            'Establish strict 4:00 AM morning baking schedule so fresh, steaming pandesal is on display by 5:30 AM neighborhood commute',
            'Monitor dough proofing rise time and ambient temperature to avoid over-proofing and sour yeast taste',
            'Implement strict FIFO (First-In, First-Out) rotation for raw ingredient bags and maintain dry, sealed rodent-proof bins',
            'Repurpose unsold day-old sweet bread into toasted biscocho, breadcrumbs, or pudding to eliminate ingredient waste',
          ],
        },
        {
          title: 'Grand Panaderia Opening & Morning Hot Pandesal Sampling',
          desc: 'Distribute hot pandesal tasting packs to early commuters and establish neighborhood morning foot traffic.',
          category: 'Launch',
          agency: 'Local Barangay Community & Neighborhood Commuters',
          legal_basis: 'RA 7394 Consumer Act of the Philippines',
          estimated_time: '2 - 3 Days',
          estimated_cost: '₱1,500 - ₱3,500',
          required_docs: ['Bakery Price Board', 'Cashless QR Standee', 'Opening Promotion Flyers'],
          sub_steps: [
            'Distribute "Free 3 Hot Pandesal" sample tasting packs to early morning walkers, tricycle drivers, and churchgoers on day one',
            'Display framed DTI, Barangay Clearance, and Sanitary Permit prominently near the bread display glass showcase',
            'Setup high-visibility outdoor bakery signage and maintain warm interior lighting focused on freshly baked display showcases',
            'Provide cashless payment options (GCash / Maya QR standee) for speedy morning checkout without loose change delays',
          ],
        },
      ],
    };
  }

  // 2. Motorcycle Repair / Auto Detailing / Carwash / Vulcanizing Shop
  if (
    lower.includes('motor') ||
    lower.includes('motorcycle') ||
    lower.includes('auto') ||
    lower.includes('mechanic') ||
    lower.includes('repair') ||
    lower.includes('talyer') ||
    lower.includes('carwash') ||
    lower.includes('car wash') ||
    lower.includes('detailing') ||
    lower.includes('vulcaniz')
  ) {
    return {
      id: cleanName,
      label: cleanName,
      desc: 'Vehicle repair, preventative maintenance & detailing services',
      iconName: 'wrench',
      isProductBased: false,
      customerSegments: ['Daily Motorcycle Commuters', 'Tricycle Drivers & Toda Operators', 'Delivery Riders (Grab, Foodpanda, Lalamove)', 'Private Car & SUV Owners', 'Fleet & Commercial Operators'],
      differentiatorPlaceholder: 'e.g. 30-min PMS turnaround, specialized FI tuning, stock OEM parts, free chain lube...',
      researchStages: [
        { id: 'not_yet', label: 'Not yet' },
        { id: 'asked', label: 'Surveyed local TODA terminals and riders' },
        { id: 'checked', label: 'Benchmarked nearby talyers and parts shops' },
        { id: 'sold', label: 'Already performed test repairs for friends' },
      ],
      risks: [
        { risk: 'Customer disputes over misdiagnosed repairs', contingency: 'Implement written intake diagnostic checklists signed by customer before disassembly.' },
        { risk: 'Slow days between payday cycles', contingency: 'Offer scheduled preventative maintenance packages (oil change + brake cleaning bundle).' },
        { risk: 'Fake/substandard replacement parts', contingency: 'Partner with authorized distributor reps and keep official receipts to prove part authenticity.' },
        { risk: 'Environmental wastewater disposal violations', contingency: 'Install grease trap / oil-water separator pit compliant with DENR and LGU sanitation rules.' },
        { risk: 'High tool wear & mechanic safety hazards', contingency: 'Invest in impact pneumatic/cordless tools, safety goggles, and hydraulic lift locks.' },
        { risk: 'Running out of fast-moving consumables', contingency: 'Maintain reorder point buffers for engine oils, spark plugs, brake pads, and inner tubes.' },
      ],
      permits: [...SHARED_PERMITS, 'DENR Wastewater / Oil Separator Clearance', 'LGU Environmental Clearance'],
      extraQuestions: [
        {
          id: 'service_focus',
          label: 'What is your primary vehicle specialty?',
          type: 'choice',
          options: ['Motorcycle PMS & Fuel Injection (FI) tuning', 'Car / Auto general mechanical repair', 'Carwash & ceramic detailing', 'Vulcanizing & tire alignment'],
        },
      ],
      operationsTask: {
        title: 'Diagnostic Tools, Hydraulic Equipment & Fast-Moving Parts Canvassing',
        desc: 'Canvass air compressors, hydraulic lifting tables, diagnostic scanners, and wholesale engine oils.',
        category: 'Supplies',
        agency: 'Commercial Automotive Tool Importers & Oil Wholesalers',
        legal_basis: 'RA 9178 BMBE Financial Compliance & Consumer Act',
        estimated_time: '3 - 5 Days',
        estimated_cost: '₱30,000 - ₱80,000',
        required_docs: ['Equipment Warranty Slips', 'Distributor Wholesale Agreement', 'Fast-Moving Parts Inventory'],
        sub_steps: [
          'Canvass heavy-duty air compressor (at least 2HP–3HP), pneumatic impact wrenches, and metric socket/spanner master sets',
          'Procure specialized tools: motorcycle hydraulic lifting table, digital OBD2/FI diagnostic scanner, tire changer, and torque wrenches',
          'Source bulk fast-moving lubricants (4T synthetic/mineral engine oils, gear oils, coolant, chain wax) from authorized distributors',
          'Stock essential replacement wear parts: spark plugs, brake shoes/pads, drive belts, roller weights, and vulcanizing patches',
        ],
      },
      launchTask: {
        title: 'Soft Opening Service Promo, Delivery Rider Special & Grand Launch',
        desc: 'Offer opening discount labor, partner with local TODA terminals, and distribute loyalty oil change cards.',
        category: 'Launch',
        agency: 'Local TODA Terminals & Delivery Rider Groups',
        legal_basis: 'RA 7394 Consumer Act of the Philippines',
        estimated_time: '2 - 3 Days',
        estimated_cost: '₱1,500 - ₱3,500',
        required_docs: ['Labor Rate Card', 'Loyalty Punch Card', 'Job Order Form'],
        sub_steps: [
          'Offer "50% Off Labor or Free Chain Lube with Every Oil Change" opening promo for local tricycle drivers and delivery riders',
          'Distribute service flyers at TODA terminals and motorcycle parking hubs within 3km of your shop',
          'Set up a GCash / Maya QR payment standee for contactless payments and issue numbered official job orders',
          'Offer a loyalty punch card: "5th Oil Change Labor Free" to build a solid recurring customer base',
        ],
      },
      businessExecutionTasks: [
        {
          title: 'Service Bay Layout, Wastewater Oil Trap & Mechanical Space Setup',
          desc: 'Lay out dedicated repair bays with oil-resistant flooring and install an oil-water separator pit.',
          category: 'Planning',
          agency: 'Local Property Owner & City Engineering Department',
          legal_basis: 'PD 1096 National Building Code & Clean Water Act (RA 9275)',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱12,000 - ₱30,000',
          required_docs: ['Commercial Lease Agreement', 'Wastewater Drainage Sketch', 'Zoning Clearance'],
          sub_steps: [
            'Lay out dedicated repair bays with non-slip, oil-resistant epoxy flooring and clear drainage slopes',
            'Construct or install an oil-water separator and grease trap pit to comply with DENR and City Environmental sanitation codes',
            'Install overhead task lighting and multiple grounded 220V power outlets for air compressors, diagnostic scanners, and chargers',
            'Design a sheltered customer waiting area with comfortable seating, view of the repair bay, and service rate display',
          ],
        },
        {
          title: 'Diagnostic Tools, Hydraulic Equipment & Fast-Moving Parts Canvassing',
          desc: 'Canvass air compressors, hydraulic lifting tables, diagnostic scanners, and wholesale engine oils.',
          category: 'Supplies',
          agency: 'Commercial Automotive Tool Importers & Oil Wholesalers',
          legal_basis: 'RA 9178 BMBE Financial Compliance & Consumer Act',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱30,000 - ₱80,000',
          required_docs: ['Equipment Warranty Slips', 'Distributor Wholesale Agreement', 'Fast-Moving Parts Inventory'],
          sub_steps: [
            'Canvass heavy-duty air compressor (at least 2HP–3HP), pneumatic impact wrenches, and metric socket/spanner master sets',
            'Procure specialized tools: motorcycle hydraulic lifting table, digital OBD2/FI diagnostic scanner, tire changer, and torque wrenches',
            'Source bulk fast-moving lubricants (4T synthetic/mineral engine oils, gear oils, coolant, chain wax) from authorized distributors',
            'Stock essential replacement wear parts: spark plugs, brake shoes/pads, drive belts, roller weights, and vulcanizing patches',
          ],
        },
        {
          title: 'Labor Rates, Preventive Maintenance Packages & Parts Margin Markup',
          desc: 'Standardize labor time tables for tune-ups and apply sustainable markups on OEM parts.',
          category: 'Operations',
          agency: 'Self-managed & Financial Costing',
          legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
          estimated_time: '2 Days',
          estimated_cost: 'Operating Budget',
          required_docs: ['Labor Rate Menu', 'PMS Service Package Sheet', 'Parts Markup Calculator'],
          sub_steps: [
            'Establish standard labor time tables for common jobs (oil change, brake cleaning, belt replacement, carburetor/FI cleaning)',
            'Apply 20–35% markup on wholesale replacement parts and lubricants while matching or beating major service centers',
            'Create attractive PMS (Preventive Maintenance Service) packages: Bronze (Oil + Checkup), Silver (Oil + CVT + Brakes), Gold (Full Tune-up)',
            'Post clear, laminated labor rate menu compliant with RA 7394 Consumer Act to avoid fee misunderstandings with vehicle owners',
          ],
        },
        {
          title: 'Vehicle Intake Diagnostic Protocols, Mechanic SOPs & Waste Oil Disposal',
          desc: 'Implement two-part job orders, pre-repair inspections, and contract accredited spent oil haulers.',
          category: 'Operations',
          agency: 'Internal Shop Operations & DENR Hazardous Waste Section',
          legal_basis: 'RA 6969 Toxic Substances & Hazardous Waste Act',
          estimated_time: '2 Days',
          estimated_cost: '₱1,000 - ₱2,500',
          required_docs: ['Vehicle Intake Inspection Form', 'Mechanic Checklist', 'Spent Oil Storage Log'],
          sub_steps: [
            'Implement two-part job order receipt: record vehicle mileage, existing scratches/dents, customer complaint, and owner signature',
            'Require test drive or mechanical inspection check before releasing vehicle back to customer',
            'Contract an accredited hazardous waste hauler for spent engine oil and store used oil in sealed, labeled 200L metal drums',
            'Enforce tool return and bay degreasing checklist at the end of each working day',
          ],
        },
        {
          title: 'Soft Opening Service Promo, Delivery Rider Special & Grand Launch',
          desc: 'Offer opening discount labor, partner with local TODA terminals, and distribute loyalty oil change cards.',
          category: 'Launch',
          agency: 'Local TODA Terminals & Delivery Rider Groups',
          legal_basis: 'RA 7394 Consumer Act of the Philippines',
          estimated_time: '2 - 3 Days',
          estimated_cost: '₱1,500 - ₱3,500',
          required_docs: ['Labor Rate Card', 'Loyalty Punch Card', 'Job Order Form'],
          sub_steps: [
            'Offer "50% Off Labor or Free Chain Lube with Every Oil Change" opening promo for local tricycle drivers and delivery riders',
            'Distribute service flyers at TODA terminals and motorcycle parking hubs within 3km of your shop',
            'Set up a GCash / Maya QR payment standee for contactless payments and issue numbered official job orders',
            'Offer a loyalty punch card: "5th Oil Change Labor Free" to build a solid recurring customer base',
          ],
        },
      ],
    };
  }

  // 3. Printing / Signage / Tarpaulin / Sublimation
  if (
    lower.includes('print') ||
    lower.includes('tarpaulin') ||
    lower.includes('tarp') ||
    lower.includes('sublimat') ||
    lower.includes('jersey') ||
    lower.includes('sticker') ||
    lower.includes('signage') ||
    lower.includes('heat press')
  ) {
    return {
      id: cleanName,
      label: cleanName,
      desc: 'Tarpaulin printing, custom apparel, sublimation & stickers',
      iconName: 'shopping-bag',
      isProductBased: true,
      customerSegments: ['Local Election & Event Organizers', 'SME Business Owners (Banners/Labels)', 'Schools & Student Projects', 'Sports Teams & Jersey Leagues', 'Wedding & Birthday Celebrants'],
      differentiatorPlaceholder: 'e.g. same-day rush printing, custom jersey design, no minimum order, waterproof labels...',
      researchStages: [
        { id: 'not_yet', label: 'Not yet' },
        { id: 'asked', label: 'Asked local businesses about printing needs' },
        { id: 'checked', label: 'Canvassed printer suppliers and ink distributors' },
        { id: 'sold', label: 'Already took small digital layout orders' },
      ],
      risks: [
        { risk: 'Printhead clogging & machine downtime', contingency: 'Run daily printhead nozzle checks and maintain cleaning solvent supplies.' },
        { risk: 'Customer rejecting prints over design errors', contingency: 'Require customer digital or signed mock-up approval before running full print.' },
        { risk: 'Material wastage on misprints', contingency: 'Calibrate color profiles (ICC profiles) and test small sample strips on expensive vinyl/fabrics.' },
        { risk: 'Seasonal demand fluctuations', contingency: 'Diversify into corporate uniforms, school decals, and rush sticker labels during off-peak months.' },
        { risk: 'High ink and media costs', contingency: 'Buy 100-meter vinyl/tarpaulin rolls and liters of eco-solvent/sublimation ink wholesale.' },
      ],
      permits: [...SHARED_PERMITS, 'City BPLO Commercial Signage Permit'],
      extraQuestions: [
        {
          id: 'printing_focus',
          label: 'What will be your main printing equipment?',
          type: 'choice',
          options: ['Large-format eco-solvent tarpaulin printer', 'A3 sublimation printer + combo heat press', 'Digital laser sticker printer & vinyl cutter', 'All of the above'],
        },
      ],
      operationsTask: {
        title: 'Large-Format Printer, Heat Press & Media Canvassing',
        desc: 'Canvass digital printers, combo heat press, and source bulk tarpaulin rolls and blank apparel.',
        category: 'Supplies',
        agency: 'Commercial Digital Printing Equipment Distributors',
        legal_basis: 'RA 9178 BMBE Financial Compliance',
        estimated_time: '3 - 5 Days',
        estimated_cost: '₱40,000 - ₱120,000',
        required_docs: ['Equipment Warranty Contracts', 'Media Distributor Price List', 'Software License Specs'],
        sub_steps: [
          'Canvass digital printers (large format eco-solvent tarpaulin printer or A3 sublimation printer) with local technician support',
          'Procure finishing equipment: 8-in-1 combo heat press (for jerseys, mugs, caps), vinyl plotter cutter, and heavy-duty eyelet grommet machine',
          'Source bulk media rolls: 10oz and 13oz tarpaulin rolls, glossy/matte printable vinyl, cold laminating films, and sublimation paper',
          'Procure bulk apparel blanks: dry-fit polyester t-shirts, sports mesh, cotton canvas tote bags, and blank mugs',
        ],
      },
      launchTask: {
        title: 'Sample Portfolio Showcase, Opening Discount for Schools & Grand Launch',
        desc: 'Produce physical sample boards, offer introductory school/business discounts, and launch store banner.',
        category: 'Launch',
        agency: 'Local Schools, SME Businesses & Event Coordinators',
        legal_basis: 'RA 7394 Consumer Act of the Philippines',
        estimated_time: '2 - 3 Days',
        estimated_cost: '₱1,500 - ₱3,500',
        required_docs: ['Sample Swatch Board', 'Rush Turnaround Price Card', 'Client Approval Slips'],
        sub_steps: [
          'Produce high-quality physical sample boards showing print resolutions, fabric types, sticker finishes, and heat transfers',
          'Offer opening discount (e.g. 15% off first 100 customized t-shirts or free design layout for orders over ₱1,500)',
          'Post vibrant video clips of printing process and finished banners on Facebook Page and local community groups',
          'Place an eye-catching, vibrant tarpaulin banner outside your store displaying your services and rush turnaround rates',
        ],
      },
      businessExecutionTasks: [
        {
          title: 'Print Shop Layout, Ventilation & Stable Power Conditioning',
          desc: 'Allocate dust-free workspace, install Servo AVRs, and establish graphic workstation layout.',
          category: 'Planning',
          agency: 'Local Property Owner & Meralco / Electric Cooperative',
          legal_basis: 'PD 1096 National Building Code & Occupational Safety Standards',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱8,000 - ₱20,000',
          required_docs: ['Commercial Lease Agreement', 'Electrical Load Specification', 'Space Layout Sketch'],
          sub_steps: [
            'Allocate dust-free prep space with large cutting tables for vinyl weeding, grommet punching, and tarpaulin taping',
            'Install heavy-duty Servo Voltage Regulators (AVR) to protect expensive digital printers from voltage spikes and power dips',
            'Ensure adequate exhaust ventilation for eco-solvent ink fumes and dedicated heat press exhaust',
            'Setup computer workstation with licensed vector graphics software (CorelDraw, Illustrator, Photoshop) and RIP software',
          ],
        },
        {
          title: 'Large-Format Printer, Heat Press & Media Canvassing',
          desc: 'Canvass digital printers, combo heat press, and source bulk tarpaulin rolls and blank apparel.',
          category: 'Supplies',
          agency: 'Commercial Digital Printing Equipment Distributors',
          legal_basis: 'RA 9178 BMBE Financial Compliance',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱40,000 - ₱120,000',
          required_docs: ['Equipment Warranty Contracts', 'Media Distributor Price List', 'Software License Specs'],
          sub_steps: [
            'Canvass digital printers (large format eco-solvent tarpaulin printer or A3 sublimation printer) with local technician support',
            'Procure finishing equipment: 8-in-1 combo heat press (for jerseys, mugs, caps), vinyl plotter cutter, and heavy-duty eyelet grommet machine',
            'Source bulk media rolls: 10oz and 13oz tarpaulin rolls, glossy/matte printable vinyl, cold laminating films, and sublimation paper',
            'Procure bulk apparel blanks: dry-fit polyester t-shirts, sports mesh, cotton canvas tote bags, and blank mugs',
          ],
        },
        {
          title: 'Square-Foot Tarpaulin Pricing & Jersey Customization Costing',
          desc: 'Calculate exact cost per square foot for tarpaulin and price custom jerseys with healthy margins.',
          category: 'Operations',
          agency: 'Self-managed & Financial Costing',
          legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
          estimated_time: '2 Days',
          estimated_cost: 'Operating Budget',
          required_docs: ['Square-Foot Costing Sheet', 'Published Tarpaulin Rate Board', 'Rush Order Fee Policy'],
          sub_steps: [
            'Calculate exact cost per square foot for tarpaulin: media cost + ink consumption + grommets + electricity amortized',
            'Formulate competitive square-foot pricing: standard 10oz (₱12–₱18/sq ft) and heavy-duty 13oz (₱18–₱25/sq ft)',
            'Calculate sublimation jersey costs: blank dry-fit jersey + paper/ink + heat press labor and price with 50–70% gross margin',
            'Establish rush order surcharges (25–40% premium for 3-hour same-day turnaround)',
          ],
        },
        {
          title: 'Digital Layout Proofing SOPs, Color Matching & Finishing Protocols',
          desc: 'Enforce client digital approval sign-offs, daily printhead cleaning, and reinforced edge taping.',
          category: 'Operations',
          agency: 'Internal Shop Operations & Quality Control',
          legal_basis: 'RA 7394 Consumer Act (Fair Trade & Advertising)',
          estimated_time: '2 Days',
          estimated_cost: '₱500 - ₱1,500',
          required_docs: ['Digital Artwork Sign-Off Slip', 'Daily Nozzle Check Sheet', 'Packaging Checklist'],
          sub_steps: [
            'Implement mandatory client sign-off protocol: customer must review and approve PDF proof or physical sample before mass printing',
            'Perform daily nozzle check and printhead head-cleaning cycle every morning before starting production jobs',
            'Train staff on proper grommet reinforcement (folding hem edges with double-sided banner tape to prevent tearing)',
            'Package finished prints neatly rolled in protective craft paper or plastic sleeves to prevent scratches during transport',
          ],
        },
        {
          title: 'Sample Portfolio Showcase, Opening Discount for Schools & Grand Launch',
          desc: 'Produce physical sample boards, offer introductory school/business discounts, and launch store banner.',
          category: 'Launch',
          agency: 'Local Schools, SME Businesses & Event Coordinators',
          legal_basis: 'RA 7394 Consumer Act of the Philippines',
          estimated_time: '2 - 3 Days',
          estimated_cost: '₱1,500 - ₱3,500',
          required_docs: ['Sample Swatch Board', 'Rush Turnaround Price Card', 'Client Approval Slips'],
          sub_steps: [
            'Produce high-quality physical sample boards showing print resolutions, fabric types, sticker finishes, and heat transfers',
            'Offer opening discount (e.g. 15% off first 100 customized t-shirts or free design layout for orders over ₱1,500)',
            'Post vibrant video clips of printing process and finished banners on Facebook Page and local community groups',
            'Place an eye-catching, vibrant tarpaulin banner outside your store displaying your services and rush turnaround rates',
          ],
        },
      ],
    };
  }

  // 4. Barbershop / Hair Salon / Nail Care / Spa / Massage
  if (
    lower.includes('barber') ||
    lower.includes('salon') ||
    lower.includes('gupit') ||
    lower.includes('parlor') ||
    lower.includes('spa') ||
    lower.includes('massage') ||
    lower.includes('nail') ||
    lower.includes('eyelash') ||
    lower.includes('skincare')
  ) {
    return {
      id: cleanName,
      label: cleanName,
      desc: 'Hair styling, personal grooming, nail care & wellness services',
      iconName: 'wrench',
      isProductBased: false,
      customerSegments: ['Men & Students (Fade / Clean Cuts)', 'Women (Rebond / Color / Styling)', 'Bridal & Prom Groups', 'Senior Citizens & Kids', 'Working Professionals needing quick grooming'],
      differentiatorPlaceholder: 'e.g. air-conditioned comfort, modern fades & hair art, free hot towel & pomade, sanitized tools...',
      researchStages: [
        { id: 'not_yet', label: 'Not yet' },
        { id: 'asked', label: 'Asked neighborhood residents about salon rates' },
        { id: 'checked', label: 'Checked nearby salons and barbershops' },
        { id: 'sold', label: 'Already serviced family & friends' },
      ],
      risks: [
        { risk: 'Customer scalp irritation / allergic reactions', contingency: 'Conduct patch tests before chemical treatments (bleach, hair color, rebond).' },
        { risk: 'Disgruntled walk-ins during peak weekend rushes', contingency: 'Implement digital queue system or appointment booking via Messenger.' },
        { risk: 'High barber/stylist turnover', contingency: 'Establish fair commission-sharing model (60/40 or 50/50 with daily tips) and professional working environment.' },
        { risk: 'Sanitary inspection compliance', contingency: 'Enforce UV sterilizers and medical-grade barbicide disinfectant jars at every station.' },
        { risk: 'Utility cost spikes (A/C & hair dryers)', contingency: 'Install inverter air-conditioners and energy-efficient LED vanity ring lights.' },
      ],
      permits: [...SHARED_PERMITS, 'City Health Sanitary Clearance', 'Barber / Cosmetologist Health Cards'],
      extraQuestions: [
        {
          id: 'salon_type',
          label: 'What is the primary setup of your shop?',
          type: 'choice',
          options: ['Modern Barbershop (men / kids / fades)', 'Full Hair & Beauty Salon (men & women)', 'Nail Spa & Eyelash Lounge'],
        },
      ],
      operationsTask: {
        title: 'Hydraulic Chairs, Professional Cutters & Salon Chemicals Canvassing',
        desc: 'Canvass hydraulic barber chairs, professional clippers/shears, and bulk salon chemicals.',
        category: 'Supplies',
        agency: 'Professional Salon & Barbershop Equipment Wholesalers',
        legal_basis: 'PD 856 Sanitation Code & Occupational Safety Standards',
        estimated_time: '3 - 5 Days',
        estimated_cost: '₱20,000 - ₱60,000',
        required_docs: ['Equipment Warranty Invoices', 'Cosmetics Batch Safety Sheets', 'Sanitization Kit Checklist'],
        sub_steps: [
          'Canvass heavy-duty hydraulic barber/styling chairs, stainless steel tool rolling carts, and ergonomic shampoo beds',
          'Source professional clippers, trimmers, foil shavers, thinning shears, and Japanese steel cutting scissors',
          'Procure salon chemicals and hair care supplies: developer peroxide, ammonia-free hair dyes, rebonding sets, and shampoos in 5L jugs',
          'Equip every station with glass barbicide jars, UV sterilizer box, neck strips, clean capes, and fresh face razors',
        ],
      },
      launchTask: {
        title: 'Grand Opening Free Styling, Loyalty Cards & Social Media Launch',
        desc: 'Offer opening styling perks, launch a "6th Haircut Free" punch card, and capture client transformations.',
        category: 'Launch',
        agency: 'Local Neighborhood & Social Media Channels',
        legal_basis: 'RA 7394 Consumer Act of the Philippines',
        estimated_time: '2 - 3 Days',
        estimated_cost: '₱1,000 - ₱2,500',
        required_docs: ['Service Menu Board', 'Loyalty Cards', 'Before/After Portfolio'],
        sub_steps: [
          'Offer opening day special: "First 30 Customers Get Free Hot Towel & Pomade Styling" or "Bring a Friend 20% Off"',
          'Distribute loyalty punch cards: "6th Haircut is Free" to turn first-time walk-ins into repeat regular clients',
          'Capture aesthetic before-and-after client transformation photos (with permission) for your Facebook and Instagram feed',
          'Setup GCash and Maya QR code payments on reception desk for quick cashless settling of bills and tips',
        ],
      },
      businessExecutionTasks: [
        {
          title: 'Salon/Barbershop Commercial Space, Lighting & Plumbing Setup',
          desc: 'Design workstation layout, install shampoo wash basins, and configure shadow-free lighting.',
          category: 'Planning',
          agency: 'Local Property Owner & City Building Official',
          legal_basis: 'PD 1096 National Building Code & PD 856 Sanitation Code',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱10,000 - ₱25,000',
          required_docs: ['Commercial Lease Agreement', 'Plumbing & Drainage Plan', 'Lighting Layout'],
          sub_steps: [
            'Design workstation layout with minimum 4 to 5 feet between chairs for barber elbow room and client comfort',
            'Install dedicated shampoo wash basins with reliable hot-and-cold water pressure and hair trap floor drains',
            'Mount bright, shadow-free 4000K–5000K daylight vanity mirrors and ring lights at each station',
            'Install split-type inverter air-conditioning and sound system for a relaxed, premium customer ambiance',
          ],
        },
        {
          title: 'Hydraulic Chairs, Professional Cutters & Salon Chemicals Canvassing',
          desc: 'Canvass hydraulic barber chairs, professional clippers/shears, and bulk salon chemicals.',
          category: 'Supplies',
          agency: 'Professional Salon & Barbershop Equipment Wholesalers',
          legal_basis: 'PD 856 Sanitation Code & Occupational Safety Standards',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱20,000 - ₱60,000',
          required_docs: ['Equipment Warranty Invoices', 'Cosmetics Batch Safety Sheets', 'Sanitization Kit Checklist'],
          sub_steps: [
            'Canvass heavy-duty hydraulic barber/styling chairs, stainless steel tool rolling carts, and ergonomic shampoo beds',
            'Source professional clippers, trimmers, foil shavers, thinning shears, and Japanese steel cutting scissors',
            'Procure salon chemicals and hair care supplies: developer peroxide, ammonia-free hair dyes, rebonding sets, and shampoos in 5L jugs',
            'Equip every station with glass barbicide jars, UV sterilizer box, neck strips, clean capes, and fresh face razors',
          ],
        },
        {
          title: 'Tiered Service Menu, Chemical Treatment Pricing & Barber Commission Structure',
          desc: 'Compute consumable costs per treatment and set tiered pricing with fair barber commission splits.',
          category: 'Operations',
          agency: 'Self-managed & Financial Costing',
          legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
          estimated_time: '2 Days',
          estimated_cost: 'Operating Budget',
          required_docs: ['Service Rate Menu', 'Chemical Treatment Cost Sheet', 'Commission Agreement'],
          sub_steps: [
            'Compute consumable cost per treatment: bleach/color grams + shampoo + foil + electricity and hair blower usage',
            'Benchmark local salon rates and set tiered pricing: Basic Cut (₱100–₱250), Haircut + Beard/Towel (₱250–₱450), Rebond/Color (₱1,200–₱3,500)',
            'Define clear commission and tip policy: e.g. 50% commission on labor + 100% customer tips + retail product sales incentive',
            'Print and frame an attractive, glossy service menu with photos of trending hairstyles and treatments',
          ],
        },
        {
          title: 'Sanitation Standards, Station Reset SOPs & Booking Channels',
          desc: 'Enforce 5-minute station turnaround sanitation, client consultation SOPs, and WhatsApp booking.',
          category: 'Operations',
          agency: 'Internal Operations & City Health Office',
          legal_basis: 'PD 856 Sanitation Code of the Philippines',
          estimated_time: '2 Days',
          estimated_cost: '₱500 - ₱1,500',
          required_docs: ['Daily Sanitation Checklist', 'Client Intake / Patch Test Log', 'Appointment Sheet'],
          sub_steps: [
            'Enforce mandatory 5-minute station turnaround: disinfect clippers with coolant spray, change blade, wipe chair, sweep hair',
            'Set up a Messenger/Instagram booking page allowing clients to reserve preferred time slots and choose specific stylists',
            'Implement customer consultation SOP: discuss desired cut, hair condition, and quote final price before scissors touch hair',
            'Maintain clean laundry protocol: wash all towels and capes with disinfectant detergent daily',
          ],
        },
        {
          title: 'Grand Opening Free Styling, Loyalty Cards & Social Media Launch',
          desc: 'Offer opening styling perks, launch a "6th Haircut Free" punch card, and capture client transformations.',
          category: 'Launch',
          agency: 'Local Neighborhood & Social Media Channels',
          legal_basis: 'RA 7394 Consumer Act of the Philippines',
          estimated_time: '2 - 3 Days',
          estimated_cost: '₱1,000 - ₱2,500',
          required_docs: ['Service Menu Board', 'Loyalty Cards', 'Before/After Portfolio'],
          sub_steps: [
            'Offer opening day special: "First 30 Customers Get Free Hot Towel & Pomade Styling" or "Bring a Friend 20% Off"',
            'Distribute loyalty punch cards: "6th Haircut is Free" to turn first-time walk-ins into repeat regular clients',
            'Capture aesthetic before-and-after client transformation photos (with permission) for your Facebook and Instagram feed',
            'Setup GCash and Maya QR code payments on reception desk for quick cashless settling of bills and tips',
          ],
        },
      ],
    };
  }

  // 5. Poultry / Piggery / Livestock / Agriculture / Farming / Fishery
  if (
    lower.includes('poultry') ||
    lower.includes('piggery') ||
    lower.includes('baboy') ||
    lower.includes('manok') ||
    lower.includes('chick') ||
    lower.includes('livestock') ||
    lower.includes('farm') ||
    lower.includes('egg') ||
    lower.includes('itlog') ||
    lower.includes('agri') ||
    lower.includes('fishery') ||
    lower.includes('isda') ||
    lower.includes('aquaculture') ||
    lower.includes('tilapia')
  ) {
    return {
      id: cleanName,
      label: cleanName,
      desc: 'Poultry, livestock farming, egg wholesale & agricultural production',
      iconName: 'store',
      isProductBased: true,
      customerSegments: ['Local Wet Market (Palengke) Meat Vendors', 'Neighborhood Karinderyas & Restaurants', 'Egg Retailers & Sari-Sari Stores', 'Walk-in Livestock Buyers', 'Wholesale Provincial Traders'],
      differentiatorPlaceholder: 'e.g. farm-fresh eggs daily, hormone-free broiler, vaccinated stock, free delivery for bulk crates...',
      researchStages: [
        { id: 'not_yet', label: 'Not yet' },
        { id: 'asked', label: 'Inquired with palengke butchers & egg dealers' },
        { id: 'checked', label: 'Canvassed feed suppliers and chick hatcheries' },
        { id: 'sold', label: 'Already raised small test batch' },
      ],
      risks: [
        { risk: 'Disease outbreaks (ASF, Bird Flu)', contingency: 'Enforce strict bio-security footbaths, vehicle wheel sprays, and quarantine protocols.' },
        { risk: 'High commercial feed costs', contingency: 'Monitor Feed Conversion Ratio (FCR) strictly and supplement with approved alternative farm grains.' },
        { risk: 'Heat stress mortality during dry season', contingency: 'Install misting fans, adequate roof height, and fresh continuous drinking water nipples.' },
        { risk: 'Price drops during market oversupply', contingency: 'Stagger brooding/farrowing cycles into bi-weekly batches to maintain steady year-round income.' },
        { risk: 'Municipal zoning and environmental odors', contingency: 'Position pens away from residential clusters and implement EM (Effective Microorganism) bedding.' },
      ],
      permits: [...SHARED_PERMITS, 'DA - Bureau of Animal Industry (BAI) Registration', 'Municipal Agricultural Office Clearance'],
      extraQuestions: [
        {
          id: 'farm_type',
          label: 'What is the focus of your farming operations?',
          type: 'choice',
          options: ['Broiler chicken meat production', 'Layer chickens (table eggs production)', 'Piggery / hog fattening or breeding', 'Fishery / tilapia pond'],
        },
      ],
      operationsTask: {
        title: 'Stock Sourcing (Chicks/Piglets), Commercial Feeds & Vaccines',
        desc: 'Source certified day-old chicks or vaccinated piglets and negotiate bulk feed delivery terms.',
        category: 'Supplies',
        agency: 'DA-Accredited Breeders, Hatcheries & Commercial Feed Dealers',
        legal_basis: 'RA 8485 Animal Welfare Act & DA Regulations',
        estimated_time: '5 - 10 Days',
        estimated_cost: '₱25,000 - ₱70,000 (initial stock & feed)',
        required_docs: ['Veterinary Health Certificate', 'Feed Distributor Agreement', 'Vaccination Schedule'],
        sub_steps: [
          'Canvass reputable breeders or hatcheries for certified healthy Day-Old Chicks (DOC) or 45-day vaccinated piglets',
          'Partner with accredited feed suppliers (B-Meg, San Miguel, Universal Robina, or local coops) for bulk bag volume discounts',
          'Procure essential farm veterinary kit: vitamins, electrolytes for brooding stress, antibiotics, and syringes/needles',
          'Source plastic egg crates (for layers) or brooding infrared heat bulbs and tarpaulin curtains (for poultry)',
        ],
      },
      launchTask: {
        title: 'Offtake Contracts with Palengke Wholesalers & Neighborhood Egg Drops',
        desc: 'Secure offtake commitments with wet market meat stalls and distribute fresh egg supplies.',
        category: 'Launch',
        agency: 'Local Wet Market Meat Vendors & Sari-Sari Store Network',
        legal_basis: 'RA 7394 Consumer Act & DA Meat Inspection Code',
        estimated_time: '3 - 5 Days',
        estimated_cost: '₱1,000 - ₱2,500',
        required_docs: ['Wholesale Delivery Receipt', 'BAI Registration Copy', 'Price per Crate Card'],
        sub_steps: [
          'Secure offtake commitments with at least 3 local wet market meat butchers or egg vendor stalls before harvest week',
          'Distribute farm-fresh egg supply flyers to neighboring sari-sari stores and bakeries offering free weekly delivery',
          'Display Department of Agriculture / Bureau of Animal Industry (BAI) registration credentials to confirm disease-free status',
          'Offer introductory cash-on-delivery (COD) or consignment terms for high-volume trusted neighborhood canteens',
        ],
      },
      businessExecutionTasks: [
        {
          title: 'Farm Siting, Biosecurity Perimeter & Housing Construction',
          desc: 'Verify municipal agricultural buffer zones, build elevated pens, and setup disinfectant gate baths.',
          category: 'Planning',
          agency: 'Municipal Agricultural Office & City Health Office',
          legal_basis: 'PD 1096 National Building Code & DA Administrative Orders',
          estimated_time: '7 - 14 Days',
          estimated_cost: '₱15,000 - ₱45,000',
          required_docs: ['Agricultural Lease / Title', 'Municipal Zoning Permit', 'Biosecurity Plan'],
          sub_steps: [
            'Verify municipal zoning and agricultural clearance to ensure farm location complies with LGU buffer zones from residences',
            'Construct elevated, well-ventilated housing pens with bamboo slats or wire flooring and high-pitched roof for heat dissipation',
            'Setup biosecurity gate: construct disinfectant wheel bath for delivery trucks and footbaths with potassium permanganate or bleach',
            'Install automatic nipple drinkers and gravity-fed water tanks ensuring 24/7 clean, treated drinking water access',
          ],
        },
        {
          title: 'Stock Sourcing (Chicks/Piglets), Commercial Feeds & Vaccines',
          desc: 'Source certified day-old chicks or vaccinated piglets and negotiate bulk feed delivery terms.',
          category: 'Supplies',
          agency: 'DA-Accredited Breeders, Hatcheries & Commercial Feed Dealers',
          legal_basis: 'RA 8485 Animal Welfare Act & DA Regulations',
          estimated_time: '5 - 10 Days',
          estimated_cost: '₱25,000 - ₱70,000 (initial stock & feed)',
          required_docs: ['Veterinary Health Certificate', 'Feed Distributor Agreement', 'Vaccination Schedule'],
          sub_steps: [
            'Canvass reputable breeders or hatcheries for certified healthy Day-Old Chicks (DOC) or 45-day vaccinated piglets',
            'Partner with accredited feed suppliers (B-Meg, San Miguel, Universal Robina, or local coops) for bulk bag volume discounts',
            'Procure essential farm veterinary kit: vitamins, electrolytes for brooding stress, antibiotics, and syringes/needles',
            'Source plastic egg crates (for layers) or brooding infrared heat bulbs and tarpaulin curtains (for poultry)',
          ],
        },
        {
          title: 'Feed Conversion Ratio (FCR), Liveweight Costing & Egg Tray Pricing',
          desc: 'Track daily feed intake to compute FCR and calculate liveweight margins vs farmgate prices.',
          category: 'Operations',
          agency: 'Self-managed & Financial Costing',
          legal_basis: 'RA 9178 BMBE Financial Compliance & DA Price Monitoring',
          estimated_time: '2 Days',
          estimated_cost: 'Operating Budget',
          required_docs: ['Daily Feed Consumption Log', 'FCR Calculation Worksheet', 'Harvest Costing Sheet'],
          sub_steps: [
            'Track feed consumption daily to compute Feed Conversion Ratio (target 1.5–1.7 kg feed per 1 kg liveweight broiler)',
            'Calculate total cost per head: day-old chick/piglet cost + total feed consumed + vaccines + electricity/water + mortality buffer',
            'Benchmark prevailing farmgate prices at your provincial livestock trading post before committing harvest batches',
            'For egg production: grade eggs into Small, Medium, Large, and Extra-Large and price per 30-egg tray with 20–30% gross margin',
          ],
        },
        {
          title: 'Daily Feeding Schedule, Mortality Logs & Biosecurity Protocols',
          desc: 'Enforce morning/afternoon feeding, maintain mortality logbooks, and spray microbial odor neutralizers.',
          category: 'Operations',
          agency: 'Internal Farm Management & Bureau of Animal Industry',
          legal_basis: 'RA 8485 Animal Welfare Act & Code of Good Animal Husbandry Practices (GAHP)',
          estimated_time: 'Ongoing (Daily Protocol)',
          estimated_cost: '₱1,000 - ₱2,500',
          required_docs: ['Daily Mortality Log', 'Vaccination Card', 'Visitor Disinfection Log'],
          sub_steps: [
            'Enforce strict feeding schedules twice daily (early morning and late afternoon) to maximize nutrient absorption',
            'Maintain a daily mortality and health logbook; immediately isolate any lethargic or coughing animals in a quarantine pen',
            'Spray pens with Effective Microorganisms (EM) or probiotic bedding solutions to neutralize ammonia odor and control flies',
            'Implement strict visitor restrictions: no outside traders allowed inside animal pens without disinfection suits and boots',
          ],
        },
        {
          title: 'Offtake Contracts with Palengke Wholesalers & Neighborhood Egg Drops',
          desc: 'Secure offtake commitments with wet market meat stalls and distribute fresh egg supplies.',
          category: 'Launch',
          agency: 'Local Wet Market Meat Vendors & Sari-Sari Store Network',
          legal_basis: 'RA 7394 Consumer Act & DA Meat Inspection Code',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱1,000 - ₱2,500',
          required_docs: ['Wholesale Delivery Receipt', 'BAI Registration Copy', 'Price per Crate Card'],
          sub_steps: [
            'Secure offtake commitments with at least 3 local wet market meat butchers or egg vendor stalls before harvest week',
            'Distribute farm-fresh egg supply flyers to neighboring sari-sari stores and bakeries offering free weekly delivery',
            'Display Department of Agriculture / Bureau of Animal Industry (BAI) registration credentials to confirm disease-free status',
            'Offer introductory cash-on-delivery (COD) or consignment terms for high-volume trusted neighborhood canteens',
          ],
        },
      ],
    };
  }

  // 6. Gym / Fitness Center / Crossfit / Boxing Studio
  if (
    lower.includes('gym') ||
    lower.includes('fitness') ||
    lower.includes('crossfit') ||
    lower.includes('workout') ||
    lower.includes('boxing') ||
    lower.includes('martial art') ||
    lower.includes('yoga') ||
    lower.includes('pilates')
  ) {
    return {
      id: cleanName,
      label: cleanName,
      desc: 'Gym equipment access, group fitness, strength training & coaching',
      iconName: 'wrench',
      isProductBased: false,
      customerSegments: ['Working Adults seeking weight loss', 'Students & Young Athletes', 'Bodybuilding & Strength Lifters', 'Women Fitness & Group Class Walk-ins', 'Senior Wellness Members'],
      differentiatorPlaceholder: 'e.g. 24/7 access, certified personal trainers, brand new plate-loaded machines, clean shower rooms...',
      researchStages: [
        { id: 'not_yet', label: 'Not yet' },
        { id: 'asked', label: 'Polled local residents about membership rates' },
        { id: 'checked', label: 'Visited competitors and checked equipment lines' },
        { id: 'sold', label: 'Already have committed founding members' },
      ],
      risks: [
        { risk: 'Member churn after initial surge', contingency: 'Run quarterly fitness challenges and introduce buddy referral perks.' },
        { risk: 'Equipment breakdown & cable fraying', contingency: 'Conduct weekly cable and pulley inspections and grease guide rods regularly.' },
        { risk: 'Member injuries & liability claims', contingency: 'Require every member to sign a Physical Readiness Questionnaire (PAR-Q) and liability waiver.' },
        { risk: 'High air-conditioning utility bills', contingency: 'Optimize ventilation with high-volume industrial ceiling fans (HVLS) and zoned inverter A/Cs.' },
        { risk: 'Slow daytime off-peak hours', contingency: 'Introduce discounted student and off-peak morning membership tiers (9:00 AM – 3:00 PM).' },
      ],
      permits: [...SHARED_PERMITS, 'City BPLO Commercial Fitness License', 'BFP Fire Safety Permit'],
      extraQuestions: [
        {
          id: 'gym_format',
          label: 'What will be your primary gym concept?',
          type: 'choice',
          options: ['Commercial weights & cardio gym', 'Functional fitness / Crossfit / Boxing box', 'Boutique yoga / pilates studio'],
        },
      ],
      operationsTask: {
        title: 'Commercial Gym Equipment Canvassing & Free Weights Procurement',
        desc: 'Canvass plate-loaded machines, Olympic barbells, dumbbell sets, and commercial cardio units.',
        category: 'Supplies',
        agency: 'Commercial Fitness Equipment Importers & Distributors',
        legal_basis: 'RA 9178 BMBE Financial Compliance & Consumer Act',
        estimated_time: '7 - 14 Days',
        estimated_cost: '₱60,000 - ₱200,000',
        required_docs: ['Equipment Purchase Invoices & Warranties', 'Maintenance Manuals', 'Smallwares Inventory'],
        sub_steps: [
          'Canvass commercial plate-loaded machines (Squat racks, Smith machine, Cable crossover, Leg press, Flat/Incline benches)',
          'Procure rubber-coated Olympic weight plates (at least 500kg–1000kg total), Olympic barbells, and dumbbell pairs (5 lbs to 75 lbs)',
          'Procure commercial cardio machines (treadmills, assault bikes, rowing machines) with local parts and warranty availability',
          'Stock gym hygiene and safety essentials: spray bottles with disinfectant, microfiber towels, first-aid kit, and chalk bowls',
        ],
      },
      launchTask: {
        title: 'Grand Opening Free Workout Weekend, Founder Memberships & Social Launch',
        desc: 'Host a free open gym weekend, sell discounted founding memberships, and launch selfie photo wall.',
        category: 'Launch',
        agency: 'Local Fitness Community & Social Media Channels',
        legal_basis: 'RA 7394 Consumer Act of the Philippines',
        estimated_time: '2 - 3 Days',
        estimated_cost: '₱2,000 - ₱5,000',
        required_docs: ['Membership Rate Card', 'PAR-Q Waiver Forms', 'Founder Membership Vouchers'],
        sub_steps: [
          'Host a "Free Open Gym Weekend" inviting the local community to try the machines, meet the trainers, and take fitness assessments',
          'Sell discounted "Founding Member" annual passes to the first 50 sign-ups to generate upfront working capital',
          'Partner with local nutrition stores or sports shops for cross-promotional flyers and goodie bag vouchers',
          'Setup a photo-ready selfie wall with neon gym branding and ring light to encourage member Instagram/TikTok gym tag posts',
        ],
      },
      businessExecutionTasks: [
        {
          title: 'Gym Floor Layout, Heavy Rubber Flooring & High-Traffic Ventilation',
          desc: 'Install shock-absorbing rubber gym tiles, arrange equipment zones, and configure ventilation.',
          category: 'Planning',
          agency: 'Local Property Owner & City Building Official',
          legal_basis: 'PD 1096 National Building Code & Fire Code (RA 9514)',
          estimated_time: '5 - 10 Days',
          estimated_cost: '₱15,000 - ₱40,000',
          required_docs: ['Commercial Lease Agreement', 'Gym Floor Zoning Plan', 'Structural Floor Load Verification'],
          sub_steps: [
            'Install heavy-duty 15mm–20mm interlocking rubber gym tiles over concrete slab to absorb dropped barbell impacts and minimize noise',
            'Design clear zoned layout: Free Weights Area, Machine Resistance Bay, Cardio Deck, and Open Functional/Stretching Zone',
            'Install large wall-to-wall vanity mirrors for member form checks and commercial exhaust fans for high-volume air exchange',
            'Construct clean male and female locker changing areas, shower stalls, and secure key-locked member lockers',
          ],
        },
        {
          title: 'Commercial Gym Equipment Canvassing & Free Weights Procurement',
          desc: 'Canvass plate-loaded machines, Olympic barbells, dumbbell sets, and commercial cardio units.',
          category: 'Supplies',
          agency: 'Commercial Fitness Equipment Importers & Distributors',
          legal_basis: 'RA 9178 BMBE Financial Compliance & Consumer Act',
          estimated_time: '7 - 14 Days',
          estimated_cost: '₱60,000 - ₱200,000',
          required_docs: ['Equipment Purchase Invoices & Warranties', 'Maintenance Manuals', 'Smallwares Inventory'],
          sub_steps: [
            'Canvass commercial plate-loaded machines (Squat racks, Smith machine, Cable crossover, Leg press, Flat/Incline benches)',
            'Procure rubber-coated Olympic weight plates (at least 500kg–1000kg total), Olympic barbells, and dumbbell pairs (5 lbs to 75 lbs)',
            'Procure commercial cardio machines (treadmills, assault bikes, rowing machines) with local parts and warranty availability',
            'Stock gym hygiene and safety essentials: spray bottles with disinfectant, microfiber towels, first-aid kit, and chalk bowls',
          ],
        },
        {
          title: 'Membership Tiers, Walk-In Day Passes & Personal Training Rates',
          desc: 'Formulate monthly membership packages, off-peak student rates, and trainer commission splits.',
          category: 'Operations',
          agency: 'Self-managed & Financial Costing',
          legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
          estimated_time: '2 Days',
          estimated_cost: 'Operating Budget',
          required_docs: ['Membership Rate Card', 'Trainer Commission Agreement', 'Supplement Bar Price Sheet'],
          sub_steps: [
            'Formulate flexible membership plans: Day Pass (₱80–₱150), Monthly Unlimited (₱800–₱1,800), and Annual VIP memberships',
            'Create off-peak student rates (₱500–₱700/mo) to monetize empty gym hours between 9:00 AM and 3:00 PM',
            'Establish Personal Training (PT) packages: 10 sessions (₱3,500–₱6,000) with a 60/40 trainer-to-gym commission split',
            'Create a high-margin reception supplement bar: bottled water, cold protein shakes, electrolyte drinks, and energy bars',
          ],
        },
        {
          title: 'Member Check-In SOPs, Liability Waivers & Daily Equipment Disinfection',
          desc: 'Enforce PAR-Q waivers, digital attendance check-ins, and twice-daily machine sanitation.',
          category: 'Operations',
          agency: 'Internal Gym Management & City Health Office',
          legal_basis: 'PD 856 Sanitation Code & Civil Code (Torts and Damages)',
          estimated_time: '2 Days',
          estimated_cost: '₱1,000 - ₱2,000',
          required_docs: ['PAR-Q Medical Disclosure Form', 'Member Check-In Roster', 'Daily Disinfection Checklist'],
          sub_steps: [
            'Require all new members to complete a PAR-Q medical disclosure and sign a formal liability waiver upon registration',
            'Setup RFID keycard, QR code, or digital member check-in log at front desk to monitor active floor capacity',
            'Enforce gym etiquette: require members to bring their own sweat towel, wipe down benches after use, and re-rack all weights',
            'Implement twice-daily deep cleaning SOP: sanitize dumbbell handles, vinyl bench pads, and mop rubber flooring with disinfectant',
          ],
        },
        {
          title: 'Grand Opening Free Workout Weekend, Founder Memberships & Social Launch',
          desc: 'Host a free open gym weekend, sell discounted founding memberships, and launch selfie photo wall.',
          category: 'Launch',
          agency: 'Local Fitness Community & Social Media Channels',
          legal_basis: 'RA 7394 Consumer Act of the Philippines',
          estimated_time: '2 - 3 Days',
          estimated_cost: '₱2,000 - ₱5,000',
          required_docs: ['Membership Rate Card', 'PAR-Q Waiver Forms', 'Founder Membership Vouchers'],
          sub_steps: [
            'Host a "Free Open Gym Weekend" inviting the local community to try the machines, meet the trainers, and take fitness assessments',
            'Sell discounted "Founding Member" annual passes to the first 50 sign-ups to generate upfront working capital',
            'Partner with local nutrition stores or sports shops for cross-promotional flyers and goodie bag vouchers',
            'Setup a photo-ready selfie wall with neon gym branding and ring light to encourage member Instagram/TikTok gym tag posts',
          ],
        },
      ],
    };
  }

  // 7. Hardware Store / Construction Supply / Electrical
  if (
    lower.includes('hardware') ||
    lower.includes('construction') ||
    lower.includes('cement') ||
    lower.includes('steel') ||
    lower.includes('electrical') ||
    lower.includes('plumbing supply') ||
    lower.includes('tools')
  ) {
    return {
      id: cleanName,
      label: cleanName,
      desc: 'Construction supplies, cement, steel, fasteners & power tools',
      iconName: 'wrench',
      isProductBased: true,
      customerSegments: ['Local Homeowners & DIY Handymen', 'Barangay Construction Contractors', 'Carpenters, Plumbers & Electricians', 'Landlords & Rental Property Owners', 'LGU & Barangay Infrastructure Projects'],
      differentiatorPlaceholder: 'e.g. free delivery for 10+ cement bags, cut-to-order lumber, stock hard-to-find electrical fittings...',
      researchStages: [
        { id: 'not_yet', label: 'Not yet' },
        { id: 'asked', label: 'Polled local foremen and contractors' },
        { id: 'checked', label: 'Canvassed cement and rebar wholesale distributors' },
        { id: 'sold', label: 'Already supplied small DIY repairs' },
      ],
      risks: [
        { risk: 'Bulky inventory tying up working capital', contingency: 'Focus on high-turnover staple items (cement, rebar, PVC pipes, GI wires) before slow specialty tools.' },
        { risk: 'Weight-based delivery logistics costs', contingency: 'Invest in a reliable secondhand multi-cab or partner with local delivery tricycle haulers.' },
        { risk: 'Rust and moisture damage to steel & cement', contingency: 'Store cement bags elevated on wooden pallets and keep steel bars sheltered under dry tarpaulins.' },
        { risk: 'Price fluctuation of steel and fuel', contingency: 'Pass major steel price adjustments through immediately with weekly updated price sheets.' },
        { risk: 'Bad debts from credit contractor accounts', contingency: 'Strictly limit initial sales to cash or GCash; require 50% deposit before delivering large project orders.' },
      ],
      permits: [...SHARED_PERMITS, 'City BPLO Commercial Hardware Permit', 'BFP Fire Safety Clearance (Paints/Solvents)'],
      extraQuestions: [
        {
          id: 'hardware_inventory',
          label: 'What will be your primary hardware inventory focus?',
          type: 'choice',
          options: ['Heavy aggregates & structural (cement, steel, sand, gravel)', 'Plumbing, electrical & wiring supplies', 'Paints, sealants & finishing hardware', 'General mixed community hardware store'],
        },
      ],
      operationsTask: {
        title: 'Direct Cement, Steel & Electrical Wholesale Distributor Sourcing',
        desc: 'Establish distributor accounts for cement, deformed rebar, PVC pipes, and electrical supplies.',
        category: 'Supplies',
        agency: 'Direct Cement Manufacturers, Steel Mills & Electrical Wholesalers',
        legal_basis: 'RA 9178 BMBE Financial Compliance & Consumer Act',
        estimated_time: '5 - 10 Days',
        estimated_cost: '₱50,000 - ₱150,000',
        required_docs: ['Distributor Credit Applications', 'PNS Quality Product Certifications', 'Initial Stock Ledger'],
        sub_steps: [
          'Establish direct distributor accounts with major cement manufacturers (Eagle, Holcim, Republic) and steel mills for wholesale rates',
          'Canvass plumbing and electrical wholesalers: Neltex/Atlanta PVC pipes, Phelps Dodge wires, breaker boxes, and LED fixtures',
          'Stock essential fasteners in bulk bins: common nails (CWN), concrete nails, drywall screws, tox, and blind rivets',
          'Procure hardware measuring tools: digital platform scales, metric tape measures, and heavy-duty rebar manual cutters',
        ],
      },
      launchTask: {
        title: 'Contractor Meet-and-Greet, Opening Day Tool Discounts & Roadside Banners',
        desc: 'Introduce price lists to local foremen, offer opening day cement promos, and setup delivery fleet.',
        category: 'Launch',
        agency: 'Local Construction Foremen, Subcontractors & Barangay Residents',
        legal_basis: 'RA 7394 Consumer Act of the Philippines',
        estimated_time: '2 - 3 Days',
        estimated_cost: '₱1,500 - ₱4,000',
        required_docs: ['Hardware Price Board', 'Cashless QR Standee', 'Delivery Receipt Books'],
        sub_steps: [
          'Visit ongoing residential and commercial construction sites within 2km and introduce your hardware price list directly to head foremen',
          'Run an opening day promo: "Buy 20 Bags of Cement, Get 1 Free Trowel" or 10% off all hand tools and paint accessories',
          'Set up high-visibility roadside signage and prominent banners displaying current cement and rebar prices',
          'Provide GCash, Maya QR, and corporate bank transfer options for immediate electronic payment on delivery',
        ],
      },
      businessExecutionTasks: [
        {
          title: 'Hardware Yard Siting, Heavy Loading Bay & Pallet Storage',
          desc: 'Secure wide commercial access for delivery trucks, construct pallet storage, and setup steel racks.',
          category: 'Planning',
          agency: 'Local Property Owner & City Building Official',
          legal_basis: 'PD 1096 National Building Code & Fire Code (RA 9514)',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱15,000 - ₱35,000',
          required_docs: ['Commercial Lease Agreement', 'Yard Loading Bay Sketch', 'Fire Clearance for Solvents'],
          sub_steps: [
            'Choose commercial location with wide street access allowing delivery trucks (6-wheelers / dump trucks) to unload easily',
            'Allocate reinforced concrete yard space with elevated wooden pallets to store cement sacks away from floor moisture',
            'Install cantilever steel racks for vertical or horizontal storage of 20-foot PVC pipes, GI conduits, and deformed rebar',
            'Set up a clean retail showroom area with pegboard displays for hand tools, safety gear, fasteners, and paint cans',
          ],
        },
        {
          title: 'Direct Cement, Steel & Electrical Wholesale Distributor Sourcing',
          desc: 'Establish distributor accounts for cement, deformed rebar, PVC pipes, and electrical supplies.',
          category: 'Supplies',
          agency: 'Direct Cement Manufacturers, Steel Mills & Electrical Wholesalers',
          legal_basis: 'RA 9178 BMBE Financial Compliance & Consumer Act',
          estimated_time: '5 - 10 Days',
          estimated_cost: '₱50,000 - ₱150,000',
          required_docs: ['Distributor Credit Applications', 'PNS Quality Product Certifications', 'Initial Stock Ledger'],
          sub_steps: [
            'Establish direct distributor accounts with major cement manufacturers (Eagle, Holcim, Republic) and steel mills for wholesale rates',
            'Canvass plumbing and electrical wholesalers: Neltex/Atlanta PVC pipes, Phelps Dodge wires, breaker boxes, and LED fixtures',
            'Stock essential fasteners in bulk bins: common nails (CWN), concrete nails, drywall screws, tox, and blind rivets',
            'Procure hardware measuring tools: digital platform scales, metric tape measures, and heavy-duty rebar manual cutters',
          ],
        },
        {
          title: 'Volume Cement/Steel Margins, Per-Piece Fastener Markup & Delivery Fees',
          desc: 'Balance slim commodity margins with 40–60% markups on hand tools and fasteners.',
          category: 'Operations',
          agency: 'Self-managed & Financial Costing',
          legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
          estimated_time: '2 Days',
          estimated_cost: 'Operating Budget',
          required_docs: ['Commodity Pricing Matrix', 'Retail Hardware Price Tags', 'Trucking Rate Schedule'],
          sub_steps: [
            'Calculate slim margins on high-velocity commodities: cement (₱10–₱25 markup per bag) and steel (8–12% margin)',
            'Apply healthy 40–60% margins on low-ticket hardware accessories: paintbrushes, Teflon tapes, fasteners, and hand tools',
            'Establish transparent delivery fee tiers: free delivery for orders above ₱15,000 within 3km, or standard ₱300–₱500 truck drop fee',
            'Print comprehensive, laminated price boards for cement, steel, sand, and gravel compliant with RA 7394 Price Tag Law',
          ],
        },
        {
          title: 'Inventory Counting SOPs, Safe Material Handling & Credit Controls',
          desc: 'Enforce FIFO cement rotation, provide safety handling gear, and enforce strict delivery cash limits.',
          category: 'Operations',
          agency: 'Internal Operations & Occupational Safety Standards (DOLE OSH)',
          legal_basis: 'RA 11058 Occupational Safety and Health Standards Act',
          estimated_time: '2 Days',
          estimated_cost: '₱1,000 - ₱2,500',
          required_docs: ['Warehouse Safety Guidelines', 'Official Delivery Receipt (DR) Book', 'Fastener Stock Ledger'],
          sub_steps: [
            'Enforce strict First-In, First-Out (FIFO) cement inventory rotation; never sell hardened or moist bags',
            'Implement safety handling protocols: provide workers with steel-toe boots, heavy rubber grip gloves, and back support belts',
            'Maintain a strict cash-before-delivery policy for new contractors; document credit limits with signed delivery receipts (DR)',
            'Conduct bi-weekly spot checks on fast-moving electrical wires and power tools to eliminate pilferage',
          ],
        },
        {
          title: 'Contractor Meet-and-Greet, Opening Day Tool Discounts & Roadside Banners',
          desc: 'Introduce price lists to local foremen, offer opening day cement promos, and setup delivery fleet.',
          category: 'Launch',
          agency: 'Local Construction Foremen, Subcontractors & Barangay Residents',
          legal_basis: 'RA 7394 Consumer Act of the Philippines',
          estimated_time: '2 - 3 Days',
          estimated_cost: '₱1,500 - ₱4,000',
          required_docs: ['Hardware Price Board', 'Cashless QR Standee', 'Delivery Receipt Books'],
          sub_steps: [
            'Visit ongoing residential and commercial construction sites within 2km and introduce your hardware price list directly to head foremen',
            'Run an opening day promo: "Buy 20 Bags of Cement, Get 1 Free Trowel" or 10% off all hand tools and paint accessories',
            'Set up high-visibility roadside signage and prominent banners displaying current cement and rebar prices',
            'Provide GCash, Maya QR, and corporate bank transfer options for immediate electronic payment on delivery',
          ],
        },
      ],
    };
  }

  // 8. Tailoring / Dressmaking / Sewing / Garments / Apparel
  if (
    lower.includes('tailor') ||
    lower.includes('dressmak') ||
    lower.includes('sewing') ||
    lower.includes('patahian') ||
    lower.includes('garment') ||
    lower.includes('apparel') ||
    lower.includes('uniform') ||
    lower.includes('alteration')
  ) {
    return {
      id: cleanName,
      label: cleanName,
      desc: 'Custom tailoring, dressmaking, school uniforms & rush alterations',
      iconName: 'shopping-bag',
      isProductBased: true,
      customerSegments: ['School Students (Uniforms & P.E. Sets)', 'Local Government & Security Personnel (Uniforms)', 'Wedding & Debut Celebrants (Custom Gowns)', 'Office Workers (Pants & Barong alterations)', 'Local Dance Troupes & Festival Teams'],
      differentiatorPlaceholder: 'e.g. 3-day rush alterations, bespoke bridal fit, computerized embroidery, custom company uniforms...',
      researchStages: [
        { id: 'not_yet', label: 'Not yet' },
        { id: 'asked', label: 'Inquired with local schools and offices about uniform contracts' },
        { id: 'checked', label: 'Canvassed fabric suppliers in Divisoria/Taytay' },
        { id: 'sold', label: 'Already sewing sample clothes for clients' },
      ],
      risks: [
        { risk: 'Fitting & measurement disputes', contingency: 'Require mandatory final fitting session with client before cutting invoice is closed.' },
        { risk: 'Missed deadlines for scheduled events', contingency: 'Schedule completion 5–7 days before the actual client event date as a safety buffer.' },
        { risk: 'Fabric shrinkage / dye bleeding', contingency: 'Advise clients on pre-washing natural cotton/linen fabrics before cutting and stitching.' },
        { risk: 'Sewing machine needle breaks / motor jams', contingency: 'Oil high-speed sewing machines daily and keep backup needles, bobbins, and drive belts.' },
        { risk: 'High client downpayments tying up fabric cash', contingency: 'Require 50% non-refundable downpayment before purchasing specialized fabrics.' },
      ],
      permits: [...SHARED_PERMITS, 'City BPLO Commercial Tailoring License'],
      extraQuestions: [
        {
          id: 'sewing_focus',
          label: 'What will be your primary tailoring specialty?',
          type: 'choice',
          options: ['School & company uniforms (bulk volume)', 'Bespoke formal wear (Barong, suits, gowns)', 'Rush repairs, hemming & alterations'],
        },
      ],
      operationsTask: {
        title: 'Industrial Sewing Machines, Overlockers & Fabric Sourcing',
        desc: 'Canvass industrial lockstitch machines, 4-thread overlockers, and source textile rolls from Divisoria/Taytay.',
        category: 'Supplies',
        agency: 'Textile Wholesalers (Divisoria / Taytay) & Sewing Machine Distributors',
        legal_basis: 'RA 9178 BMBE Financial Compliance',
        estimated_time: '3 - 5 Days',
        estimated_cost: '₱25,000 - ₱60,000',
        required_docs: ['Sewing Machine Invoices & Warranty', 'Fabric Swatch Cards', 'Tailoring Notions Inventory'],
        sub_steps: [
          'Canvass industrial high-speed lockstitch sewing machines (Juki, Brother, or Jack) with energy-saving direct-drive servo motors',
          'Procure specialized finishing equipment: 4-thread high-speed overlock (edging) machine and heavy-duty gravity-feed steam iron',
          'Source bulk tailoring notions from Divisoria (Tabora/Ylaya) or regional textile wholesalers: threads, zippers, interfacing, buttons, and elastic bands',
          'Canvass textile suppliers for rolls of school uniform fabrics (tetoron, peach twill, gabardine) and athletic dri-fit materials',
        ],
      },
      launchTask: {
        title: 'Sample Mannequin Display, School Season Promo & Alteration Launch',
        desc: 'Display tailored samples on window mannequins, launch alteration promos, and distribute business cards.',
        category: 'Launch',
        agency: 'Local Schools, Corporate Offices & Neighborhood Residents',
        legal_basis: 'RA 7394 Consumer Act of the Philippines',
        estimated_time: '2 - 3 Days',
        estimated_cost: '₱1,000 - ₱2,500',
        required_docs: ['Alteration Rate Board', 'Mannequin Showcase Garments', 'Client Measurement Order Slips'],
        sub_steps: [
          'Dress outdoor shop window mannequins in impeccably tailored Barong, school uniform, and elegant evening wear samples',
          'Launch an opening promo: "Free Pants Hemming with Any Custom Tailoring Order" or 10% off school uniform package sets',
          'Distribute business cards to local dry cleaners, laundromats, and corporate offices who frequently need alteration referrals',
          'Set up a GCash / Maya payment standee at the reception counter for seamless cashless downpayments and balance settling',
        ],
      },
      businessExecutionTasks: [
        {
          title: 'Sewing Workshop Layout, Cutting Tables & Fitting Room Setup',
          desc: 'Build smooth fabric cutting tables, set up private customer fitting room, and configure task lighting.',
          category: 'Planning',
          agency: 'Local Property Owner & City Building Official',
          legal_basis: 'PD 1096 National Building Code & Occupational Safety Standards',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱8,000 - ₱18,000',
          required_docs: ['Commercial Lease Agreement', 'Workshop Ergonomic Layout Plan'],
          sub_steps: [
            'Build an expansive, smooth-surfaced 4x8 foot wooden fabric cutting table with edge rulers and under-table roll storage',
            'Set up a private, well-lit customer fitting room with full-length 3-way mirrors, fitting pins, and comfortable seating',
            'Arrange sewing machine benches in an ergonomic linear workflow: Cutting Table -> High-Speed Stitching -> Edging/Overlock -> Pressing Station',
            'Install high-power LED task lighting directly over needle plates and multiple grounded wall sockets',
          ],
        },
        {
          title: 'Industrial Sewing Machines, Overlockers & Fabric Sourcing',
          desc: 'Canvass industrial lockstitch machines, 4-thread overlockers, and source textile rolls from Divisoria/Taytay.',
          category: 'Supplies',
          agency: 'Textile Wholesalers (Divisoria / Taytay) & Sewing Machine Distributors',
          legal_basis: 'RA 9178 BMBE Financial Compliance',
          estimated_time: '3 - 5 Days',
          estimated_cost: '₱25,000 - ₱60,000',
          required_docs: ['Sewing Machine Invoices & Warranty', 'Fabric Swatch Cards', 'Tailoring Notions Inventory'],
          sub_steps: [
            'Canvass industrial high-speed lockstitch sewing machines (Juki, Brother, or Jack) with energy-saving direct-drive servo motors',
            'Procure specialized finishing equipment: 4-thread high-speed overlock (edging) machine and heavy-duty gravity-feed steam iron',
            'Source bulk tailoring notions from Divisoria (Tabora/Ylaya) or regional textile wholesalers: threads, zippers, interfacing, buttons, and elastic bands',
            'Canvass textile suppliers for rolls of school uniform fabrics (tetoron, peach twill, gabardine) and athletic dri-fit materials',
          ],
        },
        {
          title: 'Labor Yardage Costing, Custom Tailoring Rates & Alteration Pricing',
          desc: 'Calculate cost per garment including yardage and labor, and publish standard alteration price card.',
          category: 'Operations',
          agency: 'Self-managed & Financial Costing',
          legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
          estimated_time: '2 Days',
          estimated_cost: 'Operating Budget',
          required_docs: ['Garment Costing Worksheet', 'Posted Alteration Rate Board', 'Job Measurement Cards'],
          sub_steps: [
            'Compute cost per garment: fabric yardage + notions (zipper/buttons/interfacing) + sewing labor hours + steam pressing electricity',
            'Benchmark local alteration rates and post a clear price card: Hemming pants (₱80–₱150), Waist adjustment (₱120–₱200), Zipper replacement (₱100–₱180)',
            'Price bespoke custom clothing (Barong Tagalog, formal gowns, suits) with at least 50–70% margin reflecting specialized craftsmanship',
            'Require 50% cash/GCash downpayment upon measurement to cover fabric and material out-of-pocket costs',
          ],
        },
        {
          title: 'Client Measurement Protocols, Fitting Milestones & Quality Inspection',
          desc: 'Standardize client body measurement forms, schedule muslin basting fittings, and inspect seams.',
          category: 'Operations',
          agency: 'Internal Tailoring Operations & Quality Assurance',
          legal_basis: 'RA 7394 Consumer Act (Service Quality & Fair Trade)',
          estimated_time: '2 Days',
          estimated_cost: '₱500 - ₱1,500',
          required_docs: ['Client Measurement Record Sheets', 'Basting Fitting Calendar', 'Garment Inspection Checklist'],
          sub_steps: [
            'Record comprehensive client measurements on standardized job sheets: chest, waist, hips, inseam, armhole, and shoulder width',
            'Schedule a 2-stage milestone timeline for custom formal wear: Basting Fitting (muslin test) and Final Hemming Fitting',
            'Inspect all finished garments before packaging: trim loose thread tails, check seam tension, and verify zipper glide',
            'Steam press every completed piece and cover in protective clear plastic garment dust bags on quality hangers',
          ],
        },
        {
          title: 'Sample Mannequin Display, School Season Promo & Alteration Launch',
          desc: 'Display tailored samples on window mannequins, launch alteration promos, and distribute business cards.',
          category: 'Launch',
          agency: 'Local Schools, Corporate Offices & Neighborhood Residents',
          legal_basis: 'RA 7394 Consumer Act of the Philippines',
          estimated_time: '2 - 3 Days',
          estimated_cost: '₱1,000 - ₱2,500',
          required_docs: ['Alteration Rate Board', 'Mannequin Showcase Garments', 'Client Measurement Order Slips'],
          sub_steps: [
            'Dress outdoor shop window mannequins in impeccably tailored Barong, school uniform, and elegant evening wear samples',
            'Launch an opening promo: "Free Pants Hemming with Any Custom Tailoring Order" or 10% off school uniform package sets',
            'Distribute business cards to local dry cleaners, laundromats, and corporate offices who frequently need alteration referrals',
            'Set up a GCash / Maya payment standee at the reception counter for seamless cashless downpayments and balance settling',
          ],
        },
      ],
    };
  }

  // 9. Universal Dynamic Philippine Trade Engine (for ANY novel/unique custom business)
  const isService =
    lower.includes('service') ||
    lower.includes('care') ||
    lower.includes('repair') ||
    lower.includes('cleaning') ||
    lower.includes('rental') ||
    lower.includes('studio') ||
    lower.includes('clinic') ||
    lower.includes('consult') ||
    lower.includes('academy') ||
    lower.includes('lesson') ||
    lower.includes('tutor') ||
    lower.includes('hotel') ||
    lower.includes('photography') ||
    lower.includes('catering') ||
    lower.includes('event');

  const customerSegments = isService
    ? ['Local Residents & Families', 'Busy Working Professionals', 'Students & Young Adults', 'Neighborhood Businesses & Offices', 'Repeat Word-of-Mouth Clients']
    : ['Local Neighborhood Walk-ins', 'Online & Social Media Buyers', 'Students & Young Consumers', 'Nearby Office Workers', 'Resellers & Bulk Buyers'];

  return {
    id: cleanName,
    label: cleanName,
    desc: `Commercial operations and market launch for ${cleanName}`,
    iconName: isService ? 'wrench' : 'shopping-bag',
    isProductBased: !isService,
    customerSegments,
    differentiatorPlaceholder: `e.g. faster service, higher quality, bespoke options for ${cleanName}...`,
    researchStages: [
      { id: 'not_yet', label: 'Not yet' },
      { id: 'asked', label: `Surveyed local community demand for ${cleanName}` },
      { id: 'checked', label: `Canvassed competitors and suppliers for ${cleanName}` },
      { id: 'sold', label: 'Already conducted small-scale test transactions' },
    ],
    risks: [
      { risk: 'Slow initial sales or client bookings', contingency: `Run an introductory launch promotion and incentivize early supporters of your ${cleanName} to share reviews.` },
      { risk: 'Price competition from established rivals', contingency: `Differentiate your ${cleanName} on quality, reliability, and responsiveness rather than entering price wars.` },
      { risk: 'Supply delays or material price hikes', contingency: 'Canvass multiple wholesale suppliers and maintain a lean 2-week buffer of essential consumables.' },
      { risk: 'Operational bottlenecks & workflow snags', contingency: 'Document standard operating procedures (SOPs) early and test equipment before high-demand hours.' },
      { risk: 'Cashflow crunch from unpaid customer balances', contingency: 'Enforce strict 50% upfront deposits on bookings/orders and provide GCash/Maya instant payment QR codes.' },
      { risk: 'Local permit & compliance delays', contingency: 'File your Barangay Clearance and DTI registration early while preparing your operating workspace.' },
    ],
    permits: [...SHARED_PERMITS, `LGU BPLO Business License for ${cleanName}`],
    extraQuestions: [
      {
        id: 'trade_scope',
        label: `What is the operational scope of your ${cleanName}?`,
        type: 'choice',
        options: ['Physical storefront / commercial space', 'Home-based with local delivery or service', 'Online & mobile appointments'],
      },
      {
        id: 'trade_target',
        label: `Who is the primary target clientele for your ${cleanName}?`,
        type: 'choice',
        options: ['Direct retail consumers (B2C)', 'Commercial businesses / corporate accounts (B2B)', 'Mixed retail and wholesale/contracts'],
      },
    ],
    operationsTask: {
      title: `Equipment Canvassing, Tooling & Supplier Sourcing for ${cleanName}`,
      desc: `Canvass reliable equipment, tools, and raw materials from authorized Philippine distributors for ${cleanName}.`,
      category: 'Supplies',
      agency: `Private Suppliers & Wholesale Distributors for ${cleanName}`,
      legal_basis: 'RA 9178 BMBE Financial Compliance & Cost Accounting Standards',
      estimated_time: '3 - 5 Days',
      estimated_cost: '₱15,000 - ₱45,000',
      required_docs: ['Supplier Price Comparison', 'Equipment Warranty Records', 'Inventory Log'],
      sub_steps: [
        `Canvass at least 3 authorized equipment vendors or wholesale suppliers for ${cleanName} and compare warranties and bulk discounts`,
        'Order sample materials or initial trial equipment to test durability and quality before committing large capital',
        'Negotiate favorable commercial payment terms or volume purchase rebates with preferred trade distributors',
        'Establish an organized inventory tracking log with minimum reorder point thresholds for all critical consumables',
      ],
    },
    launchTask: {
      title: `Soft Opening Dry-Run, Customer Acquisition & Promotional Kickoff for ${cleanName}`,
      desc: `Conduct a soft launch test, setup cashless payments, and launch customer referral incentives for ${cleanName}.`,
      category: 'Launch',
      agency: 'Local Barangay Community & Social Media Channels',
      legal_basis: 'RA 7394 Consumer Act of the Philippines',
      estimated_time: '2 - 3 Days',
      estimated_cost: '₱1,000 - ₱3,000',
      required_docs: ['Price Menu / Service Card', 'Cashless Payment QR Standee', 'Opening Promotion Materials'],
      sub_steps: [
        `Conduct a 1-day soft opening dry run with friends, family, or test clients to iron out operational bottlenecks for ${cleanName}`,
        'Display framed official business permits (DTI, Barangay Clearance, Mayor’s Permit) and set up a GCash / Maya QR payment standee',
        'Launch an irresistible opening promotion (e.g. 15% introductory launch discount or free bonus add-on for first 50 customers)',
        'Ask every satisfied early client for a written review, photo testimonial, or social media shoutout to drive word-of-mouth growth',
      ],
    },
    businessExecutionTasks: [
      {
        title: `Commercial Space Feasibility, Facility Layout & Setup for ${cleanName}`,
        desc: `Verify location foot traffic, lease terms, and design an organized, safe workspace for ${cleanName}.`,
        category: 'Planning',
        agency: 'Local Property Owner & City Building Official',
        legal_basis: 'PD 1096 National Building Code & Civil Code of the Philippines',
        estimated_time: '3 - 5 Days',
        estimated_cost: '₱8,000 - ₱20,000',
        required_docs: ['Commercial Lease Contract', 'Space Layout Sketch', 'Utility Verification'],
        sub_steps: [
          `Survey commercial foot traffic or customer accessibility in your target community for your ${cleanName}`,
          `Secure commercial lease agreement or designate a dedicated, organized home-based operating area for ${cleanName}`,
          'Verify critical utility requirements (high-capacity electrical outlets, water supply, ventilation, and high-speed internet)',
          'Procure essential facility safety gear: ABC dry chemical fire extinguisher, first-aid kit, and emergency illumination',
        ],
      },
      {
        title: `Equipment Canvassing, Tooling & Supplier Sourcing for ${cleanName}`,
        desc: `Canvass reliable equipment, tools, and raw materials from authorized Philippine distributors for ${cleanName}.`,
        category: 'Supplies',
        agency: `Private Suppliers & Wholesale Distributors for ${cleanName}`,
        legal_basis: 'RA 9178 BMBE Financial Compliance & Cost Accounting Standards',
        estimated_time: '3 - 5 Days',
        estimated_cost: '₱15,000 - ₱45,000',
        required_docs: ['Supplier Price Comparison', 'Equipment Warranty Records', 'Inventory Log'],
        sub_steps: [
          `Canvass at least 3 authorized equipment vendors or wholesale suppliers for ${cleanName} and compare warranties and bulk discounts`,
          'Order sample materials or initial trial equipment to test durability and quality before committing large capital',
          'Negotiate favorable commercial payment terms or volume purchase rebates with preferred trade distributors',
          'Establish an organized inventory tracking log with minimum reorder point thresholds for all critical consumables',
        ],
      },
      {
        title: `Unit Costing, Margin Formulas & Pricing Architecture for ${cleanName}`,
        desc: `Calculate direct costs, overhead expenses, and set prices with sustainable 35%–55% profit margins.`,
        category: 'Operations',
        agency: 'Self-managed & Financial Costing',
        legal_basis: 'RA 9178 BMBE Financial Compliance & RA 7394 Price Tag Law',
        estimated_time: '2 Days',
        estimated_cost: 'Operating Budget',
        required_docs: ['Unit Costing Worksheet', 'Published Price Card / Menu', 'Breakeven Calculation'],
        sub_steps: [
          'Calculate total landed cost per unit or service: direct raw materials + labor time + share of utilities and rent',
          'Benchmark competitor offerings within your area or online to set prices with a sustainable 35%–55% gross profit margin',
          'Formulate bundled offerings or tiered service packages (Basic, Standard, Premium) to maximize average transaction size',
          'Publish a transparent, professional price board compliant with RA 7394 Consumer Act (Price Tag Law)',
        ],
      },
      {
        title: `Operational SOPs, Quality Control Protocols & Systems for ${cleanName}`,
        desc: `Document step-by-step checklists, enforce quality inspection, and separate business cashflow.`,
        category: 'Operations',
        agency: 'Internal Business Operations & Quality Assurance',
        legal_basis: 'RA 9178 BMBE Financial Accounting Standards',
        estimated_time: '2 Days',
        estimated_cost: '₱500 - ₱1,500',
        required_docs: ['Standard Operating Procedures (SOP)', 'Quality Checklist', 'Dedicated Cash Drawer'],
        sub_steps: [
          'Document step-by-step Standard Operating Procedures (SOPs) for daily opening, production/service delivery, and closing checks',
          'Implement strict quality inspection criteria before delivering any completed product or service to a customer',
          'Maintain a dedicated business cash drawer and business e-wallet/bank account — keep business funds 100% separate from personal money',
          'Record all daily revenue, supplier expenses, and operating disbursements in your official Daily Cashflow Ledger',
        ],
      },
      {
        title: `Soft Opening Dry-Run, Customer Acquisition & Promotional Kickoff for ${cleanName}`,
        desc: `Conduct a soft launch test, setup cashless payments, and launch customer referral incentives for ${cleanName}.`,
        category: 'Launch',
        agency: 'Local Barangay Community & Social Media Channels',
        legal_basis: 'RA 7394 Consumer Act of the Philippines',
        estimated_time: '2 - 3 Days',
        estimated_cost: '₱1,000 - ₱3,000',
        required_docs: ['Price Menu / Service Card', 'Cashless Payment QR Standee', 'Opening Promotion Materials'],
        sub_steps: [
          `Conduct a 1-day soft opening dry run with friends, family, or test clients to iron out operational bottlenecks for ${cleanName}`,
          'Display framed official business permits (DTI, Barangay Clearance, Mayor’s Permit) and set up a GCash / Maya QR payment standee',
          'Launch an irresistible opening promotion (e.g. 15% introductory launch discount or free bonus add-on for first 50 customers)',
          'Ask every satisfied early client for a written review, photo testimonial, or social media shoutout to drive word-of-mouth growth',
        ],
      },
    ],
  };
};

// Aliases mapped onto our expanded profiles so existing users and variations
// receive tailored blueprints instead of falling back to generic copy.
const LEGACY_TYPE_ALIASES: { [oldType: string]: string } = {
  Carinderia: FOOD.id,
  'Food Stall': FOOD.id,
  Eatery: FOOD.id,
  Restaurant: FOOD.id,
  Cafe: FOOD.id,
  'Coffee Shop': FOOD.id,
  'Online Shop': ONLINE.id,
  'Online Selling': ONLINE.id,
  Services: SERVICES.id,
  'Pet Grooming': SERVICES.id,
  'Clothing & RTW': BUY_SELL.id,
  'Buy & Sell / RTW': BUY_SELL.id,
  'Delivery / Rides': SERVICES.id,
  Pharmacy: PHARMACY.id,
  Botika: PHARMACY.id,
  Drugstore: PHARMACY.id,
  'Laundry Shop': LAUNDRY.id,
  Laundry: LAUNDRY.id,
  Laundromat: LAUNDRY.id,
  'Water Station': WATER_STATION.id,
  'Water Refilling Station': WATER_STATION.id,
  'Water Refilling': WATER_STATION.id,
};

/**
 * Resolves a stored business_type to its profile with intelligent keyword matching.
 * If not matching one of the 8 core built-in profiles, it generates a comprehensive,
 * industry-tailored profile via buildCustomBusinessProfile.
 */
export const getBusinessProfile = (businessType?: string | null): BusinessProfile => {
  if (!businessType) return GENERIC_PROFILE;

  const direct = BUSINESS_PROFILES.find((profile) => profile.id === businessType);
  if (direct) return direct;

  const aliased = LEGACY_TYPE_ALIASES[businessType];
  if (aliased) {
    const match = BUSINESS_PROFILES.find((profile) => profile.id === aliased);
    if (match) return match;
  }

  // Intelligent keyword matching for core 8 types:
  const lower = businessType.toLowerCase();
  if (lower.includes('laundry') || lower.includes('labada') || lower.includes('wash and fold') || lower.includes('laundromat')) {
    return LAUNDRY;
  }
  if (lower.includes('water') || lower.includes('refill') || lower.includes('tubig') || lower.includes('purified')) {
    return WATER_STATION;
  }
  if (lower.includes('pharmacy') || lower.includes('drug') || lower.includes('botika') || lower.includes('gamot') || lower.includes('medicine')) {
    return PHARMACY;
  }
  if (lower.includes('online') || lower.includes('shopee') || lower.includes('lazada') || lower.includes('tiktok') || lower.includes('ecommerce')) {
    return ONLINE;
  }
  if (lower.includes('sari') || lower.includes('tindahan') || lower.includes('grocery')) {
    return SARI_SARI;
  }
  if (lower.includes('ukay') || lower.includes('resell') || lower.includes('secondhand') || lower.includes('surplus') || lower.includes('buy & sell')) {
    return BUY_SELL;
  }
  if (
    lower.includes('carinderia') ||
    lower.includes('karinderya') ||
    lower.includes('eatery') ||
    lower.includes('food cart') ||
    lower.includes('kainan')
  ) {
    return FOOD;
  }

  // All other businesses (Bakery, Motor Repair, Printing, Barber, Farm, Gym, Hardware, Tailoring, or Custom user name)
  // receive comprehensive trade-specific blueprints via buildCustomBusinessProfile!
  return buildCustomBusinessProfile(businessType);
};

