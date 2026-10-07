import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  ShieldAlert, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  FileText, 
  Lock, 
  KeyRound, 
  PhoneCall, 
  BarChart2,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import confetti from 'canvas-confetti';
import CircularGauge from './CircularGauge';

export default function TransactionResultModal({ isOpen, result, onClose, onOpenOtp, onNavigateAnalytics }) {
  const [showShapDetails, setShowShapDetails] = useState(false);

  useEffect(() => {
    if (isOpen && result && result.status === 'APPROVED') {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen, result]);

  if (!isOpen || !result) return null;

  const isApproved = result.status === 'APPROVED';
  const riskColor = isApproved ? 'text-emerald-600' : 'text-red-600';
  const fraudScore = Math.round(result.fraud_percentage ?? (result.fraud_probability * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-8 my-8 relative overflow-hidden"
        >
          {/* Status Header Banner */}
          <div className={`p-4 rounded-2xl mb-6 flex items-center justify-between border ${
            isApproved 
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' 
              : 'bg-red-50/80 border-red-200 text-red-900'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isApproved ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-red-500 text-white shadow-md shadow-red-500/30'
              }`}>
                {isApproved ? <CheckCircle className="w-7 h-7" /> : <XCircle className="w-7 h-7" />}
              </div>
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider opacity-75">Verification Result</span>
                <h2 className="text-xl font-black tracking-tight">
                  {isApproved ? 'Payment Approved' : 'Transaction Blocked'}
                </h2>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-slate-500 block">Amount</span>
              <span className="text-lg font-black text-slate-900">
                ₹{Number(result.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* AI Circular Gauge & Probability Section */}
          <div className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200/80 flex flex-col sm:flex-row items-center justify-around gap-4 mb-6">
            <CircularGauge
              percentage={fraudScore}
              riskLevel={result.risk_level || (isApproved ? 'LOW' : 'HIGH')}
              size={150}
              strokeWidth={12}
            />

            <div className="space-y-2 text-left max-w-xs">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-slate-500 uppercase">Models Consulted:</span>
              </div>
              <div className="space-y-1 text-xs text-slate-600">
                <div className="flex justify-between">
                  <span>XGBoost Probability:</span>
                  <span className="font-bold text-slate-800">{Math.round((result.xgb_score || 0) * 100)}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Autoencoder Anomaly:</span>
                  <span className="font-bold text-slate-800">{Math.round((result.autoencoder_score || 0) * 100)}%</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span>Synthesized Risk:</span>
                  <span className={`font-black ${isApproved ? 'text-emerald-600' : 'text-red-600'}`}>
                    {result.risk_level || (isApproved ? 'LOW' : 'HIGH')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Detected Reasons List */}
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5 flex items-center justify-between">
              <span>AI Factor Explanations</span>
              <span className="text-[11px] text-slate-400 font-normal">SHAP & Rule Signatures</span>
            </h4>
            <div className="space-y-2">
              {result.reasons && result.reasons.length > 0 ? (
                result.reasons.map((reason, idx) => (
                  <div
                    key={idx}
                    className={`flex items-start space-x-2.5 p-2.5 rounded-xl border text-xs font-medium ${
                      isApproved 
                        ? 'bg-emerald-50/40 border-emerald-100 text-emerald-900' 
                        : 'bg-red-50/40 border-red-100 text-red-900'
                    }`}
                  >
                    <span className="mt-0.5 font-bold">
                      {isApproved ? '✓' : '⚠️'}
                    </span>
                    <span>{reason}</span>
                  </div>
                ))
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 text-slate-500 text-xs text-center">
                  Standard baseline behavioral metrics verified.
                </div>
              )}
            </div>
          </div>

          {/* Suggested Action for Blocked */}
          {!isApproved && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 mb-6">
              <div className="flex items-center space-x-2 text-amber-900 font-bold text-sm mb-1.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Suggested Action: {result.suggested_action || 'OTP Verification'}</span>
              </div>
              <p className="text-xs text-amber-700 mb-3">
                To prevent simulated account draining, this transfer was halted. You can perform step-up two-factor OTP verification to authenticate ownership.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={onOpenOtp}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Verify via Demo OTP</span>
                </button>
                <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-white border border-amber-200 text-amber-900 rounded-xl text-xs font-medium">
                  <PhoneCall className="w-3.5 h-3.5 text-amber-600" />
                  <span>Helpdesk: 1800-001-AEGIS</span>
                </div>
              </div>
            </div>
          )}

          {/* SHAP Quick Contributing Features Accordion */}
          {result.shap_features && result.shap_features.length > 0 && (
            <div className="mb-6 border border-slate-200 rounded-2xl overflow-hidden">
              <button
                onClick={() => setShowShapDetails(!showShapDetails)}
                className="w-full p-3.5 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors"
              >
                <span className="flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  <span>Top Contributing SHAP Features</span>
                </span>
                <span className="text-blue-600 text-xs">
                  {showShapDetails ? 'Hide ▲' : 'View Breakdown ▼'}
                </span>
              </button>

              {showShapDetails && (
                <div className="p-3.5 space-y-2 bg-white border-t border-slate-200">
                  {result.shap_features.map((feat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <span className="text-slate-600 truncate max-w-[200px]">{feat.label}</span>
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                          feat.impact === 'INCREASES_RISK'
                            ? 'bg-red-50 text-red-700 border border-red-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {feat.formatted_pct || `${feat.percentage > 0 ? '+' : ''}${feat.percentage}%`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Gemini AI Intelligence Banner */}
          <div 
            onClick={() => onNavigateAnalytics && onNavigateAnalytics(result)}
            className="mb-4 p-3 rounded-2xl bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border border-purple-200/70 flex items-center justify-between cursor-pointer hover:border-purple-300 transition-all group"
          >
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-800 block group-hover:text-indigo-600 transition-colors">
                  Gemini AI & SHAP Intelligence Available
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Inspect feature game-theoretic attributions & Gemini fraud prediction
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-purple-600 group-hover:translate-x-0.5 transition-transform" />
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              onClick={() => onNavigateAnalytics && onNavigateAnalytics(result)}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>Explainable AI Analytics</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={onClose}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all ${
                isApproved 
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' 
                  : 'bg-slate-800 hover:bg-slate-900'
              }`}
            >
              {isApproved ? 'Done' : 'Dismiss'}
            </button>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  );
}
