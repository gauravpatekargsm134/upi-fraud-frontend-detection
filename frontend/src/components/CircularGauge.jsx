import React from 'react';
import { motion } from 'framer-motion';

export default function CircularGauge({ percentage = 0, riskLevel = 'LOW', size = 180, strokeWidth = 14 }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = Math.min(100, Math.max(0, percentage));
  const offset = circumference - (safePercentage / 100) * circumference;

  let strokeColor = '#22C55E'; // Success green
  let glowColor = 'rgba(34, 197, 94, 0.25)';
  let textColor = 'text-emerald-600';
  let badgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';

  if (safePercentage >= 65 || riskLevel === 'HIGH') {
    strokeColor = '#EF4444'; // Danger red
    glowColor = 'rgba(239, 68, 68, 0.25)';
    textColor = 'text-red-600';
    badgeBg = 'bg-red-50 text-red-700 border-red-200';
  } else if (safePercentage >= 40 || riskLevel === 'MEDIUM') {
    strokeColor = '#F59E0B'; // Amber
    glowColor = 'rgba(245, 158, 11, 0.25)';
    textColor = 'text-amber-600';
    badgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
  }

  return (
    <div className="flex flex-col items-center justify-center relative">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90 origin-center drop-shadow-sm"
        >
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeLinecap="round"
          />
          {/* Animated Value Arc */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            strokeLinecap="round"
            style={{
              filter: `drop-shadow(0 4px 10px ${glowColor})`,
            }}
          />
        </svg>

        {/* Center Text Container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Fraud Probability</span>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className={`text-3xl font-extrabold ${textColor} tracking-tight`}
          >
            {safePercentage}%
          </motion.div>
          <span className={`mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeBg} tracking-wide`}>
            {riskLevel} RISK
          </span>
        </div>
      </div>
    </div>
  );
}
