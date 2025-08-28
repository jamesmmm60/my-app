// server.js
import "dotenv/config";
import express from "express";
import cors from "cors";
import Stripe from "stripe";

const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

// ✅ Debug log to check if env is loaded
if (!process.env.STRIPE_SECRET_KEY) {
  console.error("❌ STRIPE_SECRET_KEY is missing. Did you create a .env file?");
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Health check
app.get("/api/health", (_, res) => res.json({ ok: true }));

// Create Checkout Session
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const {
      className = "Gym class",
      dateISO = "",
      time = "",
      qty = 1,
      unit_amount = 1000,
      currency = "gbp",
      email,
      name,
    } = req.body || {};

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      customer_email: email,
      metadata: { name, className, dateISO, time },
      line_items: [
        {
          quantity: Math.max(1, Number(qty) || 1),
          price_data: {
            currency,
            unit_amount: Math.max(0, Number(unit_amount) || 0),
            product_data: {
              name: className,
              description: `Session: ${dateISO} ${time}`,
            },
          },
        },
      ],
      allow_promotion_codes: true,
      success_url: `${process.env.DOMAIN || "http://localhost:5173"}?success=1`,
      cancel_url: `${process.env.DOMAIN || "http://localhost:5173"}?canceled=1`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("Stripe error:", err);
    res.status(500).json({ error: "Unable to create checkout session" });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () =>
  console.log(`✅ Stripe server running at http://localhost:${port}`)
);
