// The Kanto Case illustration: a Poké Ball-latched crate, drawn inline so
// it themes with the page and costs no image request.
export default function CaseArt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 110 76" aria-hidden="true">
      <defs>
        <linearGradient id="case-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3A4256" />
          <stop offset="1" stopColor="#1A1F2B" />
        </linearGradient>
        <linearGradient id="case-lid" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FF5560" />
          <stop offset="1" stopColor="#C21D2A" />
        </linearGradient>
      </defs>
      <rect x="4" y="10" width="102" height="62" rx="8" fill="url(#case-body)" stroke="#F7C548" strokeOpacity=".55" />
      <rect x="4" y="10" width="102" height="26" rx="8" fill="url(#case-lid)" />
      <rect x="4" y="30" width="102" height="8" fill="#12151C" />
      <circle cx="55" cy="34" r="12" fill="#12151C" />
      <circle cx="55" cy="34" r="8" fill="#ECEFF6" />
      <circle cx="55" cy="34" r="3.5" fill="#12151C" />
      <rect x="38" y="4" width="34" height="8" rx="3" fill="#2A3242" />
      <path d="M14 62h18M78 62h18" stroke="#F7C548" strokeOpacity=".6" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
