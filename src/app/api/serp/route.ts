import { NextRequest, NextResponse } from "next/server";
import { fetchSerpData } from "@/lib/serp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { keyword, url, apiKey, apiProvider, location } = body;

    if (!keyword || !url) {
      return NextResponse.json({ error: "keyword and url are required" }, { status: 400 });
    }

    const data = await fetchSerpData(
      keyword,
      url,
      apiKey || undefined,
      apiProvider || "serpapi",
      location || undefined
    );

    return NextResponse.json(data);
  } catch (err) {
    console.error("SERP error:", err);
    return NextResponse.json({ error: "Failed to fetch SERP data" }, { status: 500 });
  }
}
