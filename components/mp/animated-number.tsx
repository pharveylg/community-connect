"use client";
// Adapted from motion-primitives (github.com/ibelick/motion-primitives), MIT.
// Springs a number from 0 (or previous) to the target and renders it with
// tabular numerals so the layout never shifts. Respects reduced motion.

import { useEffect, useRef, useState } from "react";
import {
  useInView,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

export function AnimatedNumber({
  value,
  className,
  prefix = "",
  suffix = "",
  locale = "en-PH",
}: {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  locale?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px" });
  const reduced = useReducedMotion();
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, { damping: 28, stiffness: 160 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, motionValue, value]);

  useEffect(() => {
    if (reduced) return;
    return spring.on("change", (latest) => {
      setDisplay(Math.round(latest));
    });
  }, [spring, reduced]);

  const shown = reduced ? value : display;

  return (
    <span ref={ref} className={className} style={{ fontVariantNumeric: "tabular-nums" }}>
      {prefix}
      {shown.toLocaleString(locale)}
      {suffix}
    </span>
  );
}
