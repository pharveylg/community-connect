"use client";

import { useState, type FormEvent } from "react";
import { submitVerificationAction } from "@/app/actions/verifications";
import {
  VERIFICATION_ID_TYPES,
  VERIFICATION_ID_LABELS,
  type VerificationIdType,
} from "@/lib/catalog";
import { isNextRedirect } from "@/lib/client-errors";

/** Read → downscale → JPEG-compress in the browser so uploads stay small
 *  (piso-wifi friendly) and Firestore sub-documents stay far under 1 MB. */
async function compressImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("decode"));
    image.src = dataUrl;
  });
  const maxSide = 1000;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

export function VerificationForm({ profileMobile }: { profileMobile: string }) {
  const [legalName, setLegalName] = useState("");
  const [idType, setIdType] = useState<VerificationIdType>("philsys");
  const [idNumber, setIdNumber] = useState("");
  const [mobile, setMobile] = useState(profileMobile);
  const [facebookUrl, setFacebookUrl] = useState("");

  const [idPhoto, setIdPhoto] = useState<string | null>(null);
  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [busyPhoto, setBusyPhoto] = useState<"id" | "selfie" | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleFile(kind: "id" | "selfie", file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusyPhoto(kind);
    try {
      const compressed = await compressImage(file);
      if (compressed.length > 1_200_000) {
        setError("That photo is too large even after compression — try another shot.");
        return;
      }
      if (kind === "id") setIdPhoto(compressed);
      else setSelfiePhoto(compressed);
    } catch {
      setError("Couldn't read that image — please try another photo.");
    } finally {
      setBusyPhoto(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!idPhoto || !selfiePhoto) {
      setError("Please upload both photos: the ID and your selfie holding it.");
      return;
    }
    setPending(true);
    try {
      const result = await submitVerificationAction(
        { legalName, idType, idNumber, mobile, facebookUrl },
        [
          { mime: "image/jpeg", data: idPhoto.split(",")[1] ?? "" },
          { mime: "image/jpeg", data: selfiePhoto.split(",")[1] ?? "" },
        ]
      );
      if (result?.error) {
        setError(result.error);
        setPending(false);
      }
    } catch (err) {
      if (isNextRedirect(err)) return;
      setError("Something went wrong. Please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="cc-card flex flex-col gap-4">
      <div className="text-sm font-semibold">Apply for verification</div>

      {error && <p className="cc-error">{error}</p>}

      <div>
        <label className="cc-label" htmlFor="vName">
          Full legal name (as on the ID)
        </label>
        <input
          id="vName"
          className="cc-input"
          placeholder="e.g. Juan M. Dela Cruz"
          value={legalName}
          onChange={(e) => setLegalName(e.target.value)}
          maxLength={80}
          required
        />
      </div>

      <div className="flex gap-3">
        <div className="flex-1">
          <label className="cc-label" htmlFor="vIdType">
            ID type
          </label>
          <select
            id="vIdType"
            className="cc-input"
            value={idType}
            onChange={(e) => setIdType(e.target.value as VerificationIdType)}
          >
            {VERIFICATION_ID_TYPES.map((t) => (
              <option key={t} value={t}>
                {VERIFICATION_ID_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex-1">
          <label className="cc-label" htmlFor="vIdNum">
            ID number
          </label>
          <input
            id="vIdNum"
            className="cc-input"
            placeholder="As printed"
            value={idNumber}
            onChange={(e) => setIdNumber(e.target.value)}
            maxLength={40}
            required
          />
        </div>
      </div>

      <div>
        <label className="cc-label" htmlFor="vMobile">
          Contact mobile (must match your profile)
        </label>
        <input
          id="vMobile"
          type="tel"
          className="cc-input"
          placeholder="09XX XXX XXXX"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="cc-label" htmlFor="vFb">
          Facebook profile link (optional — helps us confirm identity faster)
        </label>
        <input
          id="vFb"
          className="cc-input"
          placeholder="https://facebook.com/…"
          value={facebookUrl}
          onChange={(e) => setFacebookUrl(e.target.value)}
          maxLength={200}
        />
      </div>

      <div className="flex flex-col gap-3">
        {(
          [
            ["id", "Photo of your ID", "Front of the card, all corners visible", idPhoto, setIdPhoto],
            ["selfie", "Selfie holding your ID", "Your face and the ID both clearly visible", selfiePhoto, setSelfiePhoto],
          ] as const
        ).map(([kind, label, hint, photo]) => (
          <div key={kind}>
            <span className="cc-label">{label}</span>
            {photo ? (
              <div className="relative overflow-hidden rounded-[12px]" style={{ boxShadow: "var(--shadow-border)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo} alt={label} className="h-36 w-full object-cover" />
                <button
                  type="button"
                  className="cc-btn cc-btn-secondary absolute bottom-2 right-2"
                  style={{ width: "auto", minHeight: 32, fontSize: 11.5, padding: "0 10px" }}
                  onClick={() => (kind === "id" ? setIdPhoto(null) : setSelfiePhoto(null))}
                >
                  Retake
                </button>
              </div>
            ) : (
              <label
                className="flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-[12px] text-center"
                style={{
                  border: "1.5px dashed var(--c-border-md)",
                  color: "var(--c-text-2)",
                }}
              >
                <span className="text-lg">📷</span>
                <span className="text-xs">{busyPhoto === kind ? "Processing…" : "Tap to upload"}</span>
                <span className="px-3 text-[10.5px]" style={{ color: "var(--c-text-3)" }}>
                  {hint}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFile(kind, e.target.files?.[0])}
                />
              </label>
            )}
          </div>
        ))}
      </div>

      <div className="text-[11px] leading-relaxed" style={{ color: "var(--c-text-3)" }}>
        By submitting you consent to Community Connect storing these documents
        solely for this review. They are deleted after the decision and never
        shown to other users.
      </div>

      <button type="submit" className="cc-btn cc-btn-primary" disabled={pending || busyPhoto !== null}>
        {pending ? "Submitting…" : "Submit for review"}
      </button>
    </form>
  );
}
