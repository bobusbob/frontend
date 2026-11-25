"use client";

import { useReducedMotion } from "framer-motion";

const SOFT = {
  duration: 0.35,
  ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
};

export function useSoftTransition() {
  const reduce = useReducedMotion();
  return reduce ? { duration: 0 } : SOFT;
}
