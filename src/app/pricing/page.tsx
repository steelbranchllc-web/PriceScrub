"use client";

import { useState } from "react";

export default function PricingPage() {
  const plans = [
    {
      id: "starter",
      name: "Starter Plan",
      price: 19,
      badge: null as string | null,
      description: "For new and part-time flippers finding their first deals.",
      searchesLabel: "150 AI-powered searches per month",
      bullets: [
        "Great for testing PriceScrub on nights and weekends",
        "ROI and profit estimates on every result",
        "Email support",
      ],
    },
    {
      id: "pro",
      name: "Pro Plan",
      price: 39,
      badge: "Most popular",
      description: "For growing flippers running regular weekly volume.",
      searchesLabel: "600 AI-powered searches per month",
      bullets: [
        "Higher daily limits and deeper analysis",
        "Demand labels and sell-time estimates",
        "Custom ROI thresholds and filters",
        "Priority support",
      ],
    },
    {
      id: "unlimited",
      name: "Unlimited Plan",
      price: 69,
      badge: null as string | null, // 👈 no badge anymore
      description: "For serious flippers who live in the markets.",
      searchesLabel: "Unlimited AI-powered searches",
      bullets: [
        "No caps on searches or categories",
        "Best for full-time or high-volume operations",
        "Priority support and onboarding help",
      ],
    },
  ];

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) || null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background:
          "radial-gradient(circle at top, #eef2ff 0, #f9fafb 42%, #f3f4f6 100%)",
      }}
    >
      <main style={{ padding: "60px 16px 80px" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <p
            style={{
              fontSize: 11,
              letterSpacing: 2.4,
              textTransform: "uppercase",
              color: "#6b7280",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Pricing
          </p>
          <h1
            style={{
              marginTop: 10,
              marginBottom: 12,
              fontSize: 32,
              lineHeight: 1.15,
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            Plans that pay for themselves.
          </h1>
          <p
            style={{
              marginTop: 0,
              marginBottom: 28,
              fontSize: 15,
              color: "#4b5563",
              maxWidth: 640,
            }}
          >
            Start with the basics, then level up once PriceScrub has paid for
            itself a few times over.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
              gap: 20,
              marginBottom: 24,
            }}
          >
            {plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;

              const border = isSelected ? "2px solid #16a34a" : "1px solid #e5e7eb";
              const backgroundColor = isSelected
                ? "#ecfdf3"
                : "rgba(255,255,255,0.96)";
              const boxShadow = isSelected
                ? "0 16px 40px rgba(22,163,74,0.40)"
                : "0 10px 30px rgba(148,163,184,0.3)";

              return (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlanId(plan.id)}
                  style={{
                    textAlign: "left",
                    borderRadius: 20,
                    border,
                    backgroundColor,
                    padding: 20,
                    boxShadow,
                    cursor: "pointer",
                    outline: "none",
                    transition:
                      "transform 0.1s ease-out, box-shadow 0.1s ease-out, border-color 0.1s ease-out",
                    position: "relative",
                  }}
                >
                  {/* Badge in top-left if present (only Pro) */}
                  {plan.badge && (
                    <div
                      style={{
                        position: "absolute",
                        top: 14,
                        left: 14,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "4px 10px",
                        backgroundColor: "#ecfdf3",
                        borderRadius: 999,
                        border: "1px solid #bbf7d0",
                        color: "#15803d",
                      }}
                    >
                      {plan.badge}
                    </div>
                  )}

                  {/* Plan name */}
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#0f172a",
                      margin: 0,
                      marginBottom: 4,
                      marginTop: plan.badge ? 26 : 0,
                    }}
                  >
                    {plan.name}
                  </p>

                  <p
                    style={{
                      margin: 0,
                      fontSize: 26,
                      fontWeight: 700,
                      color: "#0f172a",
                      marginBottom: 2,
                    }}
                  >
                    ${plan.price}
                    <span style={{ fontSize: 14 }}>/mo</span>
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "#16a34a",
                      marginBottom: 4,
                    }}
                  >
                    {plan.searchesLabel}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "#6b7280",
                      marginBottom: 10,
                    }}
                  >
                    {plan.description}
                  </p>
                  <ul
                    style={{
                      marginTop: 0,
                      paddingLeft: 18,
                      fontSize: 13,
                      color: "#374151",
                    }}
                  >
                    {plan.bullets.map((b) => (
                      <li key={b}>{b}</li>
                    ))}
                  </ul>

                  {isSelected && (
                    <p
                      style={{
                        marginTop: 8,
                        fontSize: 12,
                        color: "#16a34a",
                        fontWeight: 600,
                      }}
                    >
                      Selected
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Continue CTA */}
          <div style={{ marginBottom: 32 }}>
            <button
              type="button"
              disabled={!selectedPlan}
              onClick={() => {
                if (!selectedPlan) return;
                // TODO: wire to checkout / signup
                alert(`Continue with ${selectedPlan.name}`);
              }}
              style={{
                padding: "11px 24px",
                borderRadius: 999,
                border: "none",
                backgroundColor: selectedPlan ? "#16a34a" : "#d1d5db",
                color: selectedPlan ? "#ffffff" : "#6b7280",
                fontWeight: 700,
                fontSize: 14,
                cursor: selectedPlan ? "pointer" : "default",
                boxShadow: selectedPlan
                  ? "0 12px 30px rgba(22,163,74,0.4)"
                  : "none",
                transition:
                  "background-color 0.1s ease-out, box-shadow 0.1s ease-out",
              }}
            >
              {selectedPlan
                ? `Continue with ${selectedPlan.name}`
                : "Select a plan to continue"}
            </button>
          </div>

          <p
            style={{
              fontSize: 12,
              color: "#6b7280",
              maxWidth: 640,
            }}
          >
            Most users recover their subscription in one or two clean flips. If
            PriceScrub doesn&apos;t make you money, you shouldn&apos;t keep it.
          </p>
        </div>
      </main>
    </div>
  );
}
