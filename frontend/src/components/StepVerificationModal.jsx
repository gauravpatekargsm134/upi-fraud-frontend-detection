import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Smartphone, 
  Cpu, 
  Award
} from 'lucide-react';

const STEPS = [
  { id: 1, label: 'Initiating Secure UPI Handshake...', icon: ShieldCheck },
  { id: 2, label: 'Verifying Hardware & Geolocation Telemetry...', icon: Smartphone },
  { id: 3, label: 'Running AI Fraud Risk & Anomaly Shield...', icon: Cpu },
  { id: 4, label: 'Synthesizing AI Decision Verdict...', icon: Award },
];

export default function StepVerificationModal({ isOpen, result, onAnimationFinished }) {
  const [activeStepIndex, setActiveStepIndex] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setActiveStepIndex(0);
      return;
    }

    // Normal fast UPI transaction progression (~260ms per step, ~1.2s total)
    let current = 0;
    const interval = setInterval(() => {
      current++;
      if (current < STEPS.length) {
        setActiveStepIndex(current);
      } else {
        clearInterval(interval);
      }
    }, 260);

    return () => clearInterval(interval);
  }, [isOpen]);

  // Smoothly trigger completion once steps finish and result is available
  useEffect(() => {
    if (isOpen && activeStepIndex >= STEPS.length - 1 && result) {
      const timer = setTimeout(() => {
        if (onAnimationFinished) onAnimationFinished();
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeStepIndex, result, onAnimationFinished]);

  // Fallback safety: ensure modal always proceeds even if network delays response
  useEffect(() => {
    if (!isOpen) return;
    const fallbackTimer = setTimeout(() => {
      if (onAnimationFinished) onAnimationFinished();
    }, 2200);
    return () => clearTimeout(fallbackTimer);
  }, [isOpen, onAnimationFinished]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-6 sm:p-8 overflow-hidden relative"
        >
          {/* Glowing gradient top bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500" />

          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-inner">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">Processing & Validating</h3>
            <p className="text-xs text-slate-500 mt-1">Multi-model neural verification in progress</p>
          </div>

          {/* Stepper List */}
          <div className="space-y-3.5 my-6">
            {STEPS.map((step, idx) => {
              const isPast = idx < activeStepIndex;
              const isCurrent = idx === activeStepIndex;
              const Icon = step.icon;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-medium transition-all ${
                    isCurrent
                      ? 'bg-blue-50/80 border-blue-200 text-blue-900 shadow-xs'
                      : isPast
                      ? 'bg-slate-50/80 border-slate-200/60 text-slate-700'
                      : 'border-transparent text-slate-400 opacity-40'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                        isCurrent
                          ? 'bg-blue-600 text-white shadow-xs'
                          : isPast
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-semibold">{step.label}</span>
                  </div>

                  <div>
                    {isPast && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-emerald-600"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </motion.div>
                    )}
                    {isCurrent && (
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Footer Status Pill */}
          <div className="text-center pt-2">
            <span className="inline-flex items-center space-x-1.5 text-[11px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Processing & Validating transaction...</span>
            </span>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
