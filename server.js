const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// ─────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────
app.use(express.json());

// ─────────────────────────────────────────────
// Mock Database
// ─────────────────────────────────────────────
const customers = [
  { id: "12345", name: "Max Mustermann" },
  { id: "67890", name: "Anna Schmidt" },
  { id: "11111", name: "Peter Müller" },
  { id: "22222", name: "Laura Fischer" },
];

const items = [
  { item_number: "001", description: "Widget A - Standard" },
  { item_number: "002", description: "Widget B - Premium" },
  { item_number: "003", description: "Gadget X - Basic" },
  { item_number: "005", description: "Component Z - Heavy Duty" },
  // Note: item 004 is intentionally missing to demo "not_found"
];

// ─────────────────────────────────────────────
// Helper: Generate a simple order ID
// ─────────────────────────────────────────────
function generateOrderId() {
  return "ORD-" + Date.now();
}

// ─────────────────────────────────────────────
// POST /create-order
// ─────────────────────────────────────────────
app.post("/create-order", (req, res) => {
  console.log("\n📦 Incoming order request:");
  console.log(JSON.stringify(req.body, null, 2));

  const { customer_id, customer_name, items: requestedItems } = req.body;

  // ── Basic input validation ──────────────────
  if (!customer_id && !customer_name) {
    console.log("❌ Validation failed: No customer_id or customer_name provided.");
    return res.status(400).json({
      error: "Please provide at least a customer_id or customer_name.",
    });
  }

  if (!requestedItems || !Array.isArray(requestedItems) || requestedItems.length === 0) {
    console.log("❌ Validation failed: No items provided.");
    return res.status(400).json({
      error: "Please provide at least one item in the 'items' array.",
    });
  }

  // ── Validate Customer ───────────────────────
  console.log(`\n🔍 Looking up customer: ID="${customer_id}" | Name="${customer_name}"`);

  const matchedCustomer = customers.find((c) => {
    const idMatch = customer_id && c.id === customer_id;
    const nameMatch = customer_name && c.name.toLowerCase() === customer_name.toLowerCase();
    return idMatch || nameMatch;
  });

  const customerConfirmed = !!matchedCustomer;

  if (customerConfirmed) {
    console.log(`✅ Customer confirmed: ${matchedCustomer.name} (ID: ${matchedCustomer.id})`);
  } else {
    console.log("⚠️  Customer NOT found in database.");
  }

  // ── Validate Items ──────────────────────────
  console.log("\n🔍 Validating items...");

  const itemResults = requestedItems.map((requestedItem) => {
    const found = items.find((i) => i.item_number === requestedItem.item_number);
    const status = found ? "found" : "not_found";

    if (found) {
      console.log(`  ✅ Item ${requestedItem.item_number} (${found.description}) - FOUND | Qty: ${requestedItem.quantity}`);
    } else {
      console.log(`  ❌ Item ${requestedItem.item_number} - NOT FOUND`);
    }

    return {
      item_number: requestedItem.item_number,
      status,
      ...(found && { description: found.description }),
      ...(requestedItem.quantity && { quantity: requestedItem.quantity }),
    };
  });

  // ── Simulate Order Creation ─────────────────
  // Order is "created" only if customer is confirmed and at least one item is found
  const atLeastOneItemFound = itemResults.some((i) => i.status === "found");
  const orderCreated = customerConfirmed && atLeastOneItemFound;
  const orderId = orderCreated ? generateOrderId() : null;

  if (orderCreated) {
    console.log(`\n✅ Order created successfully! Order ID: ${orderId}`);
  } else {
    console.log("\n⚠️  Order NOT created (customer not confirmed or no valid items).");
  }

  // ── Build Response ──────────────────────────
  const response = {
    customer_confirmed: customerConfirmed,
    customer_id: matchedCustomer ? matchedCustomer.id : customer_id || null,
    customer_name: matchedCustomer ? matchedCustomer.name : customer_name || null,
    items: itemResults,
    order_created: orderCreated,
    ...(orderId && { order_id: orderId }),
    ...(!customerConfirmed && { reason: "Customer not found in database." }),
  };

  console.log("\n📤 Sending response:");
  console.log(JSON.stringify(response, null, 2));

  return res.status(200).json(response);
});

// ─────────────────────────────────────────────
// Health Check endpoint
// ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({ status: "Mock ERP API is running!", version: "1.0.0" });
});

// ─────────────────────────────────────────────
// Global Error Handler
// ─────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("💥 Unexpected server error:", err);
  res.status(500).json({ error: "Internal server error. Please try again." });
});

// ─────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 Mock ERP API running at http://localhost:${PORT}`);
  console.log(`📋 POST endpoint: http://localhost:${PORT}/create-order`);
  console.log("─────────────────────────────────────────────\n");
});