"use client";

import { useEffect, useRef, useState } from "react";

type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

type BarcodeDetectorConstructor = new (options?: {
  formats: string[];
}) => BarcodeDetectorInstance;

export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function start() {
      const DetectorClass = (
        window as unknown as {
          BarcodeDetector?: BarcodeDetectorConstructor;
        }
      ).BarcodeDetector;

      if (!DetectorClass) {
        setError(
          "Браузер не поддерживает сканирование. Введи штрих-код вручную.",
        );
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
      } catch {
        setError("Нет доступа к камере. Введи штрих-код вручную.");
        return;
      }

      if (cancelled || !videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const detector = new DetectorClass({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128"],
      });

      intervalId = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0 && codes[0].rawValue) {
            onDetected(codes[0].rawValue);
          }
        } catch {
          // Detection errors on individual frames are expected; keep scanning.
        }
      }, 500);
    }

    start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950/95 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-medium">Сканер штрих-кода</h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 min-w-11 rounded-xl border border-zinc-700 px-4"
        >
          Закрыть
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          {error}
        </p>
      ) : (
        <video
          ref={videoRef}
          className="mb-4 w-full flex-1 rounded-2xl bg-zinc-900 object-cover"
          muted
          playsInline
        />
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (/^\d{6,14}$/.test(manualCode)) {
            onDetected(manualCode);
          }
        }}
        className="flex gap-2"
      >
        <input
          value={manualCode}
          onChange={(event) => setManualCode(event.target.value)}
          inputMode="numeric"
          placeholder="Или введи код вручную"
          className="min-h-11 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-4"
        />
        <button
          type="submit"
          className="min-h-11 rounded-xl bg-emerald-500 px-4 font-medium text-zinc-950"
        >
          Найти
        </button>
      </form>
    </div>
  );
}
