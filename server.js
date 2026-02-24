const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(express.json());

// ─────────────────────────────────────────────
// API Authentication
// ─────────────────────────────────────────────
const API_TOKEN = process.env.API_TOKEN || "erp-secret-token-2024-umair";

function authenticate(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    console.log("🔒 Unauthorized: No token provided");
    return res.status(401).json({ error: "Unauthorized. Provide: Authorization: Bearer <token>" });
  }

  if (token !== API_TOKEN) {
    console.log("🔒 Unauthorized: Invalid token");
    return res.status(403).json({ error: "Forbidden. Invalid API token." });
  }

  next();
}

// ─────────────────────────────────────────────
// TABLE 1: Customers (19 records)
// ─────────────────────────────────────────────
const customers = [
  { customer_id: "C001", customer_name: "Max Mustermann",    customer_email: "max.mustermann@email.de",    article_numbers: ["A001","A003","A007"], language: "DE", order_ids: ["ORD-001","ORD-002"] },
  { customer_id: "C002", customer_name: "Anna Schmidt",      customer_email: "anna.schmidt@email.de",      article_numbers: ["A002","A005"],         language: "DE", order_ids: ["ORD-003"] },
  { customer_id: "C003", customer_name: "Peter Müller",      customer_email: "peter.mueller@email.de",     article_numbers: ["A001","A010"],         language: "DE", order_ids: ["ORD-004"] },
  { customer_id: "C004", customer_name: "Laura Fischer",     customer_email: "laura.fischer@email.de",     article_numbers: ["A004","A006","A009"],  language: "DE", order_ids: [] },
  { customer_id: "C005", customer_name: "John Smith",        customer_email: "john.smith@email.com",       article_numbers: ["A002","A008"],         language: "EN", order_ids: [] },
  { customer_id: "C006", customer_name: "Sarah Johnson",     customer_email: "sarah.j@email.com",          article_numbers: ["A011","A013"],         language: "EN", order_ids: [] },
  { customer_id: "C007", customer_name: "Michael Brown",     customer_email: "m.brown@email.com",          article_numbers: ["A003","A012"],         language: "EN", order_ids: [] },
  { customer_id: "C008", customer_name: "Emily Davis",       customer_email: "emily.d@email.com",          article_numbers: ["A014","A015"],         language: "EN", order_ids: [] },
  { customer_id: "C009", customer_name: "Hans Weber",        customer_email: "hans.weber@email.de",        article_numbers: ["A001","A016"],         language: "DE", order_ids: [] },
  { customer_id: "C010", customer_name: "Klaus Becker",      customer_email: "k.becker@email.de",          article_numbers: ["A017","A018"],         language: "DE", order_ids: [] },
  { customer_id: "C011", customer_name: "Sophie Martin",     customer_email: "sophie.m@email.com",         article_numbers: ["A005","A019"],         language: "EN", order_ids: [] },
  { customer_id: "C012", customer_name: "Thomas Schulz",     customer_email: "t.schulz@email.de",          article_numbers: ["A002","A020"],         language: "DE", order_ids: [] },
  { customer_id: "C013", customer_name: "Julia Wagner",      customer_email: "julia.w@email.de",           article_numbers: ["A021"],                language: "DE", order_ids: [] },
  { customer_id: "C014", customer_name: "David Wilson",      customer_email: "d.wilson@email.com",         article_numbers: ["A007","A008"],         language: "EN", order_ids: [] },
  { customer_id: "C015", customer_name: "Maria Garcia",      customer_email: "m.garcia@email.com",         article_numbers: ["A009","A010"],         language: "EN", order_ids: [] },
  { customer_id: "C016", customer_name: "Franz Hoffmann",    customer_email: "f.hoffmann@email.de",        article_numbers: ["A011","A012"],         language: "DE", order_ids: [] },
  { customer_id: "C017", customer_name: "Lisa Schneider",    customer_email: "l.schneider@email.de",       article_numbers: ["A013","A014"],         language: "DE", order_ids: [] },
  { customer_id: "C018", customer_name: "James Anderson",    customer_email: "j.anderson@email.com",       article_numbers: ["A015","A016"],         language: "EN", order_ids: [] },
  { customer_id: "C019", customer_name: "Emma Thompson",     customer_email: "e.thompson@email.com",       article_numbers: ["A017","A018"],         language: "EN", order_ids: [] },
];

// ─────────────────────────────────────────────
// TABLE 2: Items (21 records)
// ─────────────────────────────────────────────
const items = [
  { article_number: "A001", item_title: "Industrial Pressure Valve 12mm",        item_title_DE: "Industriedruckventil 12mm",          availability_status: "Available",     item_price: 45.99,  customer_ids: ["C001","C003","C009"] },
  { article_number: "A002", item_title: "Steel Pipe Connector 1 inch",           item_title_DE: "Stahlrohrverbinder 1 Zoll",          availability_status: "Available",     item_price: 12.50,  customer_ids: ["C002","C005","C012"] },
  { article_number: "A003", item_title: "Heavy Duty Bolt Set M10 (50 pcs)",      item_title_DE: "Schwerlastschraubenset M10 (50 Stk)", availability_status: "Available",     item_price: 28.00,  customer_ids: ["C001","C007"] },
  { article_number: "A004", item_title: "Rubber Seal Ring 15mm",                 item_title_DE: "Gummidichtungsring 15mm",            availability_status: "Out of stock",  item_price: 3.75,   customer_ids: ["C004"] },
  { article_number: "A005", item_title: "Hydraulic Pump Filter",                 item_title_DE: "Hydraulikpumpenfilter",              availability_status: "Available",     item_price: 89.00,  customer_ids: ["C002","C011"] },
  { article_number: "A006", item_title: "Aluminum Bracket 200x50mm",             item_title_DE: "Aluminiumhalterung 200x50mm",        availability_status: "Available",     item_price: 19.99,  customer_ids: ["C004"] },
  { article_number: "A007", item_title: "Electric Motor 0.5kW 230V",             item_title_DE: "Elektromotor 0,5kW 230V",            availability_status: "Available",     item_price: 235.00, customer_ids: ["C001","C014"] },
  { article_number: "A008", item_title: "Control Panel Switch 16A",              item_title_DE: "Schalttafelschalter 16A",            availability_status: "Out of stock",  item_price: 15.20,  customer_ids: ["C005","C014"] },
  { article_number: "A009", item_title: "Conveyor Belt Segment 500mm",           item_title_DE: "Förderbandsegment 500mm",            availability_status: "Available",     item_price: 67.50,  customer_ids: ["C004","C015"] },
  { article_number: "A010", item_title: "Gear Box Lubricant 5L",                 item_title_DE: "Getriebeöl 5L",                     availability_status: "Available",     item_price: 34.00,  customer_ids: ["C003","C015"] },
  { article_number: "A011", item_title: "Safety Pressure Relief Valve",          item_title_DE: "Sicherheitsdruckentlastungsventil",  availability_status: "Available",     item_price: 112.00, customer_ids: ["C006","C016"] },
  { article_number: "A012", item_title: "Stainless Steel Flange DN50",           item_title_DE: "Edelstahlflansch DN50",              availability_status: "Available",     item_price: 55.80,  customer_ids: ["C007","C016"] },
  { article_number: "A013", item_title: "Digital Flow Meter",                    item_title_DE: "Digitaler Durchflussmesser",         availability_status: "Out of stock",  item_price: 189.99, customer_ids: ["C006","C017"] },
  { article_number: "A014", item_title: "Insulation Mat 1m x 2m",               item_title_DE: "Isoliermatte 1m x 2m",              availability_status: "Available",     item_price: 22.40,  customer_ids: ["C008","C017"] },
  { article_number: "A015", item_title: "Cable Conduit 25mm 10m Roll",           item_title_DE: "Kabelrohr 25mm 10m Rolle",          availability_status: "Available",     item_price: 18.60,  customer_ids: ["C008","C018"] },
  { article_number: "A016", item_title: "Terminal Block 12-way",                 item_title_DE: "Klemmleiste 12-polig",               availability_status: "Available",     item_price: 9.90,   customer_ids: ["C009","C018"] },
  { article_number: "A017", item_title: "Pneumatic Cylinder 80mm Stroke",        item_title_DE: "Pneumatikzylinder 80mm Hub",         availability_status: "Available",     item_price: 148.00, customer_ids: ["C010","C019"] },
  { article_number: "A018", item_title: "Air Filter Regulator 1/4 inch",         item_title_DE: "Luftfilterregler 1/4 Zoll",         availability_status: "Out of stock",  item_price: 42.30,  customer_ids: ["C010","C019"] },
  { article_number: "A019", item_title: "Proximity Sensor NPN 10-30V",           item_title_DE: "Näherungssensor NPN 10-30V",         availability_status: "Available",     item_price: 31.00,  customer_ids: ["C011"] },
  { article_number: "A020", item_title: "PLC Communication Module",              item_title_DE: "SPS-Kommunikationsmodul",            availability_status: "Available",     item_price: 310.00, customer_ids: ["C012"] },
  { article_number: "A021", item_title: "Vibration Damper Pad Set (4 pcs)",      item_title_DE: "Schwingungsdämpferpad-Set (4 Stk)",  availability_status: "Available",     item_price: 14.80,  customer_ids: ["C013"] },
];

// ─────────────────────────────────────────────
// TABLE 3: Orders (4 records)
// ─────────────────────────────────────────────
const orders = [
  {
    order_id: "ORD-001",
    order_status: "Confirmed",
    total_price: 319.97,
    created_via: "AI",
    order_date: "2024-01-15",
    customer_id: "C001",
    order_summary: "Order for Max Mustermann: 1x Industrial Pressure Valve A001, 2x Heavy Duty Bolt Set A003, 1x Electric Motor A007. All items confirmed and dispatched.",
  },
  {
    order_id: "ORD-002",
    order_status: "Pending",
    total_price: 45.99,
    created_via: "AI",
    order_date: "2024-01-22",
    customer_id: "C001",
    order_summary: "Follow-up order for Max Mustermann: 1x Industrial Pressure Valve A001. Awaiting warehouse confirmation.",
  },
  {
    order_id: "ORD-003",
    order_status: "Confirmed",
    total_price: 101.50,
    created_via: "Website",
    order_date: "2024-01-18",
    customer_id: "C002",
    order_summary: "Order for Anna Schmidt: 1x Hydraulic Pump Filter A005, 2x Steel Pipe Connector A002. Confirmed and in transit.",
  },
  {
    order_id: "ORD-004",
    order_status: "Cancelled",
    total_price: 0.00,
    created_via: "Mobile App",
    order_date: "2024-01-20",
    customer_id: "C003",
    order_summary: "Order for Peter Müller was cancelled. Items A001 and A010 were requested but order was cancelled before processing.",
  },
];

// ─────────────────────────────────────────────
// Helper: Generate order ID
// ─────────────────────────────────────────────
function generateOrderId() {
  return "ORD-" + Date.now();
}

// ─────────────────────────────────────────────
// ROUTES
// ─────────────────────────────────────────────

// Homepage — serves the visual database dashboard (no auth needed)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, 'database_visual.html'));
});

// JSON status endpoint (for programmatic health checks)
app.get("/status", (req, res) => {
  res.json({
    status: "Mock ERP API is running!",
    version: "2.0.0",
    tables: { customers: customers.length, items: items.length, orders: orders.length },
    auth: "Bearer token required for all /api/* endpoints",
  });
});

// ── GET /api/customers ───────────────────────
app.get("/api/customers", authenticate, (req, res) => {
  console.log("📋 GET /api/customers");
  res.json({ total: customers.length, customers });
});

// ── GET /api/customers/:id ───────────────────
app.get("/api/customers/:id", authenticate, (req, res) => {
  const customer = customers.find(c => c.customer_id === req.params.id);
  if (!customer) return res.status(404).json({ error: "Customer not found." });
  const customerOrders = orders.filter(o => o.customer_id === customer.customer_id);
  const customerItems = items.filter(i => customer.article_numbers.includes(i.article_number));
  res.json({ customer, linked_orders: customerOrders, linked_items: customerItems });
});

// ── GET /api/items ───────────────────────────
app.get("/api/items", authenticate, (req, res) => {
  console.log("📦 GET /api/items");
  res.json({ total: items.length, items });
});

// ── GET /api/items/:article_number ──────────
app.get("/api/items/:article_number", authenticate, (req, res) => {
  const item = items.find(i => i.article_number === req.params.article_number);
  if (!item) return res.status(404).json({ error: "Item not found." });
  res.json(item);
});

// ── GET /api/orders ──────────────────────────
app.get("/api/orders", authenticate, (req, res) => {
  console.log("🗂️  GET /api/orders");
  res.json({ total: orders.length, orders });
});

// ── GET /api/orders/:id ──────────────────────
app.get("/api/orders/:id", authenticate, (req, res) => {
  const order = orders.find(o => o.order_id === req.params.id);
  if (!order) return res.status(404).json({ error: "Order not found." });
  const customer = customers.find(c => c.customer_id === order.customer_id);
  res.json({ order, customer: customer || null });
});

// ── POST /api/create-order ───────────────────
app.post("/api/create-order", authenticate, (req, res) => {
  console.log("\n📦 POST /api/create-order");
  console.log(JSON.stringify(req.body, null, 2));

  const { customer_id, customer_name, items: requestedItems, created_via = "AI" } = req.body;

  if (!customer_id && !customer_name) {
    return res.status(400).json({ error: "Provide customer_id or customer_name." });
  }
  if (!requestedItems || !Array.isArray(requestedItems) || requestedItems.length === 0) {
    return res.status(400).json({ error: "Provide at least one item in the items array." });
  }

  // Validate customer
  const matchedCustomer = customers.find(c => {
    const idMatch = customer_id && c.customer_id === customer_id;
    const nameMatch = customer_name && c.customer_name.toLowerCase() === customer_name.toLowerCase();
    return idMatch || nameMatch;
  });

  const customerConfirmed = !!matchedCustomer;
  console.log(customerConfirmed ? `✅ Customer: ${matchedCustomer.customer_name}` : "❌ Customer not found");

  // Validate items
  let totalPrice = 0;
  const itemResults = requestedItems.map(req => {
    const found = items.find(i => i.article_number === req.article_number);
    const inStock = found && found.availability_status === "Available";

    if (found && inStock) {
      totalPrice += found.item_price * (req.quantity || 1);
      console.log(`  ✅ ${req.article_number} - ${found.item_title} | Qty: ${req.quantity || 1} | $${found.item_price}`);
    } else if (found) {
      console.log(`  ⚠️  ${req.article_number} - Out of stock`);
    } else {
      console.log(`  ❌ ${req.article_number} - Not found`);
    }

    return {
      article_number: req.article_number,
      status: !found ? "not_found" : !inStock ? "out_of_stock" : "found",
      ...(found && { item_title: found.item_title, item_price: found.item_price, availability_status: found.availability_status }),
      quantity: req.quantity || 1,
    };
  });

  const atLeastOneAvailable = itemResults.some(i => i.status === "found");
  const orderCreated = customerConfirmed && atLeastOneAvailable;
  const newOrderId = orderCreated ? generateOrderId() : null;

  if (orderCreated) {
    const newOrder = {
      order_id: newOrderId,
      order_status: "Pending",
      total_price: Math.round(totalPrice * 100) / 100,
      created_via,
      order_date: new Date().toISOString().split("T")[0],
      customer_id: matchedCustomer.customer_id,
      order_summary: `Order for ${matchedCustomer.customer_name}: ${itemResults.filter(i => i.status === "found").map(i => `${i.quantity}x ${i.article_number}`).join(", ")}.`,
    };
    orders.push(newOrder);
    console.log(`\n✅ Order created: ${newOrderId} | Total: $${newOrder.total_price}`);
  }

  return res.status(200).json({
    customer_confirmed: customerConfirmed,
    customer_id: matchedCustomer?.customer_id || customer_id || null,
    customer_name: matchedCustomer?.customer_name || customer_name || null,
    items: itemResults,
    order_created: orderCreated,
    ...(newOrderId && { order_id: newOrderId, total_price: Math.round(totalPrice * 100) / 100 }),
    ...(!customerConfirmed && { reason: "Customer not found in database." }),
    ...(!atLeastOneAvailable && customerConfirmed && { reason: "No available items found." }),
  });
});

// ─────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("💥 Server error:", err);
  res.status(500).json({ error: "Internal server error." });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Mock ERP API v2.0 running at http://localhost:${PORT}`);
  console.log(`🔑 API Token: ${API_TOKEN}`);
  console.log(`📊 Customers: ${customers.length} | Items: ${items.length} | Orders: ${orders.length}`);
  console.log("─────────────────────────────────────────────\n");
});