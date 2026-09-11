import React from "react";
import { motion } from "framer-motion";

export default function KpiCard({
  label,
  value,
  icon,
  sub,
  variant,
  delay = 0,
}) {
  const cls =
    "card kpi" + (variant === "gold" ? " g" : variant === "red" ? " gr" : "");
  return (
    <motion.div
      className={cls}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
    >
      <div className="kpi-top">
        <div className="kpi-lbl">{label}</div>
        <div className="kpi-icon">
          <span className="material-symbols-outlined">{icon}</span>
        </div>
      </div>
      <motion.div
        className="kpi-val"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: delay + 0.1 }}
      >
        {value}
      </motion.div>
      {sub && (
        <div className="kpi-chg" style={{ color: "var(--tl)" }}>
          {sub}
        </div>
      )}
    </motion.div>
  );
}
