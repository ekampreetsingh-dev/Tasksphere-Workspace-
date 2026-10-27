"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { riseVariants } from "@/lib/motion";

export default function ViewHeader({
  title,
  subtitle,
  aside,
  reduced,
  className = "",
}: {
  title: string;
  subtitle: string;
  aside?: ReactNode;
  reduced: boolean;
  className?: string;
}) {
  return (
    <motion.header
      className={`view-head ${className}`}
      variants={riseVariants}
      initial={reduced ? undefined : "initial"}
      animate={reduced ? undefined : "enter"}
    >
      <div className="min-w-0">
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      {aside}
    </motion.header>
  );
}
