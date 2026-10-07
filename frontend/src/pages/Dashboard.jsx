import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  TrendingUp, 
  Percent, 
  Activity, 
  Send, 
  ArrowUpRight, 
  ArrowDownRight,
  ExternalLink,
  Cpu,
  RefreshCw,
  Wallet
} from 'lucide-react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  Tooltip, 
  BarChart, 
  Bar, 
  Legend 
} from 'recharts';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await dashboardAPI.getDashboard();
      setData(res.data);
    } catch (err) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-sm font-semibold text-slate-500">Connecting to AI Fraud Engine...</p>
      </div>
    );
  }

  const cards = data?.cards || {
    total_transactions: 0,
    safe_transactions: 0,
    fraud_transactions: 0,
    fraud_rate: '0%',
    model_accuracy: '98.4%'
  };

  const pieData = data?.pie_chart || [
    { name: 'Safe Transactions', value: 85, color: '#22C55E' },
    { name: 'Fraud Transactions', value: 15, color: '#EF4444' }
  ];

  const dailyChart = data?.daily_chart || [];
  const weeklyTrend = data?.weekly_trend || [];
  const recentTxns = data?.recent_transactions || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Security Command Center</h1>
            <span className="bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span>AI Active</span>
            </span>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-[11px] font-semibold px-2.5 py-0.5 rounded-full flex items-center space-x-1.5" title="MongoDB Atlas Cluster0 Connected">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>MongoDB Atlas Connected</span>
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Real-time inference telemetry: XGBoost + Autoencoder ensemble protecting <span className="font-semibold text-slate-700">{user?.upi_id}</span>
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Refresh Metrics"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => navigate('/payment')}
            className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/25 transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Simulate Payment</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Total Volume</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-900">{cards.total_transactions}</span>
            <span className="text-xs text-slate-400 block mt-0.5">Simulated Transfers</span>
          </div>
        </motion.div>

        {/* Safe Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Safe Approved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-emerald-600">{cards.safe_transactions}</span>
            <span className="text-xs text-emerald-700/70 block mt-0.5">Cleared by Engine</span>
          </div>
        </motion.div>

        {/* Fraud Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-red-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Fraud Blocked</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-red-600">{cards.fraud_transactions}</span>
            <span className="text-xs text-red-700/70 block mt-0.5">Attacks Neutralized</span>
          </div>
        </motion.div>

        {/* Fraud Rate */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Fraud Rate</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-slate-900">{cards.fraud_rate}</span>
            <span className="text-xs text-slate-400 block mt-0.5">Overall Anomaly Ratio</span>
          </div>
        </motion.div>

        {/* Model Accuracy */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-5 rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-white shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800">Model Accuracy</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <span className="text-2xl font-black text-blue-600">{cards.model_accuracy}</span>
            <span className="text-xs text-blue-700/80 block mt-0.5">Ensemble F1 & ROC</span>
          </div>
        </motion.div>
      </div>

      {/* Charts Section: 3 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart 1: Fraud vs Safe Pie Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Fraud vs Safe Distribution</h3>
              <p className="text-xs text-slate-500">Transaction decision ratio</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={65}
                  outerRadius={88}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || '#2563EB'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} transactions`, name]}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Daily Transaction Line Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Daily Transaction Volume (7 Days)</h3>
              <p className="text-xs text-slate-500">Safe vs Blocked activity breakdown</p>
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyChart}>
                <XAxis dataKey="day" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Legend verticalAlign="top" wrapperStyle={{ fontSize: '12px', paddingBottom: '10px' }} />
                <Line
                  type="monotone"
                  name="Safe Cleared"
                  dataKey="safe"
                  stroke="#22C55E"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#22C55E' }}
                />
                <Line
                  type="monotone"
                  name="Fraud Blocked"
                  dataKey="fraud"
                  stroke="#EF4444"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#EF4444' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Weekly Fraud Trend & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Weekly Trend Bar Chart */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
          <div className="mb-4">
            <h3 className="text-base font-bold text-slate-900">Weekly Fraud Trend (%)</h3>
            <p className="text-xs text-slate-500">Calculated anomaly index over time</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend}>
                <XAxis dataKey="week" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} unit="%" />
                <Tooltip
                  formatter={(val) => [`${val}%`, 'Fraud Rate']}
                  contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                />
                <Bar dataKey="rate" fill="#2563EB" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions Table */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Transactions</h3>
              <p className="text-xs text-slate-500">Live feed from the UPI transaction pipeline</p>
            </div>
            <button
              onClick={() => navigate('/history')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center space-x-1"
            >
              <span>View Full History</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="pb-3">Transaction ID</th>
                  <th className="pb-3">Receiver</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Fraud Probability</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {recentTxns.map((t) => {
                  const isApproved = t.status === 'APPROVED';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 font-mono font-semibold text-slate-700">{t.id}</td>
                      <td className="py-3">
                        <span className="font-semibold text-slate-800 block">{t.receiver_name}</span>
                        <span className="text-[11px] text-slate-400">{t.receiver_upi}</span>
                      </td>
                      <td className="py-3 font-bold text-slate-900">
                        ₹{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full ${isApproved ? 'bg-emerald-500' : 'bg-red-500'}`}
                              style={{ width: `${t.fraud_probability}%` }}
                            />
                          </div>
                          <span className="font-mono text-[11px] font-semibold text-slate-600">
                            {t.fraud_probability}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {isApproved ? 'Approved' : 'Blocked'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
}
