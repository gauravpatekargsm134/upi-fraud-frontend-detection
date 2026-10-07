import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  KeyRound, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  X, 
  Mail, 
  RotateCcw, 
  Sparkles,
  ShieldAlert,
  Send
} from 'lucide-react';
import { paymentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function OtpModal({ isOpen, transactionId, onClose, onSuccess }) {
  const { user } = useAuth();

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [dispatchInfo, setDispatchInfo] = useState(null);
  const [error, setError] = useState('');
  const [timer, setTimer] = useState(30);

  // Request new OTP whenever modal opens with a valid transaction
  const triggerOtpRequest = async () => {
    if (!transactionId) return;
    setDispatching(true);
    setError('');
    try {
      const res = await paymentAPI.requestOtp({
        transaction_id: transactionId,
        email: user?.email
      });
      if (res.data?.success) {
        setDispatchInfo(res.data);
        if (res.data.demo_otp) {
          setOtp(res.data.demo_otp);
        }
      }
    } catch (err) {
      console.error('Failed to request OTP:', err);
      setError('Could not dispatch OTP email. You can use standard code 123456.');
    } finally {
      setDispatching(false);
    }
  };

  useEffect(() => {
    if (isOpen && transactionId) {
      setOtp('');
      setError('');
      setTimer(30);
      triggerOtpRequest();
    }
  }, [isOpen, transactionId]);

  // Countdown timer for resend
  useEffect(() => {
    if (!isOpen || timer <= 0) return;
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen, timer]);

  const handleResend = () => {
    if (timer > 0 || dispatching) return;
    setTimer(30);
    triggerOtpRequest();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await paymentAPI.verifyOtp({ 
        transaction_id: transactionId, 
        otp: otp.trim() 
      });
      if (res.data.success) {
        onSuccess(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP code. Please check your Gmail.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isRealSmtp = dispatchInfo?.mode === 'smtp_delivered';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.93, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 relative overflow-hidden"
        >
          {/* Subtle top color bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Modal Header */}
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white mx-auto flex items-center justify-center mb-3.5 shadow-lg shadow-blue-500/20">
              <Mail className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Gmail Step-Up 2FA Authentication
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Our AI detected an anomalous risk vector. A dynamic 6-digit one-time password was dispatched to:
            </p>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200/80 mt-2 text-xs font-mono font-bold text-slate-800">
              <span>{dispatchInfo?.masked_email || user?.email || 'your registered Gmail'}</span>
            </div>
          </div>

          {/* Delivery Status Badge */}
          {dispatching ? (
            <div className="mb-5 p-3 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-800 text-xs flex items-center justify-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              <span className="font-semibold">Dispatching secure OTP to your Gmail...</span>
            </div>
          ) : isRealSmtp ? (
            <div className="mb-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Dispatched to Real Gmail Inbox!</span>
                <span>Check your Gmail inbox and spam/promotions tab for the AegisPay security code.</span>
              </div>
            </div>
          ) : dispatchInfo?.demo_otp ? (
            <div className="mb-5 p-3 rounded-2xl bg-indigo-50/90 border border-indigo-200 text-indigo-950 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold flex items-center space-x-1 text-indigo-900">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Dynamic OTP Code:</span>
                </span>
                <button
                  type="button"
                  onClick={() => setOtp(dispatchInfo.demo_otp)}
                  className="font-mono font-black text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  {dispatchInfo.demo_otp} (Click to Fill)
                </button>
              </div>
              <p className="text-[10px] text-indigo-700 leading-tight">
                💡 To deliver real emails directly into your actual Gmail inbox, add <code className="bg-white/80 px-1 py-0.5 rounded text-indigo-900 font-mono">GMAIL_USER</code> and <code className="bg-white/80 px-1 py-0.5 rounded text-indigo-900 font-mono">GMAIL_APP_PASSWORD</code> in <code className="bg-white/80 px-1 py-0.5 rounded text-indigo-900 font-mono">backend/.env</code>.
              </p>
            </div>
          ) : null}

          {/* Verification Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Enter 6-Digit OTP
                </label>
                <span className="text-[11px] text-slate-400 font-mono">Expires in 10 mins</span>
              </div>
              
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="••••••"
                className="w-full text-center tracking-[0.5em] font-mono text-2xl font-black py-3 px-4 rounded-2xl border border-slate-300 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-hidden bg-slate-50 shadow-inner"
                autoFocus
              />
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -5 }} 
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start space-x-2 p-3 rounded-xl bg-red-50 text-red-700 text-xs border border-red-200"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading || otp.length < 4}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials & Clearing Payment...</span>
                </>
              ) : (
                <span>Confirm & Release Payment</span>
              )}
            </button>

            {/* Resend Link & Bypass Help */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
              <span className="text-[11px]">Didn't receive email?</span>
              <button
                type="button"
                onClick={handleResend}
                disabled={timer > 0 || dispatching}
                className="font-bold text-blue-600 hover:text-blue-800 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors flex items-center space-x-1"
              >
                <RotateCcw className={`w-3 h-3 ${dispatching ? 'animate-spin' : ''}`} />
                <span>{timer > 0 ? `Resend in ${timer}s` : 'Resend OTP to Gmail'}</span>
              </button>
            </div>

            <p className="text-center text-[10px] text-slate-400 mt-2">
              Demo backup: <span className="font-mono font-bold text-slate-600">123456</span> is also recognized for offline testing.
            </p>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
