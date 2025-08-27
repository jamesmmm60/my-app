import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calendar as CalendarIcon,
  Clock,
  Users,
  Dumbbell,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  Info,
} from "lucide-react";
import "./App.css";

// ------- Configurable: classes, prices, payment links -------
const CURRENCY = "GBP"; // Display currency

const CLASSES = [
  {
    id: "boxfit",
    name: "BoxFit Fundamentals",
    description: "Technique + conditioning, beginner friendly.",
    coach: "Coach Sam",
    durationMin: 60,
    basePrice: 1000, // in pence (i.e., £10.00)
    capacity: 16,
    emoji: "🥊",
    paymentLink: "", // e.g. "https://buy.stripe.com/test_12345"
  },
  {
    id: "sparring",
    name: "Technical Sparring",
    description: "Light, coached rounds. Own kit required.",
    coach: "Coach Liv",
    durationMin: 75,
    basePrice: 1500, // £15.00
    capacity: 12,
    emoji: "🛡️",
    paymentLink: "",
  },
  {
    id: "hiit",
    name: "FightCamp HIIT",
    description: "High-intensity intervals, full sweat.",
    coach: "Coach Ade",
    durationMin: 45,
    basePrice: 1200, // £12.00
    capacity: 18,
    emoji: "🔥",
    paymentLink: "",
  },
];

// Simple promo codes for demo
const PROMOS = {
  TEST10: 0.1, // 10% off
  STUDENT15: 0.15, // 15% off
};

// Helper to format money (pence -> currency)
const fmt = (pence) =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: CURRENCY,
    maximumFractionDigits: 2,
  }).format((pence || 0) / 100);

// Generate selectable dates (today + next 13 days)
function useUpcomingDays(days = 14) {
  return useMemo(() => {
    const out = [];
    const now = new Date();
    for (let i = 0; i < days; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      out.push(d);
    }
    return out;
  }, [days]);
}

// Basic timeslots per day
const TIME_SLOTS = ["06:30", "07:30", "09:00", "12:30", "17:30", "18:30", "19:30"];

export default function App() {
  // Stepper
  const [step, setStep] = useState(1);

  // Selection state
  const [classId, setClassId] = useState(CLASSES[0].id);
  const selectedClass = useMemo(() => CLASSES.find((c) => c.id === classId), [classId]);

  const days = useUpcomingDays(14);
  const [dateISO, setDateISO] = useState(() => days[0]?.toISOString().slice(0, 10));
  const [time, setTime] = useState("18:30");
  const [qty, setQty] = useState(1);
  const [firstVisit, setFirstVisit] = useState(false);

  // Customer info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");

  // Promo
  const [promo, setPromo] = useState("");
  const promoPct = PROMOS[promo?.trim().toUpperCase()] || 0;

  // UI
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState("");

  // Remember email for convenience
  useEffect(() => {
    const saved = localStorage.getItem("booking_email");
    if (saved) setEmail(saved);
  }, []);
  useEffect(() => {
    if (email) localStorage.setItem("booking_email", email);
  }, [email]);

  const classPrice = selectedClass.basePrice;
  const subtotal = classPrice * qty;
  const discount = Math.round(subtotal * promoPct);
  const total = Math.max(0, subtotal - discount);

  const selectedDatePretty = useMemo(() => {
    try {
      const d = new Date(dateISO + "T00:00:00");
      return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
    } catch {
      return "";
    }
  }, [dateISO]);

  const success = new URLSearchParams(window.location.search).get("success");
  const demo = new URLSearchParams(window.location.search).get("demo");

  async function handlePay() {
    if (!name || !email) {
      setBanner("Please add your name and email first.");
      return;
    }
    setBanner("");
    setLoading(true);

    // 1) Try server endpoint first (recommended Stripe Checkout)
    try {
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: selectedClass.id,
          className: selectedClass.name,
          dateISO,
          time,
          qty,
          email,
          name,
          phone,
          notes,
          unit_amount: classPrice, // pence
          currency: CURRENCY.toLowerCase(),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.url) {
          window.location.href = data.url; // redirect to Stripe Checkout
          return;
        }
      }
    } catch {}

    // 2) Fallback: Payment Link per class (no server required)
    if (selectedClass.paymentLink) {
      window.open(selectedClass.paymentLink, "_blank");
      setBanner("Opened Stripe Payment Link in a new tab. After paying, return here.");
      setLoading(false);
      return;
    }

    // 3) Final fallback: Demo simulation
    if (demo !== null) {
      await new Promise((r) => setTimeout(r, 900));
      const params = new URLSearchParams(window.location.search);
      params.set("success", "1");
      params.set("ref", Math.random().toString(36).slice(2, 10));
      window.history.replaceState({}, "", `${window.location.pathname}?${params}`);
      setLoading(false);
      setBanner("Demo success! This simulates a paid booking.");
      return;
    }

    setLoading(false);
    setBanner("No backend found. Add a Payment Link, deploy the tiny server, or use ?demo=1.");
  }

  if (success) {
    return (
      <div className="layout layout--gradient text">
        <div className="container narrow">
          <div className="success-head">
            <CheckCircle2 className="icon success" />
            <h1 className="h2">Booking confirmed</h1>
          </div>

          <div className="card blur">
            <p className="muted sm">Thanks, {name || "your name"}. A confirmation email will arrive shortly.</p>
            <div className="grid two sm-gap">
              <div className="pill">
                <div className="muted">Class</div>
                <div className="bold">{selectedClass.name}</div>
              </div>
              <div className="pill">
                <div className="muted">When</div>
                <div className="bold">{selectedDatePretty} · {time}</div>
              </div>
              <div className="pill">
                <div className="muted">Attendees</div>
                <div className="bold">{qty}</div>
              </div>
              <div className="pill">
                <div className="muted">Total paid</div>
                <div className="bold">{fmt(total)}</div>
              </div>
            </div>
            <p className="tiny dim">Ref: {new URLSearchParams(window.location.search).get("ref") || "demo-ref"}</p>
          </div>

          <div className="actions">
            <a href={window.location.pathname} className="btn btn--primary">
              Book another class <ChevronRight size={16} />
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="layout layout--gradient text">
      {/* Header */}
      <header className="header blur">
        <div className="container row between center">
          <div className="brand row gap">
            <div className="logo">🥊</div>
            <div>
              <div className="tiny dim">Launchset</div>
              <div className="bold">Gym Booking</div>
            </div>
          </div>
          <div className="tiny dim hide-sm">
            {demo !== null ? "Demo mode on (no real payments)" : "Secure checkout via Stripe"}
          </div>
        </div>
      </header>

      <main className="container pad">
        {/* Banner */}
        {banner && (
          <div className="banner warning">
            <Info className="icon" size={18} />
            <p className="sm">{banner}</p>
          </div>
        )}

        {/* Stepper */}
        <ol className="stepper">
          {["Choose class", "Pick a time", "Your details", "Review & pay"].map((label, i) => (
            <li key={label} className={`step ${step === i + 1 ? "active" : ""}`}>
              <span className="step-num">{i + 1}</span>
              {label}
            </li>
          ))}
        </ol>

        <div className="grid three gap">
          {/* Left column: selectors */}
          <div className="col-span-2 stack gap">
            {/* Step 1: Class */}
            <motion.section layout className="card">
              <div className="section-head">
                <Dumbbell size={18} /> <h2 className="h4">Choose a class</h2>
              </div>
              <div className="grid two gap">
                {CLASSES.map((c) => (
                  <motion.button
                    key={c.id}
                    whileHover={{ y: -2 }}
                    onClick={() => setClassId(c.id)}
                    className={`class-card ${classId === c.id ? "selected" : ""}`}
                  >
                    <div className="row between start">
                      <div>
                        <div className="tiny dim">{c.emoji} {c.coach}</div>
                        <div className="bold tight">{c.name}</div>
                      </div>
                      <div className="right">
                        <div className="tiny dim">{c.durationMin} min</div>
                        <div className="bold">{fmt(c.basePrice)}</div>
                      </div>
                    </div>
                    <p className="sm dim mt-2">{c.description}</p>
                  </motion.button>
                ))}
              </div>
              <div className="right mt-4">
                <button onClick={() => setStep(2)} className="btn btn--primary">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </motion.section>

            {/* Step 2: Date & time */}
            <motion.section layout className="card">
              <div className="section-head">
                <CalendarIcon size={18} /> <h2 className="h4">Pick a time</h2>
              </div>
              <div className="grid two gap">
                <div>
                  <label className="label">Date</label>
                  <select value={dateISO} onChange={(e) => setDateISO(e.target.value)} className="input">
                    {days.map((d) => {
                      const iso = d.toISOString().slice(0, 10);
                      const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
                      return (
                        <option key={iso} value={iso}>{label}</option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="label">Time</label>
                  <select value={time} onChange={(e) => setTime(e.target.value)} className="input">
                    {TIME_SLOTS.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Attendees</label>
                  <input
                    type="number"
                    min={1}
                    max={selectedClass.capacity}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Math.min(selectedClass.capacity, Number(e.target.value) || 1)))}
                    className="input"
                  />
                  <p className="tiny dim mt-1">Max {selectedClass.capacity} per session</p>
                </div>
                <div className="row end center">
                  <label className="checkbox sm">
                    <input type="checkbox" checked={firstVisit} onChange={(e) => setFirstVisit(e.target.checked)} />
                    <span>First time here?</span>
                  </label>
                </div>
              </div>
              <div className="right mt-4">
                <button onClick={() => setStep(3)} className="btn btn--primary">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </motion.section>

            {/* Step 3: Details */}
            <motion.section layout className="card">
              <div className="section-head">
                <Users size={18} /> <h2 className="h4">Your details</h2>
              </div>
              <div className="grid two gap">
                <div>
                  <label className="label">Full name</label>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., John Helyar" className="input" />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" />
                </div>
                <div>
                  <label className="label">Phone (optional)</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="07…" className="input" />
                </div>
                <div>
                  <label className="label">Notes (optional)</label>
                  <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any injuries, access needs, etc." className="input" />
                </div>
                <div>
                  <label className="label">Promo code</label>
                  <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="TEST10, STUDENT15" className="input" />
                </div>
              </div>
              <div className="right mt-4">
                <button onClick={() => setStep(4)} className="btn btn--primary">
                  Continue <ChevronRight size={16} />
                </button>
              </div>
            </motion.section>
          </div>

          {/* Right column: summary & Pay */}
          <aside className="stack gap">
            <div className="card">
              <div className="section-head">
                <Clock size={18} /> <h3 className="h5">Summary</h3>
              </div>
              <div className="stack sm-gap">
                <div className="row between"><span className="dim">Class</span><span className="bold">{selectedClass.name}</span></div>
                <div className="row between"><span className="dim">When</span><span className="bold">{selectedDatePretty} · {time}</span></div>
                <div className="row between"><span className="dim">Attendees</span><span className="bold">{qty}</span></div>
                <hr className="hr" />
                <div className="row between"><span className="dim">Subtotal</span><span className="bold">{fmt(subtotal)}</span></div>
                {discount > 0 && (
                  <div className="row between accent"><span>Promo</span><span>-{fmt(discount)}</span></div>
                )}
                <div className="row between larger"><span className="dim-strong">Total</span><span className="bold">{fmt(total)}</span></div>
                <p className="tiny dim">No VAT charged. Free cancellation up to 12 hours before.</p>
              </div>
              <button onClick={handlePay} disabled={loading} className="btn btn--pay full mt-4">
                {loading ? (
                  <span className="row center gap"><span className="spinner" /> Processing…</span>
                ) : (
                  <span className="row center gap"><CreditCard size={18} /> Pay & Book with Stripe</span>
                )}
              </button>
              <p className="tiny dim mt-2">
                By paying you agree to our terms and health & safety rules.
              </p>
              <div className="tiny dim mt-2">
                No backend here? <strong>Use ?demo=1</strong>, set a <strong>Payment Link</strong>, or deploy the tiny server.
              </div>
            </div>

            <div className="card">
              <h4 className="h5 mb-2">Why Stripe?</h4>
              <ul className="ul">
                <li>Apple Pay & Google Pay supported</li>
                <li>PCI compliant, SCA ready, secure checkout</li>
                <li>Automatic receipts & refunds tooling</li>
              </ul>
            </div>
          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="container pad-bottom">
        <div className="tiny dim">© {new Date().getFullYear()} Launchset. Demo UI. Replace content with your gym brand.</div>
      </footer>
    </div>
  );
}

/* =============================================================
   SERVER_SNIPPET — Minimal Node/Express for Stripe Checkout
   Save as server.js, then:
     npm i express stripe cors dotenv
     STRIPE_SECRET_KEY=sk_test_... node server.js
   Or create a .env with STRIPE_SECRET_KEY and run: node server.js
   Make sure your frontend runs on the same origin or allow CORS.
============================================================= */
export const SERVER_SNIPPET = `
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(express.json());
app.use(cors({ origin: true }));

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Health check
app.get('/api/health', (_, res) => res.json({ ok: true }));

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { className, dateISO, time, qty = 1, unit_amount = 1000, currency = 'gbp', email, name } = req.body;

    const lineItem = {
      quantity: Math.max(1, Number(qty) || 1),
      price_data: {
        currency,
        unit_amount: Math.max(0, Number(unit_amount) || 0),
        product_data: {
          name: className || 'Gym class',
          description: \`Session: \${dateISO} \${time}\`,
        },
      },
    };

    const successUrl = (process.env.DOMAIN || 'http://localhost:5173') + '/?success=1&ref={CHECKOUT_SESSION_ID}';
    const cancelUrl = (process.env.DOMAIN || 'http://localhost:5173') + '/?canceled=1';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'link', 'klarna', 'paypal'],
      customer_email: email,
      metadata: { name, className, dateISO, time },
      line_items: [lineItem],
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Unable to create checkout session' });
  }
});

const port = process.env.PORT || 8787;
app.listen(port, () => console.log('Stripe server on http://localhost:' + port));
`