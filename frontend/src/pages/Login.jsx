import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Cpu,
  Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('demo@aegispay.com');
  const [password, setPassword] = useState('password123');
  const [fullName, setFullName] = useState('Aman Sharma');
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleDemoFill = () => {
    setEmail('demo@aegispay.com');
    setPassword('password123');
    setIsRegister(false);
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSubmitting(true);

    if (isRegister) {
      const res = await register({ email, password, full_name: fullName });
      if (res.success) {
        navigate('/');
      } else {
        setErrorMessage(res.error);
      }
    } else {
      const res = await login(email, password);
      if (res.success) {
        navigate('/');
      } else {
        setErrorMessage(res.error);
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glowing decorations */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        {/* Brand Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 mx-auto flex items-center justify-center text-white shadow-xl shadow-blue-500/30 mb-4">
          <ShieldCheck className="w-9 h-9" />
        </div>
        <h2 className="text-3xl font-extrabold text-white tracking-tight">
          Aegis<span className="text-blue-500">Pay</span>
        </h2>
        <p className="mt-2 text-sm text-slate-400">
          Next-Generation AI UPI Fraud Shield & Behavioral Telemetry
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white/95 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-white/20">
          
          {/* Quick Demo Login Pill */}
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-900 font-semibold">Demo Sandbox Ready</span>
            </div>
            <button
              type="button"
              onClick={handleDemoFill}
              className="text-[11px] font-bold text-blue-700 bg-blue-200/70 hover:bg-blue-200 px-2.5 py-1 rounded-lg transition-colors"
            >
              Fill Demo Login
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Aman Sharma"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>
            )}

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Banking Email / Gmail
                </label>
                {isRegister && (
                  <span className="text-[10px] text-blue-600 font-semibold">
                    Step-Up 2FA OTPs sent here
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center space-x-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold text-sm shadow-md shadow-blue-600/30 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              <span>{isRegister ? 'Register Bank Account' : 'Sign In Securely'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle Register / Login */}
          <div className="mt-6 pt-5 border-t border-slate-200 text-center">
            <button
              type="button"
              onClick={() => {
                setIsRegister(!isRegister);
                setErrorMessage('');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              {isRegister
                ? 'Already have an account? Sign In'
                : "Don't have an account? Create Demo Account"}
            </button>
          </div>

          {/* Feature Highlights */}
          <div className="mt-6 grid grid-cols-3 gap-2 pt-4 border-t border-slate-100 text-center text-[10px] text-slate-500 font-medium">
            <div className="p-2 bg-slate-50 rounded-xl">
              <Cpu className="w-3.5 h-3.5 text-blue-600 mx-auto mb-1" />
              <span>XGBoost + Autoencoder</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl">
              <Layers className="w-3.5 h-3.5 text-indigo-600 mx-auto mb-1" />
              <span>SHAP Explainability</span>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 mx-auto mb-1" />
              <span>Zero Risk Sandbox</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
