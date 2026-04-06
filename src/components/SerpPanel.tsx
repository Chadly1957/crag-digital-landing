"use client";

import { useState } from "react";
import type { SerpData } from "@/lib/serp";

interface SerpPanelProps {
  url: string;
}

export function SerpPanel({ url }: SerpPanelProps) {
  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiProvider, setApiProvider] = useState<"serpapi" | "valueserp">("serpapi");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SerpData | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch("/api/serp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, url, apiKey: apiKey || undefined, apiProvider, location: location || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch SERP data");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Check where this site ranks for a target keyword. Provide a SERP API key for live results.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Target Keyword *</label>
          <input
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. plumber near me"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && run()}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Location (optional)</label>
          <input
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="e.g. Austin, TX"
            value={location}
            onChange={e => setLocation(e.target.value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">API Provider</label>
          <select
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            value={apiProvider}
            onChange={e => setApiProvider(e.target.value as "serpapi" | "valueserp")}
          >
            <option value="serpapi">SerpAPI</option>
            <option value="valueserp">ValueSERP</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">API Key (leave blank for demo)</label>
          <input
            type="password"
            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            placeholder="Your API key"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
          />
        </div>
      </div>

      <button
        onClick={run}
        disabled={loading || !keyword.trim()}
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors"
      >
        {loading ? "Checking rankings..." : "Check SERP Rankings"}
      </button>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-sm">{error}</div>
      )}

      {data && (
        <div className="space-y-4">
          {data.source === "demo" ? (
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm">
              <strong>Demo mode</strong> — No API key provided. Add a SerpAPI or ValueSERP API key to get live Google rankings.
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="text-center">
                  <p className="text-3xl font-black text-gray-900">{data.targetRank ?? "—"}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Current Rank</p>
                </div>
                <div className="flex-1 border-l border-gray-200 pl-4">
                  <p className="text-sm font-semibold text-gray-800">&ldquo;{data.keyword}&rdquo;</p>
                  {data.location && <p className="text-xs text-gray-500">{data.location}</p>}
                  <p className="text-xs text-gray-500 mt-1">{data.totalResults} total results</p>
                  {data.targetRank === null && (
                    <p className="text-xs text-amber-600 mt-1">Not found in top 20 results</p>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Top 10 Results</h4>
                {data.results.slice(0, 10).map(r => (
                  <div
                    key={r.position}
                    className={`flex items-start gap-3 p-2.5 rounded-lg ${r.isTarget ? "bg-blue-50 border border-blue-200" : "bg-gray-50"}`}
                  >
                    <span className={`text-sm font-bold w-6 shrink-0 ${r.isTarget ? "text-blue-600" : "text-gray-400"}`}>#{r.position}</span>
                    <div className="min-w-0">
                      <p className={`text-sm font-medium truncate ${r.isTarget ? "text-blue-700" : "text-gray-800"}`}>{r.title}</p>
                      <p className="text-xs text-gray-400 truncate">{r.url}</p>
                    </div>
                    {r.isTarget && (
                      <span className="shrink-0 text-xs bg-blue-600 text-white px-2 py-0.5 rounded-full font-semibold">YOU</span>
                    )}
                  </div>
                ))}
              </div>

              {data.relatedKeywords.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Related Keywords</h4>
                  <div className="flex flex-wrap gap-2">
                    {data.relatedKeywords.map(kw => (
                      <button
                        key={kw}
                        onClick={() => setKeyword(kw)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-2.5 py-1 rounded-full transition-colors"
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {data.peopleAlsoAsk.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">People Also Ask</h4>
                  <ul className="space-y-1">
                    {data.peopleAlsoAsk.map(q => (
                      <li key={q} className="text-sm text-gray-700 flex items-start gap-2">
                        <span className="text-blue-500 shrink-0">?</span>{q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
