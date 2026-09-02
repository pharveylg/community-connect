"use client";
// Adapted from motion-primitives (github.com/ibelick/motion-primitives), MIT.
// Blur + rise entrance, optionally triggered when scrolled into view.
// Respects prefers-reduced-motion.

import { useRef } from "react";
import {
  motion,
  useInView,
  useReducedMotion,
  type Variants,
} from "motion/react";

type Direction = "up" | "down" | "left" | "right" | "none";

const OFFSETS: Record<Direction, { x: number; y: number }> = {
  up: { x: 0, y: 8 },
  down: { x: 0, y: -8 },
  left: { x: 8, y: 0 },
  right: { x: -8, y: 0 },
  none: { x: 0, y: 0 },
};

export function BlurFade({
  children,
  className,
  duration = 0.45,
  delay = 0,
  direction = "up",
  inView = false,
  blur = "6px",
  margin = "-40px",
}: {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  direction?: Direction;
  inView?: boolean;
  blur?: string;
  margin?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Hooks must run unconditionally; gating happens when consuming them.
  const reduced = useReducedMotion();
  const viewed = useInView(ref, { once: true, margin: margin as never });

  const shouldAnimate = !inView || reduced || viewed;
  const offset = OFFSETS[direction];

  const variants: Variants = {
    hidden: { opacity: 0, x: offset.x, y: offset.y, filter: `blur(${blur})` },
    visible: { opacity: 1, x: 0, y: 0, filter: "blur(0px)" },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      variants={variants}
      initial={reduced ? "visible" : "hidden"}
      animate={shouldAnimate ? "visible" : "hidden"}
      transition={{ delay, duration, ease: [0.21, 0.47, 0.32, 0.98] }}
    >
      {children}
    </motion.div>
  );
}
