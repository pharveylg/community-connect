// Adapted from motion-primitives (github.com/ibelick/motion-primitives), MIT.
// Subtle dotted background texture (pure SVG, no client JS).

export function DotPattern({
  className,
  width = 24,
  height = 24,
  cx = 1.2,
  cy = 1.2,
  cr = 1.2,
}: {
  className?: string;
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  cr?: number;
}) {
  const id = `cc-dot-${width}-${height}-${cx}-${cy}-${cr}`;
  return (
    <svg
      aria-hidden="true"
      className={className}
      style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
    >
      <defs>
        <pattern id={id} width={width} height={height} patternUnits="userSpaceOnUse">
          <circle cx={cx} cy={cy} r={cr} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
