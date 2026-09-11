import React from "react";
import { AnimatePresence, motion } from "framer-motion";

export default function Modal({
  open,
  onClose,
  title,
  icon,
  subtitle,
  children,
  actions,
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-overlay show"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
          >
            <div className="modal-header">
              <div className="modal-title">
                {icon && (
                  <span className="material-symbols-outlined">{icon}</span>
                )}{" "}
                {title}
              </div>
              <button className="modal-close" onClick={onClose}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            {subtitle && <div className="modal-sub">{subtitle}</div>}
            <div className="modal-gold-line"></div>
            {children}
            {actions && <div className="modal-actions">{actions}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
