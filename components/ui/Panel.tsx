"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { revealVariants } from "@/lib/motion";

interface PanelProps {
  title?: string;
  kicker?: string;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
  bodyClass?: string;
  children: ReactNode;
  /** Scroll reveal is opt-out because dense desktop grids felt animated enough. */
  reveal?: boolean;
  reduced?: boolean;
}

export default function Panel({
  title,
  kicker,
  actions,
  icon,
  className = "",
  bodyClass = "",
  children,
  reveal = true,
  reduced = false,
}: PanelProps) {
  const animate = reveal && !reduced;

  const inner = (
    <>
      {(title || actions) && (
        <header className="panel-heading">
          <div className="min-w-0">
            {kicker && <p className="kicker">{kicker}</p>}
            {title && (
              <h2 className="flex items-center gap-2.5">
                {icon && <span className="text-accent">{icon}</span>}
                <span className="truncate">{title}</span>
              </h2>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={bodyClass}>{children}</div>
    </>
  );

  const shell = `panel ${className}`;

  if (!animate) return <section className={shell}>{inner}</section>;

  return (
    <motion.section
      className={shell}
      variants={revealVariants}
      initial="initial"
      whileInView="enter"
      viewport={{ once: true, margin: "-40px" }}
    >
      {inner}
    </motion.section>
  );
}
