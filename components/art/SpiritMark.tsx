"use client";

import { useId } from "react";

interface SpiritMarkProps {
  /** 0-5, matches PET_STAGES. Drives facets, shards, halo and motes. */
  stage: number;
  /** 0-100 companion energy; only affects the inner light. */
  energy: number;
  reduced: boolean;
  className?: string;
}

/**
 * The companion as a faceted spirit: a suspended crystal core with orbiting
 * shards. It grows by geometry — more facets, a halo, ascending motes — rather
 * than by adding cartoon features, so it reads as an emblem at every stage.
 */
export default function SpiritMark({ stage, energy, reduced, className }: SpiritMarkProps) {
  const uid = useId().replace(/:/g, "");
  const s = Math.max(0, Math.min(5, stage));
  const lit = Math.max(0, Math.min(100, energy)) / 100;
  const scale = 0.62 + s * 0.076;
  const open = s >= 2;

  /* One half of the crystal, mirrored for the other side. */
  const crown = "M100 40L126 96L100 108Z";
  const pavilion = "M100 108L126 96L100 158Z";
  const shard = "M150 78L162 100L150 124L142 100Z";

  return (
    <svg
      viewBox="0 0 200 200"
      role="img"
      aria-label={`Companion, stage ${s + 1} of 6`}
      className={className}
    >
      <defs>
        <linearGradient id={`${uid}c`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="var(--accent)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--accent2, var(--accent))" stopOpacity="0.75" />
        </linearGradient>
        <linearGradient id={`${uid}d`} x1="1" y1="0" x2="0.2" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--accent2, var(--accent))" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id={`${uid}h`}>
          <stop offset="0" stopColor="var(--accent)" stopOpacity={0.1 + lit * 0.3} />
          <stop offset="0.55" stopColor="var(--accent)" stopOpacity={0.05 + lit * 0.1} />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}k`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent2, var(--accent))" stopOpacity="0.9" />
          <stop offset="1" stopColor="var(--accent2, var(--accent))" stopOpacity="0.1" />
        </linearGradient>
      </defs>

      <circle cx="100" cy="100" r="86" fill={`url(#${uid}h)`} />

      {/* Orbit ring: appears with the wings, doubles at the final stage. */}
      {s >= 3 && (
        <g opacity={s >= 5 ? 0.7 : 0.45}>
          <ellipse
            cx="100"
            cy="100"
            rx="74"
            ry="24"
            fill="none"
            stroke="var(--accent)"
            strokeOpacity="0.35"
            strokeWidth="0.9"
            transform="rotate(-18 100 100)"
          />
          <g transform="rotate(-18 100 100)">
            <circle cx="174" cy="100" r="2.4" fill="var(--accent)">
              {!reduced && (
                <animateTransform
                  attributeName="transform"
                  type="rotate"
                  from="0 100 100"
                  to="360 100 100"
                  dur="18s"
                  repeatCount="indefinite"
                />
              )}
            </circle>
          </g>
          {s >= 5 && (
            <>
              <ellipse
                cx="100"
                cy="100"
                rx="62"
                ry="20"
                fill="none"
                stroke="var(--accent2, var(--accent))"
                strokeOpacity="0.3"
                strokeWidth="0.8"
                transform="rotate(24 100 100)"
              />
              <circle cx="138" cy="66" r="1.8" fill="var(--accent2, var(--accent))" opacity="0.8" />
            </>
          )}
        </g>
      )}

      <g transform={`translate(100 100) scale(${scale}) translate(-100 -100)`}>
        {/* Side shards grow out of the core from stage 3. */}
        {s >= 3 && (
          <g fill={`url(#${uid}d)`} stroke="var(--accent)" strokeOpacity="0.4" strokeWidth="0.6">
            <path d={shard} />
            <path d={shard} transform="translate(200 0) scale(-1 1)" />
          </g>
        )}

        {/* Core: crown and pavilion, each half mirrored. */}
        <g stroke="var(--accent)" strokeOpacity="0.55" strokeWidth="0.7" strokeLinejoin="round">
          <path d={crown} fill={`url(#${uid}c)`} />
          <path d={crown} fill={`url(#${uid}d)`} transform="translate(200 0) scale(-1 1)" />
          <path d={pavilion} fill={`url(#${uid}d)`} />
          <path d={pavilion} fill={`url(#${uid}c)`} transform="translate(200 0) scale(-1 1)" opacity="0.8" />
        </g>

        {/* Girdle facet lines — the hand-cut detail that keeps it looking forged. */}
        <g fill="none" stroke="#e9edf5" strokeOpacity="0.18" strokeWidth="0.7">
          <path d="M74 96L100 108L126 96" />
          <path d="M100 40L100 158" />
        </g>

        {/* Inner light: a slit of energy rather than eyes. */}
        <path
          d="M100 62C104 76 104 88 100 102C96 88 96 76 100 62Z"
          fill={`url(#${uid}k)`}
          opacity={open ? 0.55 + lit * 0.45 : 0.25}
        >
          {!reduced && open && (
            <animate
              attributeName="opacity"
              values={`${0.35 + lit * 0.3};${0.6 + lit * 0.4};${0.35 + lit * 0.3}`}
              dur="4.2s"
              repeatCount="indefinite"
            />
          )}
        </path>

        {/* Shell seams for the two egg stages. */}
        {s <= 1 && (
          <path
            d="M100 40L88 74L104 92L90 120L102 146"
            fill="none"
            stroke="var(--accent2, var(--accent))"
            strokeOpacity={s === 0 ? 0.25 : 0.75}
            strokeWidth={s === 0 ? 0.8 : 1.4}
            strokeLinecap="round"
          />
        )}

        {/* Crest for the drake and wyrm stages. */}
        {s >= 4 && (
          <g fill="var(--accent2, var(--accent))" opacity="0.85">
            <path d="M100 26L104 42L96 42Z" />
            <path d="M88 32L94 44L84 44Z" opacity="0.7" />
            <path d="M112 32L116 44L106 44Z" opacity="0.7" />
          </g>
        )}
      </g>

      {/* Ascending motes at full ascension. */}
      {s >= 5 &&
        !reduced &&
        [0, 1, 2].map((index) => (
          <circle
            key={index}
            cx={78 + index * 22}
            cy="150"
            r={1.6 - index * 0.2}
            fill="var(--accent)"
            opacity="0"
          >
            <animate
              attributeName="cy"
              values="152;54"
              dur={`${4.6 + index * 1.3}s`}
              begin={`${index * 1.4}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="opacity"
              values="0;0.75;0"
              dur={`${4.6 + index * 1.3}s`}
              begin={`${index * 1.4}s`}
              repeatCount="indefinite"
            />
          </circle>
        ))}
    </svg>
  );
}
