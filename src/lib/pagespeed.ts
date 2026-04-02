export interface PageSpeedData {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  fcp: string;
  lcp: string;
  cls: string;
  tbt: string;
  mobile: boolean;
}

export async function fetchPageSpeed(url: string, apiKey?: string, strategy: "mobile" | "desktop" = "mobile"): Promise<PageSpeedData | null> {
  try {
    const base = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
    const params = new URLSearchParams({
      url,
      strategy,
      ...(apiKey ? { key: apiKey } : {}),
    });
    ["performance", "accessibility", "best-practices", "seo"].forEach(cat =>
      params.append("category", cat)
    );

    const res = await fetch(`${base}?${params.toString()}`);
    if (!res.ok) return null;

    const data = await res.json();
    const cats = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};

    const score = (key: string) => Math.round((cats[key]?.score || 0) * 100);
    const displayValue = (key: string) => audits[key]?.displayValue || "N/A";

    return {
      performance: score("performance"),
      accessibility: score("accessibility"),
      bestPractices: score("best-practices"),
      seo: score("seo"),
      fcp: displayValue("first-contentful-paint"),
      lcp: displayValue("largest-contentful-paint"),
      cls: displayValue("cumulative-layout-shift"),
      tbt: displayValue("total-blocking-time"),
      mobile: strategy === "mobile",
    };
  } catch {
    return null;
  }
}
