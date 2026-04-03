import { NextRequest, NextResponse } from "next/server";
import { fetchAndAnalyze } from "@/lib/seo-analyzer";
import { fetchPageSpeed } from "@/lib/pagespeed";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, keyword, psiApiKey } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Run SEO analysis and PageSpeed in parallel
    const [analysis, pagespeed] = await Promise.allSettled([
      fetchAndAnalyze(url, keyword),
      fetchPageSpeed(url, psiApiKey || undefined, "mobile"),
    ]);

    if (analysis.status === "rejected") {
      return NextResponse.json(
        { error: analysis.reason?.message || "Failed to analyze URL" },
        { status: 422 }
      );
    }

    const result = analysis.value;
    if (pagespeed.status === "fulfilled" && pagespeed.value) {
      result.pagespeed = pagespeed.value;
      // Blend PSI SEO score into technical score
      const psiSeoScore = pagespeed.value.seo;
      result.technicalScore = Math.round(result.technicalScore * 0.6 + psiSeoScore * 0.4);
      result.overallScore = Math.round(result.onPageScore * 0.4 + result.technicalScore * 0.35 + result.localScore * 0.25);
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error("Analyze error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
