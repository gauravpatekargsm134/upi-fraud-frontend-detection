import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Send, 
  Lock, 
  Sparkles, 
  AlertTriangle, 
  Smartphone, 
  MapPin, 
  Wifi, 
  Clock, 
  Zap, 
  Check,
  User,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { collectDeviceMetadata } from '../services/metadataCollector';
import { paymentAPI } from '../services/api';
import StepVerificationModal from '../components/StepVerificationModal';
import TransactionResultModal from '../components/TransactionResultModal';
import OtpModal from '../components/OtpModal';

const PRESET_SCENARIOS = [
  {
    id: 'normal_grocery',
    title: 'Safe Grocery Payment',
    amount: 350,
    receiver: 'swiggy@icici',
    receiverName: 'Swiggy Instamart',
    remarks: 'Groceries & fruits',
    type: 'SAFE',
    tag: 'Normal Baseline (Low Risk)',
    color: 'emerald',
    simulateFlags: {}
  },
  {
    id: 'normal_rent',
    title: 'Friend Dinner Split',
    amount: 1250,
    receiver: 'priya.sharma@okaxis',
    receiverName: 'Priya Sharma',
    remarks: 'Weekend dinner split',
    type: 'SAFE',
    tag: 'Known Contact (Safe)',
    color: 'blue',
    simulateFlags: {}
  },
  {
    id: 'large_anomalous',
    title: 'High Amount Spike',
    amount: 38000,
    receiver: 'gadgets_store@okhdfcbank',
    receiverName: 'Croma Electronics',
    remarks: 'Laptop monitor purchase',
    type: 'MEDIUM',
    tag: '30x Typical Spending',
    color: 'amber',
    simulateFlags: {}
  },
  {
    id: 'midnight_takeover',
    title: 'Midnight Account Drain',
    amount: 82000,
    receiver: 'unknown_crypto_p2p@airtel',
    receiverName: 'Cryptonex P2P Desk',
    remarks: 'P2P Transfer',
    type: 'FRAUD',
    tag: 'New Device + 1,450km Jump + 3AM',
    color: 'red',
    simulateFlags: {
      simulate_new_device: true,
      simulate_location_anomaly: true,
      simulate_suspicious_receiver: true,
      hour: 3
    }
  },
  {
    id: 'velocity_burst',
    title: 'Phishing Velocity Burst',
    amount: 45000,
    receiver: 'winrealcash99@telegramgift',
    receiverName: 'Mega Jackpot Pool',
    remarks: 'Urgent lottery claim fee',
    type: 'FRAUD',
    tag: 'Velocity Spike + VPN + High Risk VPA',
    color: 'red',
    simulateFlags: {
      simulate_velocity_burst: true,
      simulate_vpn: true,
      simulate_suspicious_receiver: true
    }
  }
];

export default function Payment() {
  const { user, updateBalance, resetBalance } = useAuth();
  const navigate = useNavigate();

  const [receiverUpi, setReceiverUpi] = useState('swiggy@icici');
  const [receiverName, setReceiverName] = useState('Swiggy Instamart');
  const [amount, setAmount] = useState('350');
  const [remarks, setRemarks] = useState('Groceries & snacks');
  const [simulationFlags, setSimulationFlags] = useState({});

  // Telemetry metadata state
  const [telemetry, setTelemetry] = useState(null);

  // Modals state
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [activeTxnId, setActiveTxnId] = useState(null);

  useEffect(() => {
    // Automatically collect telemetry in the background
    collectDeviceMetadata().then((meta) => {
      setTelemetry(meta);
    });
  }, []);

  const handleSelectScenario = (sc) => {
    setReceiverUpi(sc.receiver);
    setReceiverName(sc.receiverName);
    setAmount(String(sc.amount));
    setRemarks(sc.remarks);
    setSimulationFlags(sc.simulateFlags);
  };

  const handlePay = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Refresh telemetry immediately prior to payment
    const currentMeta = await collectDeviceMetadata();
    // Merge simulated metadata flags if applicable
    const mergedMeta = {
      ...currentMeta,
      ...(simulationFlags.hour !== undefined ? { hour: simulationFlags.hour } : {}),
      ...(simulationFlags.simulate_vpn ? { is_vpn: true } : {})
    };

    const payload = {
      sender_upi: user?.upi_id || 'amansharma@aegis',
      receiver_upi: receiverUpi,
      receiver_name: receiverName,
      amount: numAmount,
      remarks: remarks || 'UPI Payment',
      metadata: mergedMeta,
      ...simulationFlags
    };

    // Open Step-by-Step AI Verification animation modal
    setIsVerifying(true);

    try {
      const res = await paymentAPI.processPayment(payload);
      setVerificationResult(res.data);
      setActiveTxnId(res.data.transaction_id);

      // Save latest prediction so Analytics & Gemini immediately analyze this exact transaction
      try {
        sessionStorage.setItem('aegis_recent_prediction', JSON.stringify(res.data));
      } catch (e) {}

      if (res.data.status === 'APPROVED' && res.data.updated_balance !== undefined) {
        updateBalance(res.data.updated_balance);
      }
    } catch (err) {
      console.error('Payment processing failed', err);
      setIsVerifying(false);
      alert(err.response?.data?.error || 'Payment execution failed');
    }
  };

  // Called after the transaction validation completes (~1.2s normal UPI time)
  const handleAnimationFinished = () => {
    setIsVerifying(false);
    setShowResultModal(true);
  };

  const handleOtpSuccess = (otpData) => {
    setShowOtpModal(false);
    if (verificationResult) {
      setVerificationResult({
        ...verificationResult,
        status: 'APPROVED',
        risk_level: 'VERIFIED_VIA_OTP'
      });
      // Deduct balance
      const newBal = (user?.account_balance || 50000) - parseFloat(amount);
      updateBalance(newBal);
    }
    alert('Payment successfully released and verified with OTP!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Page Title & Subtitle */}
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Simulate UPI Payment</h1>
        <p className="text-sm text-slate-500 mt-2">
          Experience real-time AI fraud detection. Telemetry and hardware signals are automatically ingested and evaluated by our ensemble models.
        </p>
      </div>

      {/* Preset Test Scenarios Bar for Professors & Testers */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Demo Test Scenarios (1-Click Test for Evaluation)
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">Click any scenario to auto-fill</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {PRESET_SCENARIOS.map((sc) => {
            const isSelected = receiverUpi === sc.receiver && amount === String(sc.amount);
            return (
              <button
                key={sc.id}
                type="button"
                onClick={() => handleSelectScenario(sc)}
                className={`p-3 rounded-2xl border text-left transition-all ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs ring-1 ring-blue-600'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      sc.type === 'SAFE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : sc.type === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {sc.type}
                  </span>
                  <span className="text-xs font-black text-slate-900">₹{sc.amount.toLocaleString()}</span>
                </div>
                <div className="mt-2">
                  <h4 className="text-xs font-bold text-slate-800 leading-tight">{sc.title}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-snug truncate">{sc.tag}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Payment Form Card */}
      <div className="max-w-xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xl relative overflow-hidden"
        >
          {/* Subtle top gradient */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500" />

          <form onSubmit={handlePay} className="space-y-5">
            
            {/* Sender UPI (Auto-filled) */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Sender UPI (Auto-filled)
                </label>
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    Available: ₹{Number(user?.account_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                  <button
                    type="button"
                    onClick={() => resetBalance(100000.0)}
                    title="Reset balance to ₹100,000.00"
                    className="text-[10px] text-blue-600 hover:text-blue-800 font-bold bg-blue-50 hover:bg-blue-100 px-1.5 py-0.5 rounded-md border border-blue-200 transition-colors"
                  >
                    + Reset
                  </button>
                </div>
              </div>
              <div className="relative">
                <input
                  type="text"
                  disabled
                  value={user?.upi_id || 'amansharma@aegis'}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-100/90 border border-slate-200 text-slate-700 font-mono text-sm font-semibold cursor-not-allowed select-none"
                />
                <ShieldCheck className="w-5 h-5 text-emerald-600 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* Receiver UPI */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Receiver UPI ID (VPA)
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={receiverUpi}
                  onChange={(e) => {
                    setReceiverUpi(e.target.value);
                    setReceiverName(e.target.value.split('@')[0]);
                  }}
                  placeholder="name@okhdfcbank or merchant@upi"
                  className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
                <User className="w-5 h-5 text-slate-400 absolute right-3.5 top-3.5" />
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Transfer Amount (INR)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-3 text-xl font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-9 pr-4 py-3 rounded-2xl border border-slate-300 text-xl font-black text-slate-900 focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                />
              </div>

              {/* Quick Amount Pills */}
              <div className="flex flex-wrap gap-2 mt-2.5">
                {['250', '500', '2000', '15000', '75000'].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val)}
                    className="text-xs font-bold text-slate-600 hover:text-blue-600 bg-slate-100 hover:bg-blue-50 px-2.5 py-1 rounded-xl transition-colors"
                  >
                    +₹{Number(val).toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                Remarks / Purpose
              </label>
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="e.g. Dinner, Rent, Electronics"
                className="w-full px-4 py-2.5 rounded-2xl border border-slate-300 text-sm focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Automatically Collected Telemetry Badge */}
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Silently Collected Telemetry (Automated)</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Attached to Payload
                </span>
              </div>
              <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[11px] text-slate-600 font-medium">
                <div>Browser: <span className="font-semibold text-slate-800">{telemetry?.browser || 'Chrome'}</span></div>
                <div>OS: <span className="font-semibold text-slate-800">{telemetry?.os || 'Windows'}</span></div>
                <div>Device FP: <span className="font-mono font-semibold text-slate-800">{telemetry?.device_fingerprint || 'fp_48ef...'}</span></div>
                <div>Network: <span className="font-semibold text-slate-800">{telemetry?.network_type?.toUpperCase() || '4G'}</span></div>
                <div>Timezone: <span className="font-semibold text-slate-800">{telemetry?.timezone || 'Asia/Kolkata'}</span></div>
                <div>Battery: <span className="font-semibold text-slate-800">{Math.round((telemetry?.battery_level || 0.85) * 100)}%</span></div>
              </div>
            </div>

            {/* Pay Securely Button */}
            <button
              type="submit"
              className="w-full py-4 px-6 rounded-2xl text-white bg-blue-600 hover:bg-blue-700 font-bold text-base shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2.5 transform active:scale-[0.99]"
            >
              <Lock className="w-5 h-5" />
              <span>Pay Securely ₹{Number(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </button>

            <p className="text-center text-[11px] text-slate-400 font-medium">
              Protected by Aegis AI Defense • Multi-Model Verification
            </p>

          </form>
        </motion.div>
      </div>

      {/* 3-4 Second Step Verification Modal */}
      <StepVerificationModal
        isOpen={isVerifying}
        result={verificationResult}
        onAnimationFinished={handleAnimationFinished}
      />

      {/* Final Verification Result Modal */}
      <TransactionResultModal
        isOpen={showResultModal}
        result={verificationResult}
        onClose={() => setShowResultModal(false)}
        onOpenOtp={() => {
          setShowResultModal(false);
          setShowOtpModal(true);
        }}
        onNavigateAnalytics={(txnData) => {
          setShowResultModal(false);
          const dataToPass = txnData || verificationResult;
          if (dataToPass) {
            try {
              sessionStorage.setItem('aegis_recent_prediction', JSON.stringify(dataToPass));
            } catch (e) {}
          }
          navigate('/analytics', { state: { recentTxn: dataToPass } });
        }}
      />

      {/* OTP Verification Modal */}
      <OtpModal
        isOpen={showOtpModal}
        transactionId={activeTxnId}
        onClose={() => setShowOtpModal(false)}
        onSuccess={handleOtpSuccess}
      />

    </div>
  );
}
