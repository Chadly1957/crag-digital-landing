"use client";

import { useState } from "react";

interface AnalysisResult {
  overallScore: number;
  onPageScore: number;
  technicalScore: number;
  localScore: number;
  topIssues: string[];
  quickWins: string[];
  url: string;
}

type Step = "form" | "loading" | "results";

function scoreColor(score: number): string {
  if (score >= 80) return "#16a34a";
  if (score >= 50) return "#d97706";
  return "#dc2626";
}

function scoreGrade(score: number) {
  if (score >= 80) return { letter: "A", label: "Great" };
  if (score >= 65) return { letter: "B", label: "Good" };
  if (score >= 50) return { letter: "C", label: "Fair" };
  if (score >= 35) return { letter: "D", label: "Poor" };
  return { letter: "F", label: "Critical" };
}

function GaugeCircle({ score, size = 96 }: { score: number; size?: number }) {
  const color = scoreColor(score);
  const r = (size - 12) / 2;
  const cx = size / 2;
  const circumference = 2 * Math.PI * r;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
        <circle
          cx={cx} cy={cx} r={r} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-black text-2xl" style={{ color }}>{score}</span>
      </div>
    </div>
  );
}

function ScoreRow({ label, score }: { label: string; score: number }) {
  const color = scoreColor(score);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-xs font-bold w-10 text-right" style={{ color }}>{score}/100</span>
    </div>
  );
}

function close() {
  window.parent.postMessage({ type: "CRAG_CLOSE_POPUP" }, "*");
}

export default function WidgetPage() {
  const [step, setStep] = useState<Step>("form");
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [analyzeHost, setAnalyzeHost] = useState("");

  async function submit() {
    const trimUrl = url.trim();
    const trimEmail = email.trim();
    if (!trimUrl || !trimEmail) return;

    const normalized = /^https?:\/\//i.test(trimUrl) ? trimUrl : `https://${trimUrl}`;
    const host = normalized.replace(/^https?:\/\//, "").split("/")[0];

    setAnalyzeHost(host);
    setStep("loading");
    setError(null);

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized, email: trimEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");
      setResult(data);
      setStep("results");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStep("form");
    }
  }

  return (
    <div
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        background: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        width: "100%",
        maxWidth: 480,
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* Close button */}
      <button
        onClick={close}
        aria-label="Close"
        style={{
          position: "absolute", top: 14, right: 14, zIndex: 10,
          background: "rgba(255,255,255,0.25)", border: "none",
          borderRadius: "50%", width: 28, height: 28,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 16, lineHeight: 1,
        }}
      >
        ✕
      </button>

      {/* Header */}
      <div style={{ background: "linear-gradient(135deg,#1d4ed8,#2563eb)", padding: "28px 32px 24px" }}>
        <p style={{ color: "#bfdbfe", fontSize: 11, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", margin: "0 0 6px" }}>
          Free SEO Report
        </p>
        <h2 style={{ color: "#fff", fontSize: 20, fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
          {step === "results" && result
            ? `${result.url.replace(/^https?:\/\//, "").split("/")[0]}`
            : "How's your website ranking?"}
        </h2>
        {step === "form" && (
          <p style={{ color: "#bfdbfe", fontSize: 13, margin: "6px 0 0" }}>
            Get your free SEO score in seconds — no credit card needed.
          </p>
        )}
      </div>

      {/* Step: Form */}
      {step === "form" && (
        <div style={{ padding: "24px 32px 28px" }}>
          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
              {error}
            </div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
              Your Website URL
            </label>
            <input
              type="url"
              placeholder="https://yourbusiness.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1.5px solid #d1d5db", borderRadius: 8,
                padding: "10px 12px", fontSize: 14, color: "#111827",
                outline: "none",
              }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#374151", marginBottom: 5 }}>
              Your Email Address
            </label>
            <input
              type="email"
              placeholder="you@yourbusiness.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}
              style={{
                width: "100%", boxSizing: "border-box",
                border: "1.5px solid #d1d5db", borderRadius: 8,
                padding: "10px 12px", fontSize: 14, color: "#111827",
                outline: "none",
              }}
            />
          </div>
          <button
            onClick={submit}
            disabled={!url.trim() || !email.trim()}
            style={{
              width: "100%", padding: "12px 0",
              background: (!url.trim() || !email.trim()) ? "#93c5fd" : "#2563eb",
              color: "#fff", border: "none", borderRadius: 8,
              fontSize: 15, fontWeight: 700, cursor: (!url.trim() || !email.trim()) ? "not-allowed" : "pointer",
              transition: "background .15s",
            }}
          >
            Get My Free SEO Report →
          </button>
          <p style={{ margin: "10px 0 0", fontSize: 11, color: "#9ca3af", textAlign: "center", lineHeight: 1.5 }}>
            By clicking submit you agree to receive communication from Crag Digital.
          </p>
        </div>
      )}

      {/* Step: Loading */}
      {step === "loading" && (
        <div style={{ padding: "40px 32px", textAlign: "center" }}>
          <div style={{
            width: 48, height: 48, margin: "0 auto 20px",
            border: "4px solid #e5e7eb", borderTopColor: "#2563eb",
            borderRadius: "50%", animation: "spin 0.8s linear infinite",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontSize: 15, fontWeight: 600, color: "#111827", margin: "0 0 6px" }}>
            Analyzing {analyzeHost}...
          </p>
          <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>
            Checking on-page SEO, technical factors, and local signals
          </p>
        </div>
      )}

      {/* Step: Results */}
      {step === "results" && result && (() => {
        const grade = scoreGrade(result.overallScore);
        const color = scoreColor(result.overallScore);
        return (
          <div style={{ padding: "24px 32px 28px" }}>
            {/* Score hero */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, padding: "16px 20px", background: "#f9fafb", borderRadius: 12 }}>
              <GaugeCircle score={result.overallScore} size={88} />
              <div>
                <p style={{ fontSize: 22, fontWeight: 900, color: "#111827", margin: "0 0 2px", lineHeight: 1 }}>
                  {result.overallScore}<span style={{ fontSize: 14, fontWeight: 500, color: "#6b7280" }}>/100</span>
                </p>
                <div style={{ display: "inline-block", background: color + "18", color, padding: "2px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                  Grade {grade.letter} — {grade.label}
                </div>
                <p style={{ fontSize: 12, color: "#6b7280", margin: 0 }}>
                  {result.overallScore >= 80
                    ? "Your site is performing well!"
                    : result.overallScore >= 50
                    ? "There's room to improve your rankings."
                    : "Your site has significant SEO opportunities."}
                </p>
              </div>
            </div>

            {/* Score breakdown */}
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 10px" }}>Score Breakdown</h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <ScoreRow label="On-Page SEO" score={result.onPageScore} />
                <ScoreRow label="Technical SEO" score={result.technicalScore} />
                <ScoreRow label="Local SEO" score={result.localScore} />
              </div>
            </div>

            {/* Top issues */}
            {result.topIssues.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 12, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 10px" }}>Top Issues Found</h4>
                <ul style={{ margin: 0, paddingLeft: 18, color: "#4b5563", fontSize: 13, lineHeight: 1.7 }}>
                  {result.topIssues.slice(0, 4).map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Report sent notice */}
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "10px 14px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 18 }}>✉️</span>
              <p style={{ margin: 0, fontSize: 13, color: "#166534" }}>
                Full report sent to <strong>{email}</strong>
              </p>
            </div>

            {/* CTA */}
            <a
              href="https://cragdigital.com"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block", textAlign: "center",
                background: "#2563eb", color: "#fff",
                textDecoration: "none", padding: "12px 0",
                borderRadius: 8, fontSize: 15, fontWeight: 700,
              }}
            >
              Book a Free Consultation →
            </a>
          </div>
        );
      })()}
    </div>
  );
}
