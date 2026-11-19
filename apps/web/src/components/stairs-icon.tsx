/** The stairs of the method: the Degrau mark. */
export function StairsIcon({ size = 20, strokeWidth = 1.75, className }: { size?: number; strokeWidth?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M3 20h4v-4h4v-4h4V8h4V4" />
    </svg>
  );
}
