"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSoftTransition } from "@/lib/use-soft-transition";

export function Toast({ message }: { message: string | null }) {
  const transition = useSoftTransition();

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-6">
      <AnimatePresence>
        {message ? (
          <motion.p
            key={message}
            role="status"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={transition}
            className="rounded-full border border-line bg-surface px-4 py-2 text-sm text-ink shadow-[var(--shadow)]"
          >
            {message}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
