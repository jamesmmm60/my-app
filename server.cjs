require("dotenv").config();
const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();
app.use(express.json());
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" })); // Allow requests from frontend

// Health check endpoint
app.get("/api/health", (_, res) => res.json({ ok: true }));

// Create Stripe Checkout session
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const {
      className,
      dateISO,
      time,
      qty = 1,
      unit_amount = 1000,
      currency = "gbp",
      email,
      name,
    } = req.body;

    // Validate required fields
    if (!className || !dateISO || !time || !email || !name) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Create line item for the class
    const lineItem = {
      quantity: Math.max(1, Number(qty) || 1),
      price_data: {
        currency,
        unit_amount: Math.max(0, Number(unit_amount) || 0),
        product_data: {
          name: className,
          description: `Session: ${dateISO} ${time}`,
        },
      },
    };

    // Define success and cancel URLs
    const successUrl = `${process.env.DOMAIN || "http://localhost:3000"}/?success=1&ref={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${process.env.DOMAIN || "http://localhost:3000"}/?canceled=1`;

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",  
      payment_method_types: ["card", "link", "klarna", "paypal"],
      customer_email: email,
      metadata: { name, className, dateISO, time },
      line_items: [lineItem],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("Error creating checkout session:", err);
    return res.status(500).json({ error: "Unable to create checkout session" });
  }
});

// Start the server
const port = process.env.PORT || 8787;
app.listen(port, () => {
  console.log(`Stripe server running on http://localhost:${port}`);
});
require("dotenv").config();
console.log("Stripe Secret Key:", process.env.STRIPE_SECRET_KEY);