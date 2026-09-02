// Adapted from motion-primitives (github.com/ibelick/motion-primitives), MIT.
// CSS-keyframe infinite marquee: GPU-friendly transform loop, pauses on hover,
// and halts entirely under prefers-reduced-motion.

import { cn } from "@/lib/cn";

export function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = true,
  duration = 36,
}: {
  children: React.ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  duration?: number;
}) {
  return (
    <div
      className={cn("group flex w-full overflow-hidden", className)}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
      }}
    >
      <div
        className={cn(
          "flex w-max shrink-0 items-stretch gap-3 pr-3",
          "[animation:cc-marquee_var(--marquee-duration)_linear_infinite]",
          reverse && "[animation-direction:reverse]",
          pauseOnHover && "group-hover:[animation-play-state:paused]"
        )}
        style={{ "--marquee-duration": `${duration}s` } as React.CSSProperties}
      >
        {children}
        {children}
      </div>
    </div>
  );
}
