import React, { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X } from "lucide-react";

// Thin wrapper around html5-qrcode (already a dependency, previously unused).
// Renders a live camera feed in a fixed-size box and calls onScan(text) once
// with whatever raw string was encoded in the QR — caller decides how to
// interpret it (may be a plain event ID or a full join URL, see Events.jsx).
export default function QrScanner({ onScan, onClose }) {
  const containerId = "qr-reader-box";
  const scannerRef = useRef(null);
  const [error, setError] = useState("");
  const hasScannedRef = useRef(false);

  useEffect(() => {
    const scanner = new Html5Qrcode(containerId);
    scannerRef.current = scanner;
    // html5-qrcode's start() is async, but React 18 StrictMode in dev
    // double-invokes effects (mount -> unmount -> mount) to surface bugs
    // like this one: the synthetic "unmount" can fire before start() has
    // actually finished starting the camera, and stop() THROWS
    // SYNCHRONOUSLY (not a rejected promise) if called while the scanner
    // isn't actually running yet — so a plain .catch() on stop() can't
    // catch it. Tracking whether start() has actually resolved, and
    // deferring the stop-on-unmount until it has, avoids that throw
    // instead of just swallowing the resulting console error.
    let isMounted = true;
    let hasStarted = false;

    const stopScanner = () => {
      if (!hasStarted) return;
      try {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      } catch {
        // stop() can also throw synchronously if the camera stream ended
        // on its own (e.g. permission revoked mid-scan) — nothing to clean
        // up in that case either.
      }
    };

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 220 },
        (decodedText) => {
          // Guard against the camera firing multiple decodes for the same
          // code before we've had a chance to stop it.
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;
          onScan(decodedText);
        },
        () => {} // per-frame "no QR found yet" callback — nothing to do
      )
      .then(() => {
        hasStarted = true;
        // Component was unmounted while start() was still pending —
        // stop it now that it's actually running instead of leaving the
        // camera stream open.
        if (!isMounted) stopScanner();
      })
      .catch(() => {
        if (isMounted) {
          setError(
            "Couldn't access the camera. Check camera permissions in your browser settings, or enter the code manually below."
          );
        }
      });

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [onScan]);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-ink/50">Point your camera at the QR code</p>
        <button type="button" onClick={onClose} className="text-ink/40 hover:text-ink/70">
          <X size={16} />
        </button>
      </div>
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        <div id={containerId} className="rounded-xl overflow-hidden" />
      )}
    </div>
  );
}