"use client";

import { useId } from "react";

interface DragonMarkProps {
  /** 0-100. Drives cracks, eye colour and the fading aura. */
  hpPct: number;
  reduced: boolean;
  className?: string;
}

/**
 * The Procrastination Dragon: symmetric skull and wings, drawn as one half and
 * mirrored. Damage is expressed through cracks and dimming rather than colour
 * shouting, so it reads as an emblem instead of a cartoon.
 */
export default function DragonMark({ hpPct, reduced, className }: DragonMarkProps) {
  const uid = useId().replace(/:/g, "");
  const hp = Math.max(0, Math.min(100, hpPct));
  const damage = 100 - hp;
  const defeated = hp <= 0;
  const eye = defeated ? "#6b7280" : hp <= 34 ? "#ff6b5c" : "#f5a524";
  const aura = defeated ? 0.05 : 0.1 + (hp / 100) * 0.22;
  const scale = 0.94 + (hp / 100) * 0.06;

  const wing =
    "M104 92C130 66 158 46 190 32C188 56 182 74 172 92C168 76 160 68 150 66C154 82 152 96 146 108C140 94 130 88 120 90Z";
  const horn = "M118 56C132 42 146 34 158 30C150 42 140 54 128 64Z";
  const skull =
    "M100 42C113 42 124 51 128 64C132 78 127 90 118 100C112 108 106 117 100 126C94 117 88 108 82 100C73 90 68 78 72 64C76 51 87 42 100 42Z";

  const cracks =
    (damage > 20 ? "M100 52L95 66L102 75" : "") +
    (damage > 45 ? " M118 62L110 73L117 85" : "") +
    (damage > 70 ? " M82 64L89 77L83 89 M104 96L100 110" : "");

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={defeated ? "Procrastination Dragon, defeated" : "Procrastination Dragon"}
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}s`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4b1d24" />
          <stop offset="0.55" stopColor="#24101a" />
          <stop offset="1" stopColor="#0c070d" />
        </linearGradient>
        <linearGradient id={`${uid}w`} x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor="#3a1420" stopOpacity="0.92" />
          <stop offset="1" stopColor="#0e0810" stopOpacity="0.72" />
        </linearGradient>
        <radialGradient id={`${uid}g`}>
          <stop offset="0" stopColor="#f5a524" stopOpacity={aura} />
          <stop offset="0.6" stopColor="#c2410c" stopOpacity={aura * 0.45} />
          <stop offset="1" stopColor="#c2410c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}h`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#1b0f16" />
          <stop offset="1" stopColor="#6b3a2e" />
        </linearGradient>
      </defs>

      <ellipse cx="100" cy="98" rx="92" ry="88" fill={`url(#${uid}g)`} />

      {/* Rotating sigil ring — HUD, not decoration. */}
      <g opacity={defeated ? 0.25 : 0.55}>
        <circle
          cx="100"
          cy="100"
          r="86"
          fill="none"
          stroke="#e2725b"
          strokeOpacity="0.22"
          strokeWidth="0.8"
        />
        <circle
          cx="100"
          cy="100"
          r="86"
          fill="none"
          stroke="#f5a524"
          strokeOpacity="0.4"
          strokeWidth="0.8"
          strokeDasharray="1.5 13"
          strokeLinecap="round"
        >
          {!reduced && !defeated && (
            <animateTransform
              attributeName="transform"
              type="rotate"
              from="0 100 100"
              to="360 100 100"
              dur="46s"
              repeatCount="indefinite"
            />
          )}
        </circle>
      </g>

      <g transform={`translate(100 108) scale(${scale}) translate(-100 -108)`}>
        {/* Wings: one half drawn, both halves rendered. */}
        <g fill={`url(#${uid}w)`} stroke="#e2725b" strokeOpacity="0.45" strokeWidth="0.7">
          <path d={wing} />
          <path d={wing} transform="translate(200 0) scale(-1 1)" />
        </g>
        <g stroke="#e2725b" strokeOpacity="0.3" strokeWidth="0.6" fill="none">
          <path d="M112 92C134 74 158 58 186 36" />
          <path d="M112 92C130 82 146 78 164 78" />
          <path d="M112 92C126 90 138 96 148 106" />
          <path d="M88 92C66 74 42 58 14 36" transform="translate(200 0) scale(-1 1)" />
          <path d="M88 92C70 82 54 78 36 78" transform="translate(200 0) scale(-1 1)" />
        </g>

        {/* Horns */}
        <g fill={`url(#${uid}h)`} stroke="#e2725b" strokeOpacity="0.35" strokeWidth="0.6">
          <path d={horn} />
          <path d={horn} transform="translate(200 0) scale(-1 1)" />
        </g>

        {/* Spine ridge */}
        <path
          d="M100 30L104 44L96 44Z"
          fill="#8a4a35"
          opacity={defeated ? 0.35 : 0.85}
        />

        {/* Skull */}
        <path
          d={skull}
          fill={`url(#${uid}s)`}
          stroke="#e2725b"
          strokeOpacity={defeated ? 0.3 : 0.62}
          strokeWidth="1"
        />
        <path
          d="M78 70C88 62 100 63 100 70C100 63 112 62 122 70"
          fill="none"
          stroke="#e2725b"
          strokeOpacity="0.5"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
        <path
          d="M100 78L100 104"
          stroke="#0a060a"
          strokeOpacity="0.55"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M88 108L100 116L112 108"
          fill="none"
          stroke="#e2725b"
          strokeOpacity="0.45"
          strokeWidth="0.9"
          strokeLinejoin="round"
        />

        {/* Eyes */}
        {!defeated && (
          <g filter={`url(#${uid}e)`}>
            <path d="M84 78L96 82L84 86Z" fill={eye} />
            <path d="M116 78L104 82L116 86Z" fill={eye} />
          </g>
        )}
        {defeated && (
          <g stroke="#6b7280" strokeOpacity="0.7" strokeWidth="1.1" strokeLinecap="round">
            <path d="M85 79L95 85M95 79L85 85" />
            <path d="M105 79L115 85M115 79L105 85" />
          </g>
        )}

        {/* Damage */}
        {cracks && (
          <path
            d={cracks}
            fill="none"
            stroke="#f5a524"
            strokeOpacity={0.35 + (damage / 100) * 0.5}
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        )}
      </g>

      {/* Smoke */}
      {!defeated && (
        <g stroke="#e5e7eb" strokeOpacity={0.1 + (hp / 100) * 0.14} strokeWidth="0.9" fill="none">
          <path d="M92 126C86 138 96 146 88 158">
            {!reduced && (
              <animate
                attributeName="stroke-opacity"
                values="0.06;0.2;0.06"
                dur="6s"
                repeatCount="indefinite"
              />
            )}
          </path>
          <path d="M110 128C118 140 108 148 118 160">
            {!reduced && (
              <animate
                attributeName="stroke-opacity"
                values="0.05;0.16;0.05"
                dur="7.5s"
                repeatCount="indefinite"
              />
            )}
          </path>
        </g>
      )}

      <defs>
        <filter id={`${uid}e`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="2.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
}
