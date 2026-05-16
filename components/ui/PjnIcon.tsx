// Escudo del Poder Judicial de la Nación — versión simplificada
export default function PjnIcon({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Círculo exterior */}
      <circle cx="50" cy="50" r="47" stroke="currentColor" strokeWidth="4" fill="none" />

      {/* Corona / arco superior */}
      <path
        d="M20 38 Q50 10 80 38"
        stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round"
      />

      {/* Sol radiante */}
      <circle cx="50" cy="36" r="9" fill="currentColor" />
      {[0,40,80,120,160,200,240,280,320].map((deg, i) => {
        const r1 = 12, r2 = 17
        const rad = (deg * Math.PI) / 180
        const x1 = 50 + r1 * Math.sin(rad)
        const y1 = 36 - r1 * Math.cos(rad)
        const x2 = 50 + r2 * Math.sin(rad)
        const y2 = 36 - r2 * Math.cos(rad)
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      })}

      {/* Balanza — viga horizontal */}
      <line x1="28" y1="55" x2="72" y2="55" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Balanza — palo vertical */}
      <line x1="50" y1="52" x2="50" y2="78" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      {/* Balanza — cadenas */}
      <line x1="29" y1="55" x2="29" y2="63" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <line x1="71" y1="55" x2="71" y2="63" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Balanza — platillos */}
      <path d="M22 63 Q29 67 36 63" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M64 63 Q71 67 78 63" stroke="currentColor" strokeWidth="2.5" fill="none" strokeLinecap="round" />

      {/* Base */}
      <line x1="40" y1="78" x2="60" y2="78" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
