import { reportAction } from "@/app/actions/moderation";
import type { ReportTargetType } from "@/lib/moderation";

/** Compact report control used on listings, job posts, offers, and ads. */
export function ReportContent({
  targetType,
  targetId,
  back,
  label = "Report",
}: {
  targetType: ReportTargetType;
  targetId: string;
  back: string;
  label?: string;
}) {
  return (
    <details className="mt-1">
      <summary
        className="cursor-pointer text-[11px] font-medium"
        style={{ color: "var(--c-text-3)", minHeight: 32, display: "flex", alignItems: "center" }}
      >
        ⚠ {label}
      </summary>
      <form action={reportAction} className="mt-1 flex flex-col gap-1.5">
        <input type="hidden" name="targetType" value={targetType} />
        <input type="hidden" name="targetId" value={targetId} />
        <input type="hidden" name="back" value={back} />
        <textarea
          name="reason"
          className="cc-input"
          style={{ minHeight: 52, paddingTop: 8, paddingBottom: 8, fontSize: 12 }}
          placeholder="What's wrong? (scam, fake, vulgar, illegal…)"
          maxLength={300}
          required
        />
        <button type="submit" className="cc-btn cc-btn-secondary" style={{ minHeight: 34, fontSize: 12 }}>
          Send report
        </button>
      </form>
    </details>
  );
}
