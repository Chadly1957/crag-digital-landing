"use client";

import { useState } from "react";
import { ScoreGauge } from "@/components/ScoreGauge";
import { ScoreBar } from "@/components/ScoreBar";
import { CheckItem } from "@/components/CheckItem";
import { SerpPanel } from "@/components/SerpPanel";
import type { AnalysisResult } from "@/lib/seo-analyzer";

type Tab = "overview" | "onpage" | "technical" | "local" | "serp";

export default function Home() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  async function analyze() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setTab("overview");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Analysis failed");
      setResult(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "onpage", label: "On-Page" },
    { id: "technical", label: "Technical" },
    { id: "local", label: "Local SEO" },
    { id: "serp", label: "SERP Rankings" },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <main className="max-w-4xl mx-auto px-5 py-6 space-y-5">

        {/* URL Input */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
          <label className="text-sm font-semibold text-gray-700 mb-2 block">Website URL</label>
          <div className="flex gap-3">
            <input
              type="url"
              className="flex-1 bg-white border border-gray-300 rounded-xl px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
              placeholder="https://yourbusiness.com"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => e.key === "Enter" && analyze()}
            />
            <button
              onClick={analyze}
              disabled={loading || !url.trim()}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-white font-bold text-sm transition-colors"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin inline-block" />
                  Analyzing...
                </span>
              ) : "Analyze"}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-14 space-y-3">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-gray-400 text-sm">Crawling and analyzing your site...</p>
          </div>
        )}

        {/* Results */}
        {result && (
          <div className="space-y-5">
            {/* Score hero */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center gap-8">
                <ScoreGauge score={result.overallScore} label="Overall Score" size="lg" />
                <div className="flex gap-8 flex-wrap justify-center">
                  <ScoreGauge score={result.onPageScore} label="On-Page" size="md" />
                  <ScoreGauge score={result.technicalScore} label="Technical" size="md" />
                  <ScoreGauge score={result.localScore} label="Local SEO" size="md" />
                  {result.pagespeed && (
                    <ScoreGauge score={result.pagespeed.performance} label="Performance" size="md" />
                  )}
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                <div className="text-xs text-gray-400 truncate">{result.url}</div>
                <div className="text-xs text-gray-300 shrink-0">·</div>
                <div className="text-xs text-gray-400 shrink-0">{result.onPage.wordCount.toLocaleString()} words</div>
                <div className="text-xs text-gray-300 shrink-0">·</div>
                <div className="text-xs text-gray-400 shrink-0">{result.onPage.images.total} images</div>
              </div>
            </div>

            {/* Top Issues & Quick Wins */}
            {(result.topIssues.length > 0 || result.quickWins.length > 0) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.topIssues.length > 0 && (
                  <div className="bg-red-50 border border-red-100 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-red-600 mb-3">Top Issues to Fix</h3>
                    <ul className="space-y-2">
                      {result.topIssues.map((issue, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-red-500 shrink-0 font-bold">{i + 1}.</span>
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.quickWins.length > 0 && (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5">
                    <h3 className="text-sm font-bold text-amber-600 mb-3">Quick Wins</h3>
                    <ul className="space-y-2">
                      {result.quickWins.map((win, i) => (
                        <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                          <span className="text-amber-500 shrink-0">→</span>
                          {win}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Tabs */}
            <div>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                      tab === t.id
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="mt-3 bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                {tab === "overview" && <OverviewTab result={result} />}
                {tab === "onpage" && <OnPageTab result={result} />}
                {tab === "technical" && <TechnicalTab result={result} />}
                {tab === "local" && <LocalTab result={result} />}
                {tab === "serp" && <SerpPanel url={result.url} />}
              </div>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!result && !loading && !error && (
          <div className="text-center py-12 text-gray-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold text-gray-500">Enter a URL to get started</p>
            <p className="text-sm mt-1">On-page audit · Technical SEO · Local SEO · SERP rankings</p>
          </div>
        )}
      </main>
    </div>
  );
}

function OverviewTab({ result }: { result: AnalysisResult }) {
  return (
    <div className="space-y-5">
      {result.pagespeed && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Core Web Vitals (Mobile)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "FCP", value: result.pagespeed.fcp, desc: "First Contentful Paint" },
              { label: "LCP", value: result.pagespeed.lcp, desc: "Largest Contentful Paint" },
              { label: "CLS", value: result.pagespeed.cls, desc: "Cumulative Layout Shift" },
              { label: "TBT", value: result.pagespeed.tbt, desc: "Total Blocking Time" },
            ].map(m => (
              <div key={m.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-gray-900">{m.value}</p>
                <p className="text-xs font-semibold text-gray-600">{m.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-600">Section Scores</h3>
        <ScoreBar label="On-Page SEO" score={result.onPageScore} />
        <ScoreBar label="Technical SEO" score={result.technicalScore} />
        <ScoreBar label="Local SEO" score={result.localScore} />
        {result.pagespeed && (
          <>
            <ScoreBar label="Performance" score={result.pagespeed.performance} />
            <ScoreBar label="Accessibility" score={result.pagespeed.accessibility} />
            <ScoreBar label="Best Practices" score={result.pagespeed.bestPractices} />
          </>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Word Count", value: result.onPage.wordCount.toLocaleString() },
          { label: "Images", value: String(result.onPage.images.total) },
          { label: "Internal Links", value: String(result.onPage.links.internal) },
          { label: "Schema Types", value: String(result.onPage.schema.types.length) },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function OnPageTab({ result }: { result: AnalysisResult }) {
  const { onPage } = result;
  return (
    <div className="space-y-0">
      <CheckItem
        label="Title Tag"
        passed={!!onPage.title.value && onPage.title.score >= 60}
        detail={onPage.title.value ? `"${onPage.title.value}" (${onPage.title.length} chars)` : "Missing"}
        score={onPage.title.score}
      />
      <CheckItem
        label="Meta Description"
        passed={!!onPage.metaDescription.value && onPage.metaDescription.score >= 60}
        detail={onPage.metaDescription.value ? `${onPage.metaDescription.length} chars` : "Missing"}
        score={onPage.metaDescription.score}
      />
      <CheckItem
        label="H1 Heading"
        passed={onPage.headings.h1.length === 1}
        detail={onPage.headings.h1.length > 0 ? `"${onPage.headings.h1[0]}"` : "No H1 found"}
        score={onPage.headings.score}
      />
      <CheckItem
        label={`H2 Subheadings (${onPage.headings.h2.length})`}
        passed={onPage.headings.h2.length > 0}
        detail={onPage.headings.h2.length > 0 ? onPage.headings.h2.slice(0, 2).join(" · ") : "No H2 tags found"}
      />
      <CheckItem
        label="Image Alt Text"
        passed={onPage.images.missingAlt === 0}
        detail={`${onPage.images.total} images, ${onPage.images.missingAlt} missing alt text`}
        score={onPage.images.score}
      />
      <CheckItem
        label="Canonical URL"
        passed={!!onPage.canonicalUrl.value}
        detail={onPage.canonicalUrl.value || "Not set"}
        score={onPage.canonicalUrl.score}
      />
      <CheckItem
        label="Open Graph Tags"
        passed={onPage.openGraph.hasOg && onPage.openGraph.score >= 60}
        detail={onPage.openGraph.hasOg ? `og:title, og:description${onPage.openGraph.image ? ", og:image" : ""}` : "No OG tags found"}
        score={onPage.openGraph.score}
      />
      <CheckItem
        label="Schema Markup"
        passed={onPage.schema.types.length > 0}
        detail={onPage.schema.types.length > 0 ? onPage.schema.types.join(", ") : "No schema found"}
        score={onPage.schema.score}
      />
      <CheckItem
        label="Internal Links"
        passed={onPage.links.internal >= 3}
        detail={`${onPage.links.internal} internal · ${onPage.links.external} external`}
        score={onPage.links.score}
      />
      {onPage.keywords.density > 0 && (
        <CheckItem
          label="Keyword Density"
          passed={onPage.keywords.density >= 0.5 && onPage.keywords.density <= 3}
          detail={`${onPage.keywords.density}% density`}
          score={onPage.keywords.score}
        />
      )}
    </div>
  );
}

function TechnicalTab({ result }: { result: AnalysisResult }) {
  const { technical, pagespeed } = result;
  return (
    <div className="space-y-0">
      <CheckItem
        label="HTTPS / SSL"
        passed={technical.https.enabled}
        detail={technical.https.enabled ? "Site is served over HTTPS" : "Site is not using HTTPS"}
        score={technical.https.score}
      />
      <CheckItem
        label="Mobile Viewport"
        passed={technical.viewportMeta.present}
        detail={technical.viewportMeta.present ? "Viewport meta tag found" : "No viewport meta tag — poor mobile experience"}
        score={technical.viewportMeta.score}
      />
      <CheckItem
        label="Robots Meta"
        passed={technical.robotsMeta.indexable}
        detail={technical.robotsMeta.value || "Not set (indexable by default)"}
        score={technical.robotsMeta.score}
      />
      <CheckItem
        label="HTML Lang Attribute"
        passed={!!technical.langAttribute.value}
        detail={technical.langAttribute.value || "No lang attribute on <html>"}
        score={technical.langAttribute.score}
      />
      <CheckItem
        label="URL Structure"
        passed={technical.urlStructure.score >= 80}
        detail={technical.urlStructure.issues.length > 0 ? technical.urlStructure.issues[0] : "URL structure looks clean"}
        score={technical.urlStructure.score}
      />
      <CheckItem
        label="Page Size"
        passed={technical.pageSize.score >= 80}
        detail={`${Math.round(technical.pageSize.bytes / 1024)}KB HTML`}
        score={technical.pageSize.score}
      />

      {pagespeed && (
        <>
          <div className="pt-4 pb-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">PageSpeed Insights</p>
          </div>
          <CheckItem label="Performance" passed={pagespeed.performance >= 50} detail={`Score: ${pagespeed.performance}/100`} score={pagespeed.performance} />
          <CheckItem label="Accessibility" passed={pagespeed.accessibility >= 80} detail={`Score: ${pagespeed.accessibility}/100`} score={pagespeed.accessibility} />
          <CheckItem label="Best Practices" passed={pagespeed.bestPractices >= 80} detail={`Score: ${pagespeed.bestPractices}/100`} score={pagespeed.bestPractices} />
          <CheckItem label="PSI SEO Score" passed={pagespeed.seo >= 80} detail={`Score: ${pagespeed.seo}/100`} score={pagespeed.seo} />
        </>
      )}
    </div>
  );
}

function LocalTab({ result }: { result: AnalysisResult }) {
  const { local } = result;
  return (
    <div className="space-y-4">
      <div className="space-y-0">
        <CheckItem
          label="Phone Number on Page"
          passed={local.napPresent.phone}
          detail={local.napPresent.phone ? "Phone number detected" : "No phone number found — add for NAP consistency"}
          score={local.napPresent.phone ? 100 : 0}
        />
        <CheckItem
          label="Physical Address on Page"
          passed={local.napPresent.address}
          detail={local.napPresent.address ? "Street address detected" : "No street address found"}
          score={local.napPresent.address ? 100 : 0}
        />
        <CheckItem
          label="LocalBusiness Schema"
          passed={local.localSchema.present}
          detail={local.localSchema.present ? `Type: ${local.localSchema.type}` : "No LocalBusiness schema — critical for local SEO"}
          score={local.localSchema.score}
        />
        <CheckItem
          label="Google Maps Embed"
          passed={local.googleMapsEmbed.present}
          detail={local.googleMapsEmbed.present ? "Google Maps embed found" : "No maps embed — helps users find your location"}
          score={local.googleMapsEmbed.score}
        />
        <CheckItem
          label="City/State in Content"
          passed={local.cityStateInContent.present}
          detail={local.cityStateInContent.present ? "Location reference found in content" : "No city/state detected — mention your location"}
          score={local.cityStateInContent.score}
        />
        <CheckItem
          label="Local Keywords"
          passed={local.localKeywords.detected.length >= 2}
          detail={local.localKeywords.detected.length > 0 ? `Found: ${local.localKeywords.detected.join(", ")}` : "No local keyword signals found"}
          score={local.localKeywords.score}
        />
      </div>

      <div className="p-4 rounded-xl bg-blue-50 border border-blue-100">
        <h4 className="text-sm font-semibold text-blue-700 mb-3">Local SEO Action Checklist</h4>
        <ul className="space-y-1.5 text-sm text-gray-700">
          {[
            { done: local.localSchema.present, text: "Add LocalBusiness JSON-LD schema to every page" },
            { done: local.napPresent.phone && local.napPresent.address, text: "Ensure NAP (Name, Address, Phone) is consistent across site" },
            { done: local.googleMapsEmbed.present, text: "Embed Google Maps on contact/location page" },
            { done: false, text: "Claim and optimize Google Business Profile" },
            { done: false, text: "Build local citations on Yelp, YellowPages, BBB" },
            { done: false, text: "Earn reviews on Google Business Profile" },
          ].map(({ done, text }, i) => (
            <li key={i} className={`flex items-start gap-2 ${done ? "line-through text-gray-400" : ""}`}>
              <span className={done ? "text-green-500" : "text-gray-400"}>{done ? "✓" : "○"}</span>
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
