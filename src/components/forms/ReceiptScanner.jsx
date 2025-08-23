import { useState, useRef } from "react";
import { Camera, Upload, Loader2, X } from "lucide-react";
import Tesseract from "tesseract.js";

async function downscaleImage(file, { maxDim = 1600, quality = 0.85 } = {}) {
  if (!file || !file.type?.startsWith("image/")) return file;

  const loadImage = async (blob) => {
    if ("createImageBitmap" in window) {
      try {
        return await createImageBitmap(blob, {
          imageOrientation: "from-image",
        });
      } catch {
        /* fallback below */
      }
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.decoding = "async";
    const url = URL.createObjectURL(blob);
    try {
      await new Promise((res, rej) => {
        img.onload = res;
        img.onerror = rej;
        img.src = url;
      });
      return img;
    } finally {
      URL.revokeObjectURL(url);
    }
  };

  const img = await loadImage(file);
  const w = img.width,
    h = img.height;
  const scale = Math.min(1, maxDim / Math.max(w, h));
  if (scale === 1) return file;

  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement("canvas");
  canvas.width = tw;
  canvas.height = th;

  const ctx = canvas.getContext("2d", { alpha: false, desynchronized: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, tw, th);

  const blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b || file), "image/jpeg", quality)
  );
  return blob;
}

async function preprocessForOCR(blob) {
  const img = await (async () => {
    if ("createImageBitmap" in window) return await createImageBitmap(blob);
    const im = new Image(); const url = URL.createObjectURL(blob);
    await new Promise((res, rej) => (im.onload = res, im.onerror = rej, im.src = url));
    URL.revokeObjectURL(url); return im;
  })();

  const w = img.width, h = img.height;
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d", { alpha: false });

  ctx.drawImage(img, 0, 0, w, h);
  const imgData = ctx.getImageData(0, 0, w, h);
  const d = imgData.data;

  const contrast = 1.25; // tweak 1.15–1.4
  const thresh = 190;    // tweak 170–210

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    let y = 0.2126 * r + 0.7152 * g + 0.0722 * b;           // grayscale luminance
    y = (y - 128) * contrast + 128;                         // add contrast
    const v = y > thresh ? 255 : 0;                         // simple threshold
    d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);
  return await new Promise(res => canvas.toBlob(b => res(b || blob), "image/png", 1));
}


const TOTAL_ANCHORS = [
  "TOTAL",
  "AMOUNT DUE",
  "BALANCE DUE",
  "GRAND TOTAL",
  "TOTAL DUE",
  "AMOUNT PAYABLE",
  "AMOUNT DUE NOW",
];

const MONEY_RE = /(?:\$?\s*)(\d{1,3}(?:,\d{3})*\.\d{2})\b/;

function normalizeMoney(s) {
  const m = s.match(MONEY_RE);
  if (!m) return null;
  return parseFloat(m[1].replace(/,/g, ""));
}

function pickTotalFromLayout(result) {
  const { lines, words } = result?.data || {};
  if (!Array.isArray(lines) || !lines.length) return null;

  // index words per line, sorted left→right
  const lineWords = {};
  for (const w of words || []) {
    if (!lineWords[w.line]) lineWords[w.line] = [];
    lineWords[w.line].push(w);
  }
  for (const k in lineWords) {
    lineWords[k].sort((a, b) => (a.bbox?.x0 ?? 0) - (b.bbox?.x0 ?? 0));
  }

  // 1) anchor scan
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const text = (line.text || "").replace(/\s+/g, " ").trim();
    const hit = TOTAL_ANCHORS.some((a) => text.toUpperCase().includes(a));
    if (!hit) continue;

    const wordsInLine = lineWords[line.line] || [];
    // find rightmost anchor edge
    let anchorX = null;
    for (const w of wordsInLine) {
      const up = (w.text || "").toUpperCase();
      if (TOTAL_ANCHORS.some((a) => up.includes(a))) {
        anchorX = Math.max(anchorX ?? 0, w.bbox?.x1 ?? 0);
      }
    }

    // same line, to the right
    const toRight = wordsInLine.filter(
      (w) => (w.bbox?.x0 ?? 0) > (anchorX ?? 0)
    );
    for (const w of toRight) {
      const val = normalizeMoney(w.text || "");
      if (Number.isFinite(val)) return val;
    }

    // stacked on next line
    const next = lines[i + 1];
    if (next) {
      const nextWords = lineWords[next.line] || [];
      for (const w of nextWords) {
        const val = normalizeMoney(w.text || "");
        if (Number.isFinite(val)) return val;
      }
    }
  }

  // 2) fallback: largest money number on page
  let best = null;
  for (const w of words || []) {
    const val = normalizeMoney(w.text || "");
    if (Number.isFinite(val) && (best == null || val > best)) best = val;
  }
  return best;
}

// Add near the top of the file:
const VENDOR_STOPWORDS = new Set([
  "INVOICE",
  "TAX INVOICE",
  "STATEMENT",
  "RECEIPT",
  "SALES RECEIPT",
  "BILL",
  "ESTIMATE",
  "QUOTE",
  "ORDER",
  "PURCHASE ORDER",
]);

function pickVendorFromLayout(result) {
  const { lines } = result?.data || {};
  if (!Array.isArray(lines) || !lines.length) return "";

  // Find page height to limit search to upper area
  const pageHeight = Math.max(...lines.map((l) => l.bbox?.y1 ?? 0));
  const topCut = pageHeight * 0.35; // top 35%

  // Collect candidate lines in the top band
  const candidates = lines
    .filter((l) => l?.text?.trim())
    .filter((l) => (l.bbox?.y0 ?? Infinity) <= topCut)
    .map((l) => ({
      text: l.text.trim(),
      height: Math.max(1, (l.bbox?.y1 ?? 0) - (l.bbox?.y0 ?? 0)),
    }))
    .filter((c) => {
      const t = c.text.toUpperCase();
      // filter: not just numbers/symbols, no prices, not a stopword
      const looksLikeName = /[A-Z]/.test(t) && !/\$\s*\d/.test(t);
      const notStop = ![...VENDOR_STOPWORDS].some((sw) => t.includes(sw));
      return looksLikeName && notStop && t.length >= 3 && t.length <= 50;
    });

  if (!candidates.length) return "";

  // Prefer the biggest text; tie-breaker: shorter text (logos are short)
  candidates.sort(
    (a, b) => b.height - a.height || a.text.length - b.text.length
  );
  return candidates[0].text;
}

export const ReceiptScanner = ({ onScanComplete, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  const [statusText, setStatusText] = useState("");
  const [ocrError, setOcrError] = useState(null);
  const [lastFile, setLastFile] = useState(null);

  const fileInputRef = useRef(null);

  // DRY + optimized: downscale -> OCR -> parse -> hand off
  const processImage = async (imageFile) => {
    setIsProcessing(true);
    setProgress(0);
    setOcrError(null);
    setStatusText("preparing…");
    setProgress(5);
    setLastFile(imageFile);

    try {
      const prepped = await downscaleImage(imageFile, {
        maxDim: 1600,
        quality: 0.85,
      });
      const hiContrast = await preprocessForOCR(prepped);

      const result = await Tesseract.recognize(hiContrast, "eng", {
        tessedit_pageseg_mode: 6,
        preserve_interword_spaces: "1",
        logger: (m) => {
          if (m?.status) setStatusText(m.status);
          if (
            m?.status === "recognizing text" &&
            typeof m.progress === "number"
          ) {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const extracted = parseReceiptText(result?.data?.text || "", result);

      const parsedAmount = parseFloat(
        (extracted.amount ?? "").toString().replace(/[,$]/g, "")
      );
      const safeEntry = {
        ...extracted,
        amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
      };

      onScanComplete?.(safeEntry);

      setStatusText("done");
    } catch (err) {
      console.error("OCR Error:", err);
      setOcrError(err?.message || "OCR failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const retryOCR = async () => {
    if (!lastFile) return;
    setProgress(5);
    await processImage(lastFile);
  };

  const parseReceiptText = (text, ocrResult) => {
    let amount = pickTotalFromLayout(ocrResult);
    if (!Number.isFinite(amount)) {
      const fallback = (
        text.match(/\$?\s*\d{1,3}(?:,\d{3})*\.\d{2}\b/g) || []
      ).map((s) => parseFloat(s.replace(/[^0-9.]/g, "")));
      amount = fallback.length ? fallback[fallback.length - 1] : 0;
    }

    let vendor = pickVendorFromLayout(ocrResult);
    if (!vendor) {
      vendor = fallbackVendorFromTopLines(text);
    }

    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{1,2}-\d{1,2}-\d{4})/,
    ];

    let date = new Date().toISOString().split("T")[0];
    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const parsedDate = new Date(match[1]);
          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().split("T")[0];
            break;
          }
        } catch {
          // Continue with default date
        }
      }
    }

    return {
      amount: Number.isFinite(amount) ? amount : 0,
      vendor,
      date: date,
      description: vendor ? `Purchase from ${vendor}` : "Scanned receipt",
      category: "Supplies",
      notes: "Extracted from receipt scan",
    };
  };
  // Simple fallback if pickVendorFromLayout() doesn't return anything
  function fallbackVendorFromTopLines(text) {
    const lines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    for (const l of lines.slice(0, 6)) {
      // check first ~6 lines
      const upper = l.toUpperCase();
      if (
        upper.length > 2 &&
        !/^\d/.test(upper) && // skip lines starting with numbers
        !upper.includes("INVOICE") &&
        !upper.includes("STATEMENT") &&
        !upper.includes("RECEIPT") &&
        !upper.includes("TOTAL") &&
        !/^\$?\d+/.test(upper) // skip amounts
      ) {
        return l;
      }
    }

    return "";
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
      setLastFile(file);
      processImage(file);
    }
  };

  const handleCameraCapture = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Scan Receipt</h2>
        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
          <X className="h-6 w-6" />
        </button>
      </div>

      {!previewImage && !isProcessing && (
        <div className="text-center py-8">
          <div className="mb-4">
            <Camera className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Scan or Upload Receipt
            </h3>
            <p className="text-gray-500 mb-6">
              Take a photo or upload an image of your receipt to automatically
              extract information
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={handleCameraCapture}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 flex items-center gap-2 transition-colors"
            >
              <Upload className="h-4 w-4" />
              Upload Image
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {previewImage && (
        <div className="mb-4">
          <img
            src={previewImage}
            alt="Receipt preview"
            className="max-w-full h-48 object-contain mx-auto border rounded"
          />
        </div>
      )}

      {isProcessing && (
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Processing Receipt...
          </h3>
          <p className="text-gray-500 mb-4">
            Extracting text from your receipt
          </p>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-500">{statusText}</p>
        </div>
      )}

      {ocrError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="flex items-center justify-between gap-2">
            <span>{ocrError}</span>
            <div className="flex gap-2">
              {!isProcessing && (
                <button
                  onClick={retryOCR}
                  className="rounded px-2 py-1 text-red-700 hover:bg-red-100"
                >
                  Retry
                </button>
              )}
              <button
                onClick={() => setOcrError(null)}
                className="rounded px-2 py-1 text-gray-700 hover:bg-gray-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500 mt-4">
        <p>
          <strong>Tip:</strong> For best results, ensure the receipt is well-lit
          and all text is clearly visible.
        </p>
      </div>
    </div>
  );
};
