// Isotipo de Claude — rayos diagonales en abanico (Anthropic brand)
export default function ClaudeIcon({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-label="Claude AI"
    >
      {/* 5 barras diagonales en abanico, estilo logo de Anthropic */}
      <rect x="3.5"  y="6"   width="2.2" height="13" rx="1.1" transform="rotate(-30 3.5  6)"  />
      <rect x="7"    y="3.5" width="2.2" height="15" rx="1.1" transform="rotate(-15 7    3.5)" />
      <rect x="10.9" y="2.5" width="2.2" height="16" rx="1.1" />
      <rect x="14.8" y="3.5" width="2.2" height="15" rx="1.1" transform="rotate(15  14.8 3.5)" />
      <rect x="18.3" y="6"   width="2.2" height="13" rx="1.1" transform="rotate(30  18.3 6)"  />
    </svg>
  )
}
