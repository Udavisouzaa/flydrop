"use client";

import { motion, AnimatePresence } from "motion/react";
import type { ReactNode } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.06 } },
};

export function MotionForm({
  action,
  className,
  testId,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <motion.form
      action={action}
      className={className}
      data-testid={testId}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {children}
    </motion.form>
  );
}

export function MotionItem({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.div
      className={className}
      variants={fadeUp}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function MotionButton({
  type = "button",
  className,
  testId,
  children,
}: {
  type?: "button" | "submit" | "reset";
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <motion.button
      type={type}
      className={className}
      data-testid={testId}
      variants={fadeUp}
      transition={{ duration: 0.35, ease: "easeOut" }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.96 }}
    >
      {children}
    </motion.button>
  );
}

export function MotionBanner({
  show,
  className,
  testId,
  children,
}: {
  show: boolean;
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.p
          className={className}
          data-testid={testId}
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.98 }}
          transition={{ duration: 0.25 }}
        >
          {children}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export function MotionList({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.ul
      className={className}
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
    >
      {children}
    </motion.ul>
  );
}

export function MotionListItem({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <motion.li
      className={className}
      variants={fadeUp}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.li>
  );
}
