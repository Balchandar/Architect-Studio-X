export default function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b6cf6" />
          <stop offset="1" stopColor="#4cc9f0" />
        </linearGradient>
      </defs>
      <rect x="0.5" y="0.5" width="31" height="31" rx="7" fill="#0f1117" stroke="#262a3d" />
      <path
        d="M8 22 L16 8 L24 22 M11 17 L21 17"
        stroke="url(#lg)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
