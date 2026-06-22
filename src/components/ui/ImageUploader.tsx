"use client";

import { useRef, useState, useCallback } from "react";
import { Upload, X, ImageIcon, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "dfho82dac";
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "transporte_core_unsigned";
const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

interface ImageUploaderProps {
  /** URL actual de la imagen */
  value: string;
  /** Callback cuando la imagen es subida — devuelve URL de Cloudinary */
  onChange: (url: string) => void;
  /** Ancho máximo de salida en px (para Canvas antes de subir) */
  maxWidth: number;
  /** Alto máximo de salida en px */
  maxHeight: number;
  /** Calidad WebP 0-1 (default 0.82) */
  quality?: number;
  /** Etiqueta del campo */
  label: string;
  /** Descripción adicional */
  hint?: string;
  /** Modo de recorte: "cover" (rellena) | "contain" (ajusta) */
  fit?: "cover" | "contain";
  /** Carpeta en Cloudinary donde se guardará */
  folder?: string;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/** Procesa la imagen con Canvas API y devuelve un Blob WebP */
async function processImageToBlob(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  fit: "cover" | "contain"
): Promise<{ blob: Blob; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (ev) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d")!;

        if (fit === "cover") {
          const targetRatio = maxWidth / maxHeight;
          const srcRatio = width / height;
          let srcX = 0, srcY = 0, srcW = width, srcH = height;

          if (srcRatio > targetRatio) {
            srcW = Math.round(height * targetRatio);
            srcX = Math.round((width - srcW) / 2);
          } else {
            srcH = Math.round(width / targetRatio);
            srcY = Math.round((height - srcH) / 2);
          }

          canvas.width = maxWidth;
          canvas.height = maxHeight;
          ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, maxWidth, maxHeight);
          width = maxWidth;
          height = maxHeight;
        } else {
          // contain: escalar sin recortar
          if (width > maxWidth) { height = Math.round(height * (maxWidth / width)); width = maxWidth; }
          if (height > maxHeight) { width = Math.round(width * (maxHeight / height)); height = maxHeight; }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
        }

        canvas.toBlob(
          (blob) => {
            if (!blob) { reject(new Error("No se pudo procesar la imagen")); return; }
            resolve({ blob, width, height });
          },
          "image/webp",
          quality
        );
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

/** Sube un Blob a Cloudinary y devuelve la URL segura */
async function uploadToCloudinary(
  blob: Blob,
  folder: string,
  filename: string
): Promise<string> {
  const formData = new FormData();
  formData.append("file", blob, `${filename}.webp`);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", `transporte_core/${folder}`);

  const res = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Error Cloudinary: ${res.status}`);
  }
  const data = await res.json();
  return data.secure_url as string;
}

export default function ImageUploader({
  value,
  onChange,
  maxWidth,
  maxHeight,
  quality = 0.82,
  label,
  hint,
  fit = "cover",
  folder = "general",
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "processing" | "uploading" | "done" | "error">("idle");
  const [info, setInfo] = useState<{ w: number; h: number; size: number; url: string } | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState("");

  const processAndUpload = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("Solo se aceptan archivos de imagen (JPG, PNG, WebP, GIF)");
        setStatus("error");
        return;
      }

      setStatus("processing");
      setErrorMsg("");
      setProgress("Procesando imagen...");

      try {
        // 1. Procesar con Canvas
        const { blob, width, height } = await processImageToBlob(file, maxWidth, maxHeight, quality, fit);

        setStatus("uploading");
        setProgress("Subiendo a Cloudinary...");

        // 2. Subir a Cloudinary
        const filename = `${folder}_${Date.now()}`;
        const url = await uploadToCloudinary(blob, folder, filename);

        setInfo({ w: width, h: height, size: blob.size, url });
        setStatus("done");
        setProgress("");
        onChange(url);
      } catch (e: any) {
        setErrorMsg(e.message || "Error al subir la imagen");
        setStatus("error");
        setProgress("");
      }
    },
    [maxWidth, maxHeight, quality, fit, folder, onChange]
  );

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processAndUpload(file);
    e.target.value = "";
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processAndUpload(file);
  }

  const isLoading = status === "processing" || status === "uploading";
  const hasImage = Boolean(value);

  return (
    <div className="space-y-2">
      <label className="text-xs text-slate-400 font-medium block">{label}</label>

      {/* Zona de drop / preview */}
      <div
        onClick={() => !isLoading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); if (!isLoading) setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`relative rounded-xl border-2 border-dashed transition-all overflow-hidden ${
          isLoading
            ? "cursor-wait border-indigo-500/50 bg-indigo-500/5"
            : dragOver
              ? "cursor-copy border-indigo-400 bg-indigo-500/10"
              : hasImage
                ? "cursor-pointer border-white/10 bg-slate-800/40 hover:border-white/20"
                : "cursor-pointer border-slate-700 bg-slate-800/40 hover:border-indigo-500/50 hover:bg-slate-800/60"
        }`}
        style={{ minHeight: fit === "cover" ? "120px" : "80px" }}
      >
        {/* Overlay de carga */}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/85 z-10 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-7 h-7 text-indigo-400 animate-spin" />
              <span className="text-xs text-slate-300 font-medium">{progress}</span>
            </div>
          </div>
        )}

        {hasImage ? (
          <div className="relative group">
            <img
              src={value}
              alt={label}
              className="w-full object-cover"
              style={{ maxHeight: fit === "cover" ? "120px" : "80px", objectFit: fit }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {/* Overlay hover */}
            {!isLoading && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-white text-xs font-medium flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg">
                  <Upload className="w-4 h-4" /> Cambiar imagen
                </span>
              </div>
            )}
            {/* Botón quitar */}
            {!isLoading && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onChange(""); setInfo(null); setStatus("idle"); setErrorMsg(""); }}
                className="absolute top-2 right-2 p-1 rounded-full bg-red-500/80 hover:bg-red-500 text-white transition-colors z-10"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-2 py-6 px-4 text-center">
            <div className="p-3 rounded-xl bg-slate-700/50">
              <ImageIcon className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <p className="text-sm text-slate-300 font-medium">
                Arrastra una imagen o <span className="text-indigo-400">haz clic</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                JPG, PNG, WebP, GIF — Se optimizará y subirá a Cloudinary
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Estado: éxito */}
      {status === "done" && info && (
        <div className="flex items-center gap-2 text-xs text-emerald-400">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span>
            Subida exitosa · {info.w}×{info.h}px · {formatBytes(info.size)} · WebP · Cloudinary ✓
          </span>
        </div>
      )}

      {/* Estado: error */}
      {status === "error" && errorMsg && (
        <div className="flex items-start gap-2 text-xs text-red-400">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Hint */}
      {hint && status === "idle" && (
        <p className="text-xs text-slate-600">{hint}</p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
