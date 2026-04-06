"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { NominatimResult } from "@/components/MapPicker";
import {
  processImage,
  previewFilenames,
  buildFilename,
  type GPSCoords,
  type NAPData,
} from "@/lib/image-processor";

const MapPicker = dynamic(() => import("@/components/MapPicker"), { ssr: false });

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImageEntry {
  id: string;
  file: File;
  preview: string;
  isJpeg: boolean;
}

type Tab = "gps" | "nap" | "rename";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ImageSEOPage() {
  const [images, setImages] = useState<ImageEntry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [tab, setTab] = useState<Tab>("gps");

  // GPS
  const [gps, setGPS] = useState<GPSCoords | null>(null);

  // NAP
  const [nap, setNAP] = useState<NAPData>({ name: "", address: "", phone: "", city: "", state: "" });

  // Rename
  const [prefix, setPrefix] = useState("");

  // Processing
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Build preview filenames from current state
  const previewNames = images.length > 0 && prefix
    ? previewFilenames(images.map(e => e.file), prefix, nap.city, nap.state)
    : images.map(e => e.file.name);

  const nonJpegs = images.filter(e => !e.isJpeg);

  // ── Upload handling ──────────────────────────────────────────────────────────

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter(f => f.type.startsWith("image/"));
    const entries: ImageEntry[] = arr.map(f => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      preview: URL.createObjectURL(f),
      isJpeg: /\.(jpe?g)$/i.test(f.name) || f.type === "image/jpeg",
    }));
    setImages(prev => [...prev, ...entries]);
    setDone(false);
  }

  function removeImage(id: string) {
    setImages(prev => {
      const entry = prev.find(e => e.id === id);
      if (entry) URL.revokeObjectURL(entry.preview);
      return prev.filter(e => e.id !== id);
    });
  }

  function clearAll() {
    images.forEach(e => URL.revokeObjectURL(e.preview));
    setImages([]);
    setDone(false);
    setProgress(0);
  }

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => images.forEach(e => URL.revokeObjectURL(e.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, []);

  // ── Map pin callback ─────────────────────────────────────────────────────────

  function handlePin(lat: number, lng: number, result?: NominatimResult) {
    setGPS({ lat, lng });
    if (result?.address) {
      const city = result.address.city || result.address.town || result.address.village || "";
      const state = result.address.state || "";
      // Abbreviate US states
      const stateAbbr = STATE_ABBR[state] || state.slice(0, 2).toUpperCase();
      setNAP(prev => ({
        ...prev,
        city: city || prev.city,
        state: stateAbbr || prev.state,
      }));
    }
  }

  // ── Process & Download ───────────────────────────────────────────────────────

  async function processAndDownload() {
    if (images.length === 0) return;
    setProcessing(true);
    setProgress(0);
    setDone(false);

    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      const napData: NAPData | null =
        Object.values(nap).some(v => v.trim()) ? nap : null;

      for (let i = 0; i < images.length; i++) {
        const entry = images[i];
        const ext = entry.file.name.split(".").pop() || "jpg";
        const newFilename = prefix
          ? buildFilename(prefix, nap.city, nap.state, i + 1, ext).replace(/\.[^.]+$/, "")
          : undefined;

        const result = await processImage(entry.file, {
          gps: gps || undefined,
          nap: napData || undefined,
          newFilename,
        });

        zip.file(result.filename, result.blob);
        setProgress(Math.round(((i + 1) / images.length) * 100));
      }

      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `seo-images-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (err) {
      console.error("Processing failed:", err);
    } finally {
      setProcessing(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  const hasGPS = !!gps;
  const hasNAP = Object.values(nap).some(v => v.trim());
  const hasRename = !!prefix.trim();
  const hasAny = hasGPS || hasNAP || hasRename;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-black text-sm">I</div>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">Image SEO Tool</h1>
              <p className="text-xs text-slate-400 mt-0.5">GPS Injection · NAP/IPTC · Mass Rename</p>
            </div>
          </div>
          <Link href="/" className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-slate-800">
            ← SEO Analyzer
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragging
              ? "border-violet-400 bg-violet-500/10"
              : "border-slate-600 hover:border-slate-500 hover:bg-slate-800/40"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
          <div className="text-3xl mb-3">🖼️</div>
          <p className="text-slate-300 font-semibold">Drop images here or click to upload</p>
          <p className="text-slate-500 text-sm mt-1">JPEG, PNG, WebP, HEIC — any format</p>
          <p className="text-xs text-slate-600 mt-2">GPS & IPTC injection only applies to JPEG files</p>
        </div>

        {/* Image grid */}
        {images.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-300">
                {images.length} image{images.length !== 1 ? "s" : ""} ready
              </h2>
              <button
                onClick={clearAll}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {images.map((entry, i) => (
                <div key={entry.id} className="relative group rounded-xl overflow-hidden bg-slate-800 aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.preview}
                    alt={entry.file.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                    <p className="text-xs text-slate-200 font-medium truncate">{entry.file.name}</p>
                    <p className="text-xs text-slate-400 truncate">{previewNames[i]}</p>
                  </div>
                  {/* Badge: non-JPEG */}
                  {!entry.isJpeg && (
                    <div className="absolute top-1.5 left-1.5 bg-amber-500/80 text-white text-xs px-1.5 py-0.5 rounded font-semibold">
                      {entry.file.name.split(".").pop()?.toUpperCase()}
                    </div>
                  )}
                  {/* Remove */}
                  <button
                    onClick={e => { e.stopPropagation(); removeImage(entry.id); }}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/80 text-slate-300 hover:text-white hover:bg-red-600/80 flex items-center justify-center text-xs font-bold transition-colors"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {nonJpegs.length > 0 && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                {nonJpegs.length} non-JPEG file{nonJpegs.length !== 1 ? "s" : ""} detected. GPS coordinates and IPTC/NAP data can only be embedded in JPEG files. These will be renamed only.
              </div>
            )}
          </div>
        )}

        {/* Settings tabs */}
        {images.length > 0 && (
          <div className="space-y-4">
            <div className="flex gap-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
              {([
                { id: "gps" as Tab, label: "📍 GPS Coordinates", active: hasGPS },
                { id: "nap" as Tab, label: "🏢 NAP / IPTC", active: hasNAP },
                { id: "rename" as Tab, label: "✏️ Mass Rename", active: hasRename },
              ] as { id: Tab; label: string; active: boolean }[]).map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    tab === t.id
                      ? "bg-violet-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-700"
                  }`}
                >
                  {t.label}
                  {t.active && (
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-6">
              {tab === "gps" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">GPS Coordinate Injection</h3>
                    <p className="text-xs text-slate-400">
                      Drop a pin to embed exact GPSLatitude + GPSLongitude into the JPEG EXIF data.
                      Google and other crawlers use this to confirm geographic relevance for local SEO.
                    </p>
                  </div>
                  <MapPicker onPin={handlePin} />
                  {gps && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">GPSLatitude</p>
                        <p className="text-sm font-mono text-white">{gps.lat.toFixed(6)}</p>
                      </div>
                      <div className="bg-slate-700/50 rounded-lg p-3">
                        <p className="text-xs text-slate-400 mb-1">GPSLongitude</p>
                        <p className="text-sm font-mono text-white">{gps.lng.toFixed(6)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "nap" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">NAP — IPTC Metadata</h3>
                    <p className="text-xs text-slate-400">
                      Embeds your business Name, Address, and Phone into the IPTC Caption/Abstract and By-line fields.
                      This creates a secondary signal that matches your Google Business Profile — reinforcing local SEO.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="text-xs text-slate-400 mb-1 block">Business Name</label>
                      <input
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                        placeholder="Acme HVAC Services"
                        value={nap.name}
                        onChange={e => setNAP(p => ({ ...p, name: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-slate-400 mb-1 block">Street Address</label>
                      <input
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                        placeholder="123 Main St"
                        value={nap.address}
                        onChange={e => setNAP(p => ({ ...p, address: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">City</label>
                      <input
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                        placeholder="Decatur"
                        value={nap.city}
                        onChange={e => setNAP(p => ({ ...p, city: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">State</label>
                      <input
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                        placeholder="IL"
                        value={nap.state}
                        onChange={e => setNAP(p => ({ ...p, state: e.target.value }))}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-xs text-slate-400 mb-1 block">Phone</label>
                      <input
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                        placeholder="(217) 555-1234"
                        value={nap.phone}
                        onChange={e => setNAP(p => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Preview of embedded NAP string */}
                  {(nap.name || nap.address || nap.phone) && (
                    <div className="bg-slate-700/50 rounded-lg p-3 space-y-1">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">IPTC Preview</p>
                      <p className="text-xs text-slate-300">
                        <span className="text-slate-500">Caption/Abstract: </span>
                        {[nap.name, nap.address, nap.phone].filter(Boolean).join(" | ")}
                      </p>
                      <p className="text-xs text-slate-300">
                        <span className="text-slate-500">By-line: </span>
                        {nap.name || "—"}
                      </p>
                      <p className="text-xs text-slate-300">
                        <span className="text-slate-500">City / State: </span>
                        {[nap.city, nap.state].filter(Boolean).join(", ") || "—"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {tab === "rename" && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-1">Mass Rename</h3>
                    <p className="text-xs text-slate-400">
                      Renames all images to <span className="font-mono text-slate-300">[keyword]-[city]-[state]-[n].ext</span> format.
                      Example: <span className="font-mono text-violet-300">hvac-repair-decatur-il-1.jpg</span>
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="sm:col-span-3">
                      <label className="text-xs text-slate-400 mb-1 block">Keyword / Service Prefix</label>
                      <input
                        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-violet-500"
                        placeholder="hvac-repair"
                        value={prefix}
                        onChange={e => setPrefix(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">City <span className="text-slate-600">(from NAP tab)</span></label>
                      <input
                        className="w-full bg-slate-600 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 cursor-not-allowed"
                        value={nap.city || "(set in NAP tab)"}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">State <span className="text-slate-600">(from NAP tab)</span></label>
                      <input
                        className="w-full bg-slate-600 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-300 cursor-not-allowed"
                        value={nap.state || "(set in NAP tab)"}
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Live rename preview */}
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Preview</p>
                    <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                      {images.map((entry, i) => (
                        <li key={entry.id} className="flex items-center gap-3 text-xs">
                          <span className="text-slate-500 w-4 text-right shrink-0">{i + 1}.</span>
                          <span className="text-slate-400 truncate max-w-[180px]">{entry.file.name}</span>
                          <span className="text-slate-600 shrink-0">→</span>
                          <span className="text-violet-300 font-mono truncate">{previewNames[i]}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Summary + Process button */}
        {images.length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
            {/* What will be applied */}
            <div className="flex flex-wrap gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${hasGPS ? "bg-green-500/20 text-green-300" : "bg-slate-700 text-slate-500"}`}>
                {hasGPS ? `✓ GPS: ${gps!.lat.toFixed(4)}, ${gps!.lng.toFixed(4)}` : "○ GPS not set"}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${hasNAP ? "bg-green-500/20 text-green-300" : "bg-slate-700 text-slate-500"}`}>
                {hasNAP ? `✓ NAP: ${nap.name || nap.city || "set"}` : "○ NAP not set"}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${hasRename ? "bg-green-500/20 text-green-300" : "bg-slate-700 text-slate-500"}`}>
                {hasRename ? `✓ Rename: ${prefix}-…` : "○ Rename not set"}
              </span>
            </div>

            {!hasAny && (
              <p className="text-xs text-slate-500">
                Configure GPS, NAP, or rename settings above before processing.
                You can also process with just a rename.
              </p>
            )}

            {/* Progress */}
            {processing && (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Processing images…</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {done && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30 text-green-400 text-sm font-medium">
                ✓ Done! ZIP file downloaded with {images.length} image{images.length !== 1 ? "s" : ""}.
              </div>
            )}

            <button
              onClick={processAndDownload}
              disabled={processing || images.length === 0}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              {processing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  Processing {images.length} image{images.length !== 1 ? "s" : ""}…
                </>
              ) : (
                <>
                  Download ZIP ({images.length} image{images.length !== 1 ? "s" : ""})
                </>
              )}
            </button>
          </div>
        )}

        {/* Empty state */}
        {images.length === 0 && (
          <div className="text-center py-8 text-slate-600 text-sm">
            Upload images above to get started
          </div>
        )}
      </main>
    </div>
  );
}

// ─── US State abbreviations (for auto-fill from Nominatim) ────────────────────

const STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR",
  California: "CA", Colorado: "CO", Connecticut: "CT", Delaware: "DE",
  Florida: "FL", Georgia: "GA", Hawaii: "HI", Idaho: "ID",
  Illinois: "IL", Indiana: "IN", Iowa: "IA", Kansas: "KS",
  Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS",
  Missouri: "MO", Montana: "MT", Nebraska: "NE", Nevada: "NV",
  "New Hampshire": "NH", "New Jersey": "NJ", "New Mexico": "NM",
  "New York": "NY", "North Carolina": "NC", "North Dakota": "ND",
  Ohio: "OH", Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA",
  "Rhode Island": "RI", "South Carolina": "SC", "South Dakota": "SD",
  Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV",
  Wisconsin: "WI", Wyoming: "WY",
};
