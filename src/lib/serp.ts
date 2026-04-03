export interface SerpResult {
  position: number;
  url: string;
  title: string;
  snippet: string;
  isTarget: boolean;
}

export interface SerpData {
  keyword: string;
  location?: string;
  results: SerpResult[];
  targetRank: number | null;
  targetDomain: string;
  totalResults: string;
  relatedKeywords: string[];
  peopleAlsoAsk: string[];
  source: "serpapi" | "valueserp" | "demo";
}

export async function fetchSerpData(
  keyword: string,
  targetUrl: string,
  apiKey?: string,
  apiProvider: "serpapi" | "valueserp" = "serpapi",
  location?: string
): Promise<SerpData> {
  const targetDomain = extractDomain(targetUrl);

  if (!apiKey) {
    return buildDemoSerp(keyword, targetDomain, location);
  }

  try {
    if (apiProvider === "serpapi") {
      return await fetchViaSerpApi(keyword, targetDomain, apiKey, location);
    } else {
      return await fetchViaValueSerp(keyword, targetDomain, apiKey, location);
    }
  } catch {
    return buildDemoSerp(keyword, targetDomain, location);
  }
}

async function fetchViaSerpApi(keyword: string, targetDomain: string, apiKey: string, location?: string): Promise<SerpData> {
  const params = new URLSearchParams({
    q: keyword,
    api_key: apiKey,
    engine: "google",
    num: "20",
    hl: "en",
    gl: "us",
    ...(location ? { location } : {}),
  });

  const res = await fetch(`https://serpapi.com/search?${params}`);
  if (!res.ok) throw new Error("SerpAPI error");
  const data = await res.json();

  const organicResults: SerpResult[] = (data.organic_results || []).slice(0, 15).map((r: {position: number; link: string; title: string; snippet: string}, i: number) => ({
    position: r.position || i + 1,
    url: r.link || "",
    title: r.title || "",
    snippet: r.snippet || "",
    isTarget: extractDomain(r.link || "").includes(targetDomain) || targetDomain.includes(extractDomain(r.link || "")),
  }));

  const targetResult = organicResults.find(r => r.isTarget);

  return {
    keyword,
    location,
    results: organicResults,
    targetRank: targetResult?.position || null,
    targetDomain,
    totalResults: data.search_information?.total_results || "N/A",
    relatedKeywords: (data.related_searches || []).slice(0, 6).map((r: {query: string}) => r.query),
    peopleAlsoAsk: (data.related_questions || []).slice(0, 4).map((r: {question: string}) => r.question),
    source: "serpapi",
  };
}

async function fetchViaValueSerp(keyword: string, targetDomain: string, apiKey: string, location?: string): Promise<SerpData> {
  const params = new URLSearchParams({
    q: keyword,
    api_key: apiKey,
    num: "20",
    ...(location ? { location } : {}),
  });

  const res = await fetch(`https://api.valueserp.com/search?${params}`);
  if (!res.ok) throw new Error("ValueSERP error");
  const data = await res.json();

  const organicResults: SerpResult[] = (data.organic_results || []).slice(0, 15).map((r: {position: number; link: string; title: string; snippet: string}, i: number) => ({
    position: r.position || i + 1,
    url: r.link || "",
    title: r.title || "",
    snippet: r.snippet || "",
    isTarget: extractDomain(r.link || "").includes(targetDomain) || targetDomain.includes(extractDomain(r.link || "")),
  }));

  const targetResult = organicResults.find(r => r.isTarget);

  return {
    keyword,
    location,
    results: organicResults,
    targetRank: targetResult?.position || null,
    targetDomain,
    totalResults: "N/A",
    relatedKeywords: (data.related_searches || []).slice(0, 6).map((r: {query: string}) => r.query),
    peopleAlsoAsk: (data.related_questions || []).slice(0, 4).map((r: {question: string}) => r.question),
    source: "valueserp",
  };
}

function buildDemoSerp(keyword: string, targetDomain: string, location?: string): SerpData {
  // Demo mode — returns placeholder data with a note
  return {
    keyword,
    location,
    results: [],
    targetRank: null,
    targetDomain,
    totalResults: "Demo mode",
    relatedKeywords: [],
    peopleAlsoAsk: [],
    source: "demo",
  };
}

function extractDomain(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  }
}
