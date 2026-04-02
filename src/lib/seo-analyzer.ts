import * as cheerio from "cheerio";

export interface OnPageSEO {
  title: { value: string | null; length: number; score: number; issues: string[] };
  metaDescription: { value: string | null; length: number; score: number; issues: string[] };
  headings: { h1: string[]; h2: string[]; h3: string[]; score: number; issues: string[] };
  images: { total: number; missingAlt: number; score: number; issues: string[] };
  canonicalUrl: { value: string | null; score: number; issues: string[] };
  openGraph: { hasOg: boolean; title: string | null; description: string | null; image: string | null; score: number; issues: string[] };
  schema: { types: string[]; hasLocalBusiness: boolean; score: number; issues: string[] };
  keywords: { inTitle: boolean; inDescription: boolean; inH1: boolean; density: number; score: number };
  links: { internal: number; external: number; broken: number; score: number; issues: string[] };
  wordCount: number;
  readabilityScore: number;
}

export interface TechnicalSEO {
  https: { enabled: boolean; score: number };
  wwwRedirect: { consistent: boolean; score: number };
  robotsMeta: { value: string | null; indexable: boolean; score: number; issues: string[] };
  viewportMeta: { present: boolean; score: number };
  langAttribute: { value: string | null; score: number };
  pageSize: { bytes: number; score: number; issues: string[] };
  urlStructure: { score: number; issues: string[] };
}

export interface LocalSEO {
  napPresent: { name: boolean; address: boolean; phone: boolean; score: number; issues: string[] };
  localSchema: { present: boolean; type: string | null; score: number; issues: string[] };
  googleMapsEmbed: { present: boolean; score: number };
  cityStateInContent: { present: boolean; score: number };
  localKeywords: { detected: string[]; score: number };
}

export interface AnalysisResult {
  url: string;
  timestamp: string;
  overallScore: number;
  onPageScore: number;
  technicalScore: number;
  localScore: number;
  onPage: OnPageSEO;
  technical: TechnicalSEO;
  local: LocalSEO;
  pagespeed?: PageSpeedData;
  topIssues: string[];
  quickWins: string[];
}

export interface PageSpeedData {
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo: number;
  fcp: string;
  lcp: string;
  cls: string;
  tbt: string;
}

export async function fetchAndAnalyze(url: string, targetKeyword?: string): Promise<AnalysisResult> {
  const normalizedUrl = normalizeUrl(url);

  let html = "";
  let responseHeaders: Record<string, string> = {};
  let finalUrl = normalizedUrl;
  let pageBytes = 0;

  try {
    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEOAnalyzer/1.0; +https://seoanalyzer.dev)",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });

    finalUrl = response.url;
    html = await response.text();
    pageBytes = new TextEncoder().encode(html).length;
    response.headers.forEach((val, key) => {
      responseHeaders[key.toLowerCase()] = val;
    });
  } catch {
    throw new Error(`Failed to fetch ${normalizedUrl}. Make sure the URL is accessible.`);
  }

  const $ = cheerio.load(html);

  const onPage = analyzeOnPage($, finalUrl, targetKeyword);
  const technical = analyzeTechnical($, finalUrl, pageBytes);
  const local = analyzeLocalSEO($, html);

  const onPageScore = calcSectionScore([
    onPage.title.score,
    onPage.metaDescription.score,
    onPage.headings.score,
    onPage.images.score,
    onPage.canonicalUrl.score,
    onPage.openGraph.score,
    onPage.schema.score,
  ]);

  const technicalScore = calcSectionScore([
    technical.https.score,
    technical.robotsMeta.score,
    technical.viewportMeta.score,
    technical.langAttribute.score,
    technical.pageSize.score,
    technical.urlStructure.score,
  ]);

  const localScore = calcSectionScore([
    local.napPresent.score,
    local.localSchema.score,
    local.googleMapsEmbed.score,
    local.cityStateInContent.score,
    local.localKeywords.score,
  ]);

  const overallScore = Math.round(onPageScore * 0.4 + technicalScore * 0.35 + localScore * 0.25);

  const { topIssues, quickWins } = collectIssues(onPage, technical, local);

  return {
    url: normalizedUrl,
    timestamp: new Date().toISOString(),
    overallScore,
    onPageScore,
    technicalScore,
    localScore,
    onPage,
    technical,
    local,
    topIssues,
    quickWins,
  };
}

function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  return url.replace(/\/$/, "");
}

function analyzeOnPage($: cheerio.CheerioAPI, url: string, keyword?: string): OnPageSEO {
  // Title
  const titleEl = $("title").first().text().trim();
  const titleLen = titleEl.length;
  const titleIssues: string[] = [];
  let titleScore = 100;
  if (!titleEl) { titleIssues.push("Missing title tag"); titleScore = 0; }
  else if (titleLen < 30) { titleIssues.push(`Title too short (${titleLen} chars, aim for 50-60)`); titleScore -= 30; }
  else if (titleLen > 60) { titleIssues.push(`Title too long (${titleLen} chars, aim for 50-60)`); titleScore -= 20; }
  if (keyword && titleEl && !titleEl.toLowerCase().includes(keyword.toLowerCase())) {
    titleIssues.push("Target keyword not found in title"); titleScore -= 25;
  }

  // Meta description
  const metaDesc = $('meta[name="description"]').attr("content")?.trim() || null;
  const descLen = metaDesc?.length || 0;
  const descIssues: string[] = [];
  let descScore = 100;
  if (!metaDesc) { descIssues.push("Missing meta description"); descScore = 0; }
  else if (descLen < 120) { descIssues.push(`Meta description too short (${descLen} chars, aim for 150-160)`); descScore -= 25; }
  else if (descLen > 160) { descIssues.push(`Meta description too long (${descLen} chars, may be truncated)`); descScore -= 15; }
  if (keyword && metaDesc && !metaDesc.toLowerCase().includes(keyword.toLowerCase())) {
    descIssues.push("Target keyword not in meta description"); descScore -= 15;
  }

  // Headings
  const h1s = $("h1").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h2s = $("h2").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const h3s = $("h3").map((_, el) => $(el).text().trim()).get().filter(Boolean);
  const headingIssues: string[] = [];
  let headingScore = 100;
  if (h1s.length === 0) { headingIssues.push("No H1 tag found"); headingScore -= 40; }
  else if (h1s.length > 1) { headingIssues.push(`Multiple H1 tags (${h1s.length}) — use only one`); headingScore -= 20; }
  if (h2s.length === 0) { headingIssues.push("No H2 tags — add subheadings for structure"); headingScore -= 15; }
  if (keyword && h1s.length > 0 && !h1s[0].toLowerCase().includes(keyword.toLowerCase())) {
    headingIssues.push("Target keyword not in H1"); headingScore -= 15;
  }

  // Images
  const allImages = $("img");
  const missingAlt = allImages.filter((_, el) => !$(el).attr("alt")).length;
  const imgIssues: string[] = [];
  let imgScore = 100;
  if (allImages.length > 0 && missingAlt > 0) {
    imgIssues.push(`${missingAlt} image(s) missing alt text`);
    imgScore -= Math.min(50, missingAlt * 15);
  }
  if (allImages.length === 0) { imgScore = 70; imgIssues.push("No images found on page"); }

  // Canonical
  const canonical = $('link[rel="canonical"]').attr("href") || null;
  const canonicalIssues: string[] = [];
  let canonicalScore = 100;
  if (!canonical) { canonicalIssues.push("No canonical URL tag"); canonicalScore = 50; }

  // Open Graph
  const ogTitle = $('meta[property="og:title"]').attr("content") || null;
  const ogDesc = $('meta[property="og:description"]').attr("content") || null;
  const ogImage = $('meta[property="og:image"]').attr("content") || null;
  const hasOg = !!(ogTitle || ogDesc || ogImage);
  const ogIssues: string[] = [];
  let ogScore = 100;
  if (!ogTitle) { ogIssues.push("Missing og:title"); ogScore -= 25; }
  if (!ogDesc) { ogIssues.push("Missing og:description"); ogScore -= 20; }
  if (!ogImage) { ogIssues.push("Missing og:image"); ogScore -= 20; }

  // Schema
  const schemaTypes: string[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($(el).html() || "{}");
      const items = Array.isArray(json) ? json : [json];
      items.forEach(item => {
        if (item["@type"]) schemaTypes.push(item["@type"]);
      });
    } catch { /* ignore */ }
  });
  const hasLocalBusiness = schemaTypes.some(t =>
    ["LocalBusiness", "Restaurant", "Store", "MedicalBusiness", "LegalService", "HealthAndBeautyBusiness", "FoodEstablishment"].includes(t)
  );
  const schemaIssues: string[] = [];
  let schemaScore = 100;
  if (schemaTypes.length === 0) { schemaIssues.push("No structured data (schema.org) found"); schemaScore = 20; }
  if (!hasLocalBusiness) { schemaIssues.push("No LocalBusiness schema — important for local SEO"); schemaScore = Math.min(schemaScore, 50); }

  // Keyword density
  const bodyText = $("body").text().toLowerCase();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;
  let keywordDensity = 0;
  let keywordInTitle = false;
  let keywordInDesc = false;
  let keywordInH1 = false;
  if (keyword) {
    const kw = keyword.toLowerCase();
    const matches = bodyText.match(new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), "g"))?.length || 0;
    keywordDensity = wordCount > 0 ? (matches / wordCount) * 100 : 0;
    keywordInTitle = titleEl.toLowerCase().includes(kw);
    keywordInDesc = (metaDesc || "").toLowerCase().includes(kw);
    keywordInH1 = h1s.some(h => h.toLowerCase().includes(kw));
  }
  const kwScore = keyword
    ? (keywordInTitle ? 30 : 0) + (keywordInDesc ? 25 : 0) + (keywordInH1 ? 25 : 0) + (keywordDensity > 0.5 && keywordDensity < 3 ? 20 : 0)
    : 75;

  // Links
  const allLinks = $("a[href]");
  let internalLinks = 0;
  let externalLinks = 0;
  const urlObj = new URL(normalizeUrl(url));
  allLinks.each((_, el) => {
    const href = $(el).attr("href") || "";
    if (href.startsWith("#") || href.startsWith("javascript")) return;
    try {
      const linkUrl = new URL(href, urlObj.origin);
      if (linkUrl.hostname === urlObj.hostname) internalLinks++;
      else externalLinks++;
    } catch { /* skip */ }
  });
  const linkIssues: string[] = [];
  let linkScore = 100;
  if (internalLinks < 3) { linkIssues.push("Few internal links — add more to help crawlers"); linkScore -= 20; }

  // Simple readability (Flesch-like: avg sentence length)
  const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 10);
  const avgWordsPerSentence = sentences.length > 0 ? wordCount / sentences.length : 20;
  const readabilityScore = Math.max(0, Math.min(100, Math.round(100 - (avgWordsPerSentence - 15) * 2)));

  return {
    title: { value: titleEl || null, length: titleLen, score: Math.max(0, titleScore), issues: titleIssues },
    metaDescription: { value: metaDesc, length: descLen, score: Math.max(0, descScore), issues: descIssues },
    headings: { h1: h1s, h2: h2s, h3: h3s, score: Math.max(0, headingScore), issues: headingIssues },
    images: { total: allImages.length, missingAlt, score: Math.max(0, imgScore), issues: imgIssues },
    canonicalUrl: { value: canonical, score: canonicalScore, issues: canonicalIssues },
    openGraph: { hasOg, title: ogTitle, description: ogDesc, image: ogImage, score: Math.max(0, ogScore), issues: ogIssues },
    schema: { types: schemaTypes, hasLocalBusiness, score: Math.max(0, schemaScore), issues: schemaIssues },
    keywords: { inTitle: keywordInTitle, inDescription: keywordInDesc, inH1: keywordInH1, density: Math.round(keywordDensity * 100) / 100, score: kwScore },
    links: { internal: internalLinks, external: externalLinks, broken: 0, score: Math.max(0, linkScore), issues: linkIssues },
    wordCount,
    readabilityScore,
  };
}

function analyzeTechnical($: cheerio.CheerioAPI, url: string, pageBytes: number): TechnicalSEO {
  const isHttps = url.startsWith("https://");

  const robotsMeta = $('meta[name="robots"]').attr("content") || null;
  const robotsIssues: string[] = [];
  let robotsScore = 100;
  let indexable = true;
  if (robotsMeta) {
    if (robotsMeta.includes("noindex")) { robotsIssues.push("Page is set to noindex — won't appear in search"); robotsScore = 0; indexable = false; }
    if (robotsMeta.includes("nofollow")) { robotsIssues.push("Page has nofollow — links won't pass authority"); robotsScore -= 20; }
  }

  const viewport = $('meta[name="viewport"]').attr("content") || null;
  const viewportScore = viewport ? 100 : 0;

  const lang = $("html").attr("lang") || null;
  const langScore = lang ? 100 : 60;

  const pageSizeKb = Math.round(pageBytes / 1024);
  const pageSizeIssues: string[] = [];
  let pageSizeScore = 100;
  if (pageSizeKb > 500) { pageSizeIssues.push(`Page HTML is ${pageSizeKb}KB — consider minifying`); pageSizeScore -= 20; }
  if (pageSizeKb > 1000) { pageSizeIssues.push("Page HTML exceeds 1MB — significantly impacts load time"); pageSizeScore -= 30; }

  // URL structure analysis
  const urlIssues: string[] = [];
  let urlScore = 100;
  const urlPath = new URL(url).pathname;
  if (urlPath.includes("_")) { urlIssues.push("URL contains underscores — use hyphens instead"); urlScore -= 15; }
  if (urlPath.toLowerCase() !== urlPath) { urlIssues.push("URL contains uppercase letters — use lowercase"); urlScore -= 10; }
  if (/\d{4,}/.test(urlPath) && !urlPath.includes("/20")) { urlIssues.push("URL may contain unnecessary numbers/IDs"); urlScore -= 10; }

  return {
    https: { enabled: isHttps, score: isHttps ? 100 : 0 },
    wwwRedirect: { consistent: true, score: 80 },
    robotsMeta: { value: robotsMeta, indexable, score: Math.max(0, robotsScore), issues: robotsIssues },
    viewportMeta: { present: !!viewport, score: viewportScore },
    langAttribute: { value: lang, score: langScore },
    pageSize: { bytes: pageBytes, score: Math.max(0, pageSizeScore), issues: pageSizeIssues },
    urlStructure: { score: Math.max(0, urlScore), issues: urlIssues },
  };
}

function analyzeLocalSEO($: cheerio.CheerioAPI, html: string): LocalSEO {
  const bodyText = $("body").text();
  const bodyLower = bodyText.toLowerCase();

  // NAP detection (Name, Address, Phone)
  const phonePattern = /(\+?1?\s?)?(\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4})/;
  const addressPattern = /\d{1,5}\s[\w\s]{3,30}(street|st|avenue|ave|road|rd|blvd|boulevard|drive|dr|lane|ln|way|place|pl|court|ct)/i;
  const hasPhone = phonePattern.test(bodyText);
  const hasAddress = addressPattern.test(bodyText);

  const napIssues: string[] = [];
  let napScore = 100;
  if (!hasPhone) { napIssues.push("No phone number detected on page"); napScore -= 35; }
  if (!hasAddress) { napIssues.push("No physical address detected on page"); napScore -= 35; }
  // We can't easily detect business name without external data

  // Local schema
  let localSchemaType: string | null = null;
  let hasLocalSchema = false;
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const json = JSON.parse($( el).html() || "{}");
      const items = Array.isArray(json) ? json : [json];
      items.forEach(item => {
        if (item["@type"] && isLocalBusinessType(item["@type"])) {
          hasLocalSchema = true;
          localSchemaType = item["@type"];
        }
      });
    } catch { /* ignore */ }
  });
  const localSchemaIssues: string[] = [];
  let localSchemaScore = 100;
  if (!hasLocalSchema) { localSchemaIssues.push("No LocalBusiness schema markup found — add for better local visibility"); localSchemaScore = 0; }

  // Google Maps embed
  const hasGoogleMaps = html.includes("maps.google.com") || html.includes("google.com/maps") || html.includes("maps.googleapis.com");
  const mapsScore = hasGoogleMaps ? 100 : 40;

  // City/state in content
  const cityStatePattern = /\b[A-Z][a-z]+,?\s+[A-Z]{2}\b/;
  const hasCityState = cityStatePattern.test(bodyText);
  const cityStateScore = hasCityState ? 100 : 50;

  // Local keyword detection
  const localKeywordList = ["near me", "local", "nearby", "in [city]", "serving", "located in", "our location", "directions", "hours", "open today"];
  const detected = localKeywordList.filter(kw => bodyLower.includes(kw.replace("[city]", "")));
  const localKwScore = detected.length >= 3 ? 100 : detected.length >= 1 ? 65 : 30;

  return {
    napPresent: { name: true, address: hasAddress, phone: hasPhone, score: Math.max(0, napScore), issues: napIssues },
    localSchema: { present: hasLocalSchema, type: localSchemaType, score: localSchemaScore, issues: localSchemaIssues },
    googleMapsEmbed: { present: hasGoogleMaps, score: mapsScore },
    cityStateInContent: { present: hasCityState, score: cityStateScore },
    localKeywords: { detected, score: localKwScore },
  };
}

function isLocalBusinessType(type: string): boolean {
  const localTypes = [
    "LocalBusiness", "Restaurant", "Store", "MedicalBusiness", "LegalService",
    "HealthAndBeautyBusiness", "FoodEstablishment", "Dentist", "Physician",
    "RealEstateAgent", "AutoDealer", "HairSalon", "Hotel", "Lodging",
    "TouristAttraction", "GroceryStore", "HomeAndConstructionBusiness",
    "FinancialService", "InsuranceAgency", "Attorney", "AccountingService",
  ];
  return localTypes.includes(type);
}

function calcSectionScore(scores: number[]): number {
  const valid = scores.filter(s => s >= 0);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}

function collectIssues(onPage: OnPageSEO, technical: TechnicalSEO, local: LocalSEO): { topIssues: string[]; quickWins: string[] } {
  const allIssues: Array<{ issue: string; severity: "critical" | "warning" | "info" }> = [];

  // Critical issues
  if (!technical.https.enabled) allIssues.push({ issue: "Site not using HTTPS — critical for rankings and trust", severity: "critical" });
  if (!technical.robotsMeta.indexable) allIssues.push({ issue: "Page is set to noindex — not appearing in search results", severity: "critical" });
  if (!onPage.title.value) allIssues.push({ issue: "Missing title tag", severity: "critical" });
  if (onPage.headings.h1.length === 0) allIssues.push({ issue: "No H1 heading on page", severity: "critical" });
  if (!onPage.metaDescription.value) allIssues.push({ issue: "Missing meta description", severity: "critical" });

  // Warnings
  if (onPage.schema.types.length === 0) allIssues.push({ issue: "No schema markup found", severity: "warning" });
  if (!local.localSchema.present) allIssues.push({ issue: "No LocalBusiness schema markup", severity: "warning" });
  if (!local.napPresent.phone) allIssues.push({ issue: "Phone number not detected on page", severity: "warning" });
  if (!local.napPresent.address) allIssues.push({ issue: "Physical address not detected on page", severity: "warning" });
  if (!technical.viewportMeta.present) allIssues.push({ issue: "Missing viewport meta tag — poor mobile experience", severity: "warning" });
  if (onPage.images.missingAlt > 0) allIssues.push({ issue: `${onPage.images.missingAlt} image(s) missing alt text`, severity: "warning" });

  // Info
  if (!onPage.openGraph.hasOg) allIssues.push({ issue: "No Open Graph tags for social sharing", severity: "info" });
  if (!local.googleMapsEmbed.present) allIssues.push({ issue: "No Google Maps embed found", severity: "info" });
  if (!technical.langAttribute.value) allIssues.push({ issue: "HTML lang attribute missing", severity: "info" });

  const topIssues = allIssues
    .sort((a, b) => (a.severity === "critical" ? -1 : a.severity === "warning" ? 0 : 1) - (b.severity === "critical" ? -1 : b.severity === "warning" ? 0 : 1))
    .slice(0, 6)
    .map(i => i.issue);

  const quickWins = allIssues
    .filter(i => i.severity === "info" || i.severity === "warning")
    .slice(0, 4)
    .map(i => i.issue);

  return { topIssues, quickWins };
}
