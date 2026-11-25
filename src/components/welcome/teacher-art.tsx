/**
 * "Meet your teacher" picture: an open Quran on a wooden rehal with a small
 * microphone, for voice-only classes. No people (the owner finds drawn figures
 * unprofessional). Colours follow the landing page palette.
 */
export function TeacherArt() {
  return (
    <svg viewBox="0 0 220 220" width="100%" height="100%" aria-hidden="true">
      <defs>
        <radialGradient id="ta-glow" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#FFF8E6" />
          <stop offset="100%" stopColor="#F1E4CC" />
        </radialGradient>
        <linearGradient id="ta-wood" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C08A54" />
          <stop offset="100%" stopColor="#8E5F33" />
        </linearGradient>
        <linearGradient id="ta-page" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#FFFDF7" />
          <stop offset="100%" stopColor="#F3EADA" />
        </linearGradient>
        <linearGradient id="ta-page-r" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#FFFDF7" />
          <stop offset="100%" stopColor="#F3EADA" />
        </linearGradient>
      </defs>

      <circle cx="110" cy="110" r="110" fill="url(#ta-glow)" />

      {/* soft stars */}
      <g fill="#E3B04B">
        <path d="M44 52 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3z" opacity=".7" />
        <path d="M176 46 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" opacity=".55" />
        <circle cx="162" cy="74" r="2.2" opacity=".6" />
        <circle cx="60" cy="86" r="1.8" opacity=".5" />
      </g>

      {/* shadow */}
      <ellipse cx="104" cy="188" rx="62" ry="7" fill="#2E3A2F" opacity=".12" />

      {/* rehal: two crossed boards */}
      <g>
        <path d="M58 186 L66 186 L140 118 L130 112 Z" fill="url(#ta-wood)" />
        <path d="M150 186 L142 186 L70 118 L80 112 Z" fill="url(#ta-wood)" />
        <path
          d="M58 186 L66 186 L140 118 L130 112 Z"
          fill="none"
          stroke="#7A5029"
          strokeWidth="1.2"
        />
        <path
          d="M150 186 L142 186 L70 118 L80 112 Z"
          fill="none"
          stroke="#7A5029"
          strokeWidth="1.2"
        />
        <circle cx="104" cy="150" r="3" fill="#E3B04B" />
      </g>

      {/* open mushaf: green cover, two pages */}
      <path d="M36 106 L104 132 L172 106 L168 98 L104 122 L40 98 Z" fill="#2E3A2F" />
      <path d="M42 98 Q70 92 104 120 L104 80 Q72 56 46 62 Z" fill="url(#ta-page)" />
      <path d="M166 98 Q138 92 104 120 L104 80 Q136 56 162 62 Z" fill="url(#ta-page-r)" />
      <path d="M104 80 L104 120" stroke="#D8C7A6" strokeWidth="1.4" />

      {/* lines of text */}
      <g stroke="#B9A47E" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M54 74 Q76 70 96 84" />
        <path d="M53 82 Q76 78 96 92" />
        <path d="M52 90 Q76 86 96 100" />
        <path d="M154 74 Q132 70 112 84" />
        <path d="M155 82 Q132 78 112 92" />
        <path d="M156 90 Q132 86 112 100" />
      </g>
      {/* little gold ayah markers */}
      <circle cx="80" cy="76.5" r="2.4" fill="#E3B04B" />
      <circle cx="128" cy="85" r="2.4" fill="#E3B04B" />

      {/* microphone with sound waves */}
      <g>
        <path
          d="M178 116 q10 10 0 20 M186 110 q16 16 0 32"
          stroke="#6B7F5B"
          strokeWidth="2.4"
          strokeLinecap="round"
          fill="none"
          opacity=".75"
        />
        <rect x="160" y="112" width="14" height="28" rx="7" fill="#2E3A2F" />
        <g stroke="#6B7F5B" strokeWidth="1.2">
          <path d="M162 120 H172" />
          <path d="M162 125 H172" />
          <path d="M162 130 H172" />
        </g>
        <path
          d="M156 132 q0 14 11 14 q11 0 11 -14"
          stroke="#2E3A2F"
          strokeWidth="2.4"
          fill="none"
          strokeLinecap="round"
        />
        <path d="M167 146 V172" stroke="#2E3A2F" strokeWidth="2.4" />
        <rect x="157" y="172" width="20" height="5" rx="2.5" fill="#2E3A2F" />
      </g>
    </svg>
  )
}
