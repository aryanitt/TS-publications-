/** Hand-drawn brand mark for TS Publication */

const S = {
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export default function TSPublicationDoodleLogo({ size = 36, className = "" }) {
  const radius = size >= 40 ? "rounded-xl" : "rounded-lg";

  return (
    <div
      className={`relative shrink-0 overflow-hidden border-2 border-slate-200/90 bg-gradient-to-br from-rose-50 via-white to-amber-50 shadow-[0_2px_8px_rgba(15,23,42,0.06)] ${radius} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      <svg viewBox="0 0 80 80" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* background blobs */}
        <circle cx="14" cy="16" r="9" fill="#fecdd3" fillOpacity="0.45" />
        <circle cx="66" cy="58" r="10" fill="#fde68a" fillOpacity="0.4" />
        <circle cx="58" cy="14" r="5" fill="#bfdbfe" fillOpacity="0.55" />

        {/* open book — publication motif */}
        <path
          d="M18 58 C18 38 22 28 40 26 C58 28 62 38 62 58 L62 64 C62 66 60 68 58 68 L22 68 C20 68 18 66 18 64 Z"
          fill="#fff1f2"
          stroke="#334155"
          strokeWidth="2.2"
          {...S}
        />
        <path d="M40 26 L40 68" stroke="#94a3b8" strokeWidth="1.8" strokeDasharray="2 3" {...S} />

        {/* left page lines */}
        <path d="M24 38 L36 37" stroke="#cbd5e1" strokeWidth="1.5" {...S} />
        <path d="M23 44 L35 43" stroke="#cbd5e1" strokeWidth="1.5" {...S} />
        <path d="M22 50 L34 49" stroke="#cbd5e1" strokeWidth="1.5" {...S} />

        {/* right page — TS letters doodled */}
        <text
          x="46"
          y="48"
          fontSize="14"
          fontWeight="800"
          fill="#be123c"
          fontFamily="system-ui, sans-serif"
          transform="rotate(-4 46 48)"
        >
          TS
        </text>
        <path d="M44 52 L56 51" stroke="#fda4af" strokeWidth="1.5" {...S} />

        {/* bookmark ribbon */}
        <path
          d="M52 24 L56 24 L54 36 L52 34 L50 36 Z"
          fill="#e11d48"
          stroke="#9f1239"
          strokeWidth="1.2"
          {...S}
        />

        {/* pen doodle */}
        <path
          d="M58 18 L66 10 L68 12 L60 20 Z"
          fill="#6366f1"
          stroke="#4338ca"
          strokeWidth="1.5"
          {...S}
        />
        <path d="M58 18 L54 22" stroke="#4338ca" strokeWidth="2" {...S} />
        <circle cx="66" cy="10" r="1.8" fill="#c7d2fe" stroke="#4338ca" strokeWidth="1" />

        {/* sparkle stars */}
        <path d="M12 52 l1.2 2.4 -2.4 1.2 2.4 1.2 -1.2 2.4 1.2 -2.4 2.4 -1.2 -2.4 -1.2z" fill="#fbbf24" fillOpacity="0.75" />
        <path d="M68 42 l1 2 -2 1 2 1 -1 2 -1 -2 -2 -1 2 -1z" fill="#f472b6" fillOpacity="0.7" />
      </svg>
    </div>
  );
}
