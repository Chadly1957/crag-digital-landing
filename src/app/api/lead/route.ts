import { NextRequest, NextResponse } from "next/server";
import { fetchAndAnalyze, type AnalysisResult } from "@/lib/seo-analyzer";

// ─── Email helpers ────────────────────────────────────────────────────────────

function scoreGrade(score: number) {
  if (score >= 80) return { letter: "A", color: "#16a34a" };
  if (score >= 65) return { letter: "B", color: "#2563eb" };
  if (score >= 50) return { letter: "C", color: "#d97706" };
  if (score >= 35) return { letter: "D", color: "#ea580c" };
  return { letter: "F", color: "#dc2626" };
}

function leadEmailHtml(email: string, url: string, result: AnalysisResult): string {
  const grade = scoreGrade(result.overallScore);
  const issues = result.topIssues.slice(0, 5).map(i => `<li style="margin:4px 0;">${i}</li>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px 0;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:28px 32px;">
      <p style="color:#bfdbfe;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px;">New SEO Lead — Crag Digital</p>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0;">${url.replace(/^https?:\/\//, "")}</h1>
    </div>

    <div style="padding:28px 32px;border-bottom:1px solid #f3f4f6;">
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;width:100px;">Lead Email</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;">${email}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;color:#6b7280;font-size:13px;">Website</td>
          <td style="padding:6px 0;font-size:13px;font-weight:600;color:#111827;"><a href="${url}" style="color:#2563eb;">${url}</a></td>
        </tr>
      </table>
    </div>

    <div style="padding:28px 32px;border-bottom:1px solid #f3f4f6;text-align:center;">
      <div style="display:inline-block;width:72px;height:72px;border-radius:50%;background:${grade.color}18;line-height:72px;text-align:center;margin-bottom:8px;">
        <span style="font-size:32px;font-weight:900;color:${grade.color};">${result.overallScore}</span>
      </div>
      <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Overall SEO Score</p>
      <div style="display:inline-block;margin-top:8px;background:${grade.color}18;color:${grade.color};padding:3px 12px;border-radius:999px;font-size:12px;font-weight:700;">Grade ${grade.letter}</div>
    </div>

    <div style="padding:28px 32px;border-bottom:1px solid #f3f4f6;">
      <h3 style="margin:0 0 12px;font-size:14px;color:#374151;font-weight:700;">Score Breakdown</h3>
      <table style="width:100%;border-collapse:collapse;">
        ${[
          ["On-Page SEO", result.onPageScore],
          ["Technical SEO", result.technicalScore],
          ["Local SEO", result.localScore],
        ].map(([label, score]) => {
          const c = (score as number) >= 80 ? "#16a34a" : (score as number) >= 50 ? "#d97706" : "#dc2626";
          return `<tr>
            <td style="padding:5px 0;font-size:13px;color:#374151;">${label}</td>
            <td style="padding:5px 0;text-align:right;font-size:13px;font-weight:700;color:${c};">${score}/100</td>
          </tr>`;
        }).join("")}
      </table>
    </div>

    ${result.topIssues.length > 0 ? `
    <div style="padding:28px 32px;">
      <h3 style="margin:0 0 12px;font-size:14px;color:#374151;font-weight:700;">Top Issues Found</h3>
      <ul style="margin:0;padding-left:20px;color:#4b5563;font-size:13px;line-height:1.7;">${issues}</ul>
    </div>` : ""}

    <div style="background:#f9fafb;padding:16px 32px;text-align:center;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">Crag Digital · cragdigital.com</p>
    </div>
  </div>
</body>
</html>`;
}

function userEmailHtml(email: string, url: string, result: AnalysisResult): string {
  const grade = scoreGrade(result.overallScore);
  const issues = result.topIssues.slice(0, 4).map(i => `<li style="margin:6px 0;">${i}</li>`).join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;padding:32px 0;margin:0;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.1);">
    <div style="background:linear-gradient(135deg,#1d4ed8,#2563eb);padding:28px 32px;">
      <p style="color:#bfdbfe;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;margin:0 0 6px;">Your Free SEO Report</p>
      <h1 style="color:#fff;font-size:22px;font-weight:800;margin:0 0 4px;">${url.replace(/^https?:\/\//, "")}</h1>
      <p style="color:#bfdbfe;font-size:13px;margin:0;">Here's what we found.</p>
    </div>

    <div style="padding:28px 32px;text-align:center;border-bottom:1px solid #f3f4f6;">
      <div style="display:inline-block;width:88px;height:88px;border-radius:50%;border:5px solid ${grade.color};line-height:80px;text-align:center;margin-bottom:10px;">
        <span style="font-size:36px;font-weight:900;color:${grade.color};">${result.overallScore}</span>
      </div>
      <h2 style="margin:0 0 4px;font-size:18px;font-weight:800;color:#111827;">SEO Score: ${result.overallScore}/100</h2>
      <p style="margin:0;font-size:13px;color:#6b7280;">
        ${result.overallScore >= 80 ? "Your site is performing well!" : result.overallScore >= 50 ? "There's room to improve your rankings." : "Your site has significant SEO opportunities."}
      </p>
    </div>

    <div style="padding:28px 32px;border-bottom:1px solid #f3f4f6;">
      <h3 style="margin:0 0 12px;font-size:14px;color:#374151;font-weight:700;">Section Scores</h3>
      <table style="width:100%;border-collapse:collapse;">
        ${[
          ["On-Page SEO", result.onPageScore],
          ["Technical SEO", result.technicalScore],
          ["Local SEO", result.localScore],
        ].map(([label, score]) => {
          const c = (score as number) >= 80 ? "#16a34a" : (score as number) >= 50 ? "#d97706" : "#dc2626";
          const pct = score as number;
          return `<tr>
            <td style="padding:6px 0;font-size:13px;color:#374151;width:130px;">${label}</td>
            <td style="padding:6px 4px;">
              <div style="background:#f3f4f6;border-radius:999px;height:8px;overflow:hidden;">
                <div style="background:${c};width:${pct}%;height:100%;border-radius:999px;"></div>
              </div>
            </td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:${c};text-align:right;width:48px;">${pct}/100</td>
          </tr>`;
        }).join("")}
      </table>
    </div>

    ${result.topIssues.length > 0 ? `
    <div style="padding:28px 32px;border-bottom:1px solid #f3f4f6;">
      <h3 style="margin:0 0 12px;font-size:14px;color:#374151;font-weight:700;">Top Issues to Address</h3>
      <ul style="margin:0;padding-left:20px;color:#4b5563;font-size:13px;line-height:1.8;">${issues}</ul>
    </div>` : ""}

    <div style="padding:28px 32px;text-align:center;">
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">Ready to climb the rankings?</p>
      <a href="https://cragdigital.com" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:700;">Book a Free Consultation →</a>
    </div>

    <div style="background:#f9fafb;padding:16px 32px;text-align:center;">
      <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">You're receiving this because you requested a free SEO report on cragdigital.com.</p>
      <p style="margin:0;font-size:12px;color:#9ca3af;">Crag Digital · cragdigital.com</p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send email via Resend ────────────────────────────────────────────────────

async function sendEmails(email: string, url: string, result: AnalysisResult) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev mode: log instead of sending
    console.log("[SEO Lead] No RESEND_API_KEY — skipping email send");
    console.log(`  Lead: ${email} / ${url} / Score: ${result.overallScore}`);
    return;
  }

  const fromAddress = process.env.RESEND_FROM_EMAIL || "SEO Reports <onboarding@resend.dev>";
  const domain = url.replace(/^https?:\/\//, "").split("/")[0];

  // Fire both in parallel — don't block on errors
  const [leadResult, userResult] = await Promise.allSettled([
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress,
        to: ["chad@cragdigital.com"],
        subject: `New SEO Lead: ${domain} (Score: ${result.overallScore}/100)`,
        html: leadEmailHtml(email, url, result),
      }),
    }),
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: `Your Free SEO Report — ${domain}`,
        html: userEmailHtml(email, url, result),
      }),
    }),
  ]);

  if (leadResult.status === "rejected") console.error("Lead email failed:", leadResult.reason);
  if (userResult.status === "rejected") console.error("User email failed:", userResult.reason);
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { url?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { url, email } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  let result: AnalysisResult;
  try {
    result = await fetchAndAnalyze(url);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to analyze URL" },
      { status: 422 }
    );
  }

  // Send emails in background — don't hold up the response
  sendEmails(email, url, result).catch(console.error);

  return NextResponse.json({
    overallScore: result.overallScore,
    onPageScore: result.onPageScore,
    technicalScore: result.technicalScore,
    localScore: result.localScore,
    topIssues: result.topIssues,
    quickWins: result.quickWins,
    url: result.url,
  });
}
