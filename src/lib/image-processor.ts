import piexif from "piexifjs";

export interface GPSCoords {
  lat: number;
  lng: number;
}

export interface NAPData {
  name: string;
  address: string;
  phone: string;
  city: string;
  state: string;
}

export interface ProcessOptions {
  gps?: GPSCoords | null;
  nap?: NAPData | null;
  newFilename?: string; // without extension
}

export interface ProcessedImage {
  blob: Blob;
  filename: string;
  originalName: string;
  sizeBytes: number;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function uint8ArrayToBlob(data: Uint8Array, mimeType = "image/jpeg"): Blob {
  // Copy into a plain ArrayBuffer to avoid SharedArrayBuffer type incompatibility
  const buf = new ArrayBuffer(data.byteLength);
  new Uint8Array(buf).set(data);
  return new Blob([buf], { type: mimeType });
}

function decimalToDMS(decimal: number): [[number, number], [number, number], [number, number]] {
  const d = Math.floor(decimal);
  const mFloat = (decimal - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return [[d, 1], [m, 1], [Math.round(s * 10000), 10000]];
}

// ─── GPS EXIF Injection ───────────────────────────────────────────────────────

function injectGPS(dataUrl: string, coords: GPSCoords): string {
  try {
    let exifObj = piexif.load(dataUrl);

    // Ensure GPS dict exists
    if (!exifObj.GPS) exifObj = { ...exifObj, GPS: {} };

    const { lat, lng } = coords;
    exifObj.GPS[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? "N" : "S";
    exifObj.GPS[piexif.GPSIFD.GPSLatitude] = decimalToDMS(Math.abs(lat));
    exifObj.GPS[piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? "E" : "W";
    exifObj.GPS[piexif.GPSIFD.GPSLongitude] = decimalToDMS(Math.abs(lng));
    exifObj.GPS[piexif.GPSIFD.GPSAltitudeRef] = 0;
    exifObj.GPS[piexif.GPSIFD.GPSAltitude] = [0, 1];

    const exifBytes = piexif.dump(exifObj);
    return piexif.insert(exifBytes, dataUrl);
  } catch {
    // If EXIF fails (e.g., image has no existing EXIF block), try with empty exif
    try {
      const gpsDict: Record<number, unknown> = {};
      const { lat, lng } = coords;
      gpsDict[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? "N" : "S";
      gpsDict[piexif.GPSIFD.GPSLatitude] = decimalToDMS(Math.abs(lat));
      gpsDict[piexif.GPSIFD.GPSLongitudeRef] = lng >= 0 ? "E" : "W";
      gpsDict[piexif.GPSIFD.GPSLongitude] = decimalToDMS(Math.abs(lng));
      gpsDict[piexif.GPSIFD.GPSAltitudeRef] = 0;
      gpsDict[piexif.GPSIFD.GPSAltitude] = [0, 1];
      const fallbackExif = { "0th": {}, Exif: {}, GPS: gpsDict, "1st": {} };
      const exifBytes = piexif.dump(fallbackExif);
      return piexif.insert(exifBytes, dataUrl);
    } catch {
      return dataUrl; // Return unchanged if injection fails
    }
  }
}

// ─── IPTC / APP13 Injection ───────────────────────────────────────────────────

/**
 * Builds a JPEG APP13 segment containing IPTC-NAA metadata.
 *
 * Structure:
 *   FF ED  — APP13 marker
 *   XX XX  — segment length (big-endian, includes this 2-byte field)
 *   "Photoshop 3.0\0"  — 14-byte header
 *   8BIM block:
 *     "8BIM" + resource ID 0x0404 + pascal name + data length + IPTC datasets
 *       Dataset: 0x1C 0x02 <tag> <2-byte len> <data>
 */
function buildIPTCSegment(nap: NAPData): Uint8Array | null {
  const enc = new TextEncoder();

  const datasets: { tag: number; value: string }[] = [];

  if (nap.name) datasets.push({ tag: 80, value: nap.name });       // By-line
  if (nap.city) datasets.push({ tag: 90, value: nap.city });       // City
  if (nap.state) datasets.push({ tag: 95, value: nap.state });     // Province/State
  if (nap.phone) datasets.push({ tag: 110, value: nap.phone });    // Credit (phone)

  // Caption/Abstract = full NAP string — the key local SEO signal
  const napFull = [nap.name, nap.address, nap.phone].filter(Boolean).join(" | ");
  if (napFull) datasets.push({ tag: 120, value: napFull });

  // Object name = "{name} | {city}, {state}"
  const objectName = [nap.name, [nap.city, nap.state].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" | ");
  if (objectName) datasets.push({ tag: 5, value: objectName });    // Object Name

  if (datasets.length === 0) return null;

  // Build raw IPTC dataset bytes
  const iptcBytes: number[] = [];
  for (const { tag, value } of datasets) {
    const encoded = enc.encode(value);
    if (encoded.length === 0 || encoded.length > 0xffff) continue;
    iptcBytes.push(
      0x1c, 0x02, tag,
      (encoded.length >> 8) & 0xff,
      encoded.length & 0xff,
      ...encoded
    );
  }

  if (iptcBytes.length === 0) return null;

  const iptcData = new Uint8Array(iptcBytes);

  // Build 8BIM block
  const bim: number[] = [
    0x38, 0x42, 0x49, 0x4d,                        // "8BIM"
    0x04, 0x04,                                     // Resource ID = IPTC-NAA
    0x00, 0x00,                                     // Pascal string name (empty, even-padded)
    (iptcData.length >> 24) & 0xff,
    (iptcData.length >> 16) & 0xff,
    (iptcData.length >> 8) & 0xff,
    iptcData.length & 0xff,
    ...iptcData,
  ];
  if (bim.length % 2 !== 0) bim.push(0x00); // Pad to even

  // Photoshop 3.0 header
  const psHeader = enc.encode("Photoshop 3.0\0"); // 14 bytes

  const segContent = new Uint8Array([...psHeader, ...bim]);
  const segLength = segContent.length + 2; // +2 for length field itself

  return new Uint8Array([
    0xff, 0xed,                         // APP13 marker
    (segLength >> 8) & 0xff,
    segLength & 0xff,
    ...segContent,
  ]);
}

/**
 * Injects (or replaces) the APP13/IPTC segment in a JPEG byte array.
 * Inserts after SOI, before all other markers.
 */
function injectIPTC(jpegData: Uint8Array, iptcSegment: Uint8Array): Uint8Array {
  if (
    jpegData.length < 2 ||
    jpegData[0] !== 0xff ||
    jpegData[1] !== 0xd8
  ) {
    return jpegData; // Not a valid JPEG
  }

  // Walk the JPEG and collect byte ranges of existing APP13 segments to drop
  const existingApp13Ranges: { start: number; end: number }[] = [];
  let i = 2;
  while (i < jpegData.length - 3) {
    if (jpegData[i] !== 0xff) break;
    const marker = jpegData[i + 1];
    if (marker === 0xd9 || marker === 0xda) break; // EOI / SOS

    const segLen = (jpegData[i + 2] << 8) | jpegData[i + 3];
    if (segLen < 2) break; // malformed

    if (marker === 0xed) {
      existingApp13Ranges.push({ start: i, end: i + 2 + segLen });
    }

    i += 2 + segLen;
  }

  // Build output: SOI + our APP13 + rest (skipping old APP13 blocks)
  const parts: Uint8Array[] = [];
  parts.push(jpegData.slice(0, 2)); // SOI
  parts.push(iptcSegment);

  let pos = 2;
  for (const range of existingApp13Ranges) {
    if (range.start > pos) parts.push(jpegData.slice(pos, range.start));
    pos = range.end;
  }
  parts.push(jpegData.slice(pos));

  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

// ─── Rename ───────────────────────────────────────────────────────────────────

export function buildFilename(
  prefix: string,
  city: string,
  state: string,
  index: number,
  ext: string
): string {
  const slug = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

  const parts = [prefix, city, state].map(slug).filter(Boolean);
  parts.push(String(index));
  return parts.join("-") + "." + ext.toLowerCase().replace(/^\./, "");
}

export function previewFilenames(
  files: File[],
  prefix: string,
  city: string,
  state: string
): string[] {
  return files.map((f, i) => {
    const ext = f.name.split(".").pop() || "jpg";
    return buildFilename(prefix, city, state, i + 1, ext);
  });
}

// ─── Main Processor ───────────────────────────────────────────────────────────

export async function processImage(
  file: File,
  options: ProcessOptions
): Promise<ProcessedImage> {
  const { gps, nap, newFilename } = options;
  const isJpeg = /\.(jpe?g)$/i.test(file.name) || file.type === "image/jpeg";

  const origExt = file.name.split(".").pop() || "jpg";
  const finalFilename = newFilename
    ? `${newFilename}.${isJpeg ? "jpg" : origExt}`
    : file.name;

  // Non-JPEG: skip metadata injection, just rename
  if (!isJpeg) {
    return {
      blob: file,
      filename: finalFilename,
      originalName: file.name,
      sizeBytes: file.size,
    };
  }

  // JPEG: apply GPS + IPTC
  let dataUrl = await fileToDataUrl(file);

  if (gps) {
    dataUrl = injectGPS(dataUrl, gps);
  }

  let jpegData = dataUrlToUint8Array(dataUrl);

  if (nap) {
    const iptcSegment = buildIPTCSegment(nap);
    if (iptcSegment) {
      jpegData = injectIPTC(jpegData, iptcSegment);
    }
  }

  const blob = uint8ArrayToBlob(jpegData, "image/jpeg");

  return {
    blob,
    filename: finalFilename,
    originalName: file.name,
    sizeBytes: blob.size,
  };
}
