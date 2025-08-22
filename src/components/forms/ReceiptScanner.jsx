import { useState, useRef } from "react";
import { Camera, Upload, Loader2, X } from "lucide-react";
import Tesseract from "tesseract.js";

export const ReceiptScanner = ({ onScanComplete, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewImage, setPreviewImage] = useState(null);
  const fileInputRef = useRef(null);

  const processImage = async (imageFile) => {
    setIsProcessing(true);
    setProgress(0);

    try {
      const result = await Tesseract.recognize(imageFile, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const extractedData = parseReceiptText(result.data.text);
      onScanComplete(extractedData);
    } catch (error) {
      console.error("OCR Error:", error);
      alert(
        `Failed to process the image: ${error.message}. Please try again or enter manually.`
      );
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const parseReceiptText = (text) => {
    const lines = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    // Extract total amount (look for patterns like $XX.XX, Total: XX.XX, etc.)
    const totalPatterns = [
      /(?:total|amount|sum)[\s:]*\$?(\d+\.?\d{0,2})/gi,
      /\$(\d+\.\d{2})/g,
      /(\d+\.\d{2})/g,
    ];

    let amount = "";
    for (const pattern of totalPatterns) {
      const matches = text.match(pattern);
      if (matches && matches.length > 0) {
        // Get the last match which is often the total
        const lastMatch = matches[matches.length - 1];
        const numberMatch = lastMatch.match(/(\d+\.?\d{0,2})/);
        if (numberMatch) {
          amount = numberMatch[1];
          break;
        }
      }
    }

    // Extract vendor/store name (usually one of the first few lines)
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

    // Extract date (look for date patterns)
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{4})/,
      /(\d{4}-\d{2}-\d{2})/,
      /(\d{1,2}-\d{1,2}-\d{4})/,
    ];

    let date = new Date().toISOString().split("T")[0]; // Default to today
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
      amount: amount || "",
      vendor: vendor || "",
      date: date,
      description: vendor ? `Purchase from ${vendor}` : "Scanned receipt",
      category: "Office supplies",
      notes: "Extracted from receipt scan",
    };
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewImage(e.target.result);
      };
      reader.readAsDataURL(file);
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
          <p className="text-sm text-gray-500">{progress}% complete</p>
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
