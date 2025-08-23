import { useState, useRef } from "react";
import { Camera, Upload, Loader2, X } from "lucide-react";
import Tesseract from "tesseract.js";

// --- downscale utility (add this above the component) ---
// --- downscale utility (add above the component) ---
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

      const result = await Tesseract.recognize(prepped, "eng", {
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

      const extracted = parseReceiptText(result?.data?.text || "");

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

  const parseReceiptText = (text) => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    const totalPatterns = [
      /(?:total|amount|sum)[\s:]*\$?(\d+\.?\d{0,2})/gi,
      /\$(\d+\.\d{2})/g,
      /(\d+\.\d{2})/g,
    ];

    let amount = "";
    for (const pattern of totalPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        const lastMatch = matches[matches.length - 1];
        const numberMatch = lastMatch.match(/(\d+\.?\d{0,2})/);
        if (numberMatch) {
          amount = numberMatch[1];
          break;
        }
      }
    }

    let vendor = "";
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      if (
        line.length > 3 &&
        line.length < 50 &&
        !line.includes("$") &&
        !line.match(/^\d+/) &&
        !line.toLowerCase().includes("receipt")
      ) {
        vendor = line;
        break;
      }
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

    const parsed = parseFloat((amount || "").replace(/[^0-9.]/g, ""));
    return {
      amount: Number.isFinite(parsed) ? parsed : 0,
      vendor: vendor || "",
      date: date,
      description: vendor ? `Purchase from ${vendor}` : "Scanned receipt",
      category: "Supplies",
      notes: "Extracted from receipt scan",
    };
  };

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
