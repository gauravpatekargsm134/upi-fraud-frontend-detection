import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  History as HistoryIcon, 
  Search, 
  Download, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  ShieldCheck, 
  ShieldAlert, 
  Calendar,
  X,
  Smartphone,
  MapPin,
  Cpu,
  Sparkles
} from 'lucide-react';
import { transactionAPI } from '../services/api';
import CircularGauge from '../components/CircularGauge';

export default function History() {
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Detail Modal
  const [selectedTxn, setSelectedTxn] = useState(null);

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const res = await transactionAPI.getHistory({
        status: statusFilter,
        search: searchQuery,
        page,
        per_page: 8
      });
      setTransactions(res.data.items || []);
      setTotalCount(res.data.total || 0);
      setTotalPages(res.data.total_pages || 1);
      setCurrentPage(res.data.page || 1);
    } catch (err) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions(1);
  }, [statusFilter]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchTransactions(1);
  };

  // Download CSV feature
  const handleDownloadCSV = () => {
    if (transactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    const headers = ['Transaction ID', 'Receiver UPI', 'Receiver Name', 'Amount (INR)', 'Status', 'Fraud Probability (%)', 'Risk Level', 'Date'];
    const rows = transactions.map((t) => [
      t.id,
      t.receiver_upi,
      `"${t.receiver_name}"`,
      t.amount,
      t.status,
      t.fraud_probability,
      t.risk_level,
      `"${t.date}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `UPI_Transactions_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Transaction History & Audits</h1>
          <p className="text-xs text-slate-500 mt-1">
            Complete audit trail of simulated payments with AI fraud scores and telemetry
          </p>
        </div>

        <button
          onClick={handleDownloadCSV}
          className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-blue-600" />
          <span>Download CSV Report</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Status Filters */}
        <div className="flex items-center space-x-1.5 w-full md:w-auto">
          {['ALL', 'APPROVED', 'BLOCKED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                statusFilter === st
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st === 'ALL' ? 'All Transactions' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex items-center space-x-2 w-full md:w-80">
          <div className="relative w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID, receiver..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-600 outline-none"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shrink-0"
          >
            Search
          </button>
        </form>

      </div>

      {/* Main Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="py-3.5 px-6">Transaction ID</th>
                <th className="py-3.5 px-6">Receiver</th>
                <th className="py-3.5 px-6">Amount</th>
                <th className="py-3.5 px-6">Date & Time</th>
                <th className="py-3.5 px-6">Fraud Score</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Loading records from database...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium">
                    No transactions match current filters.
                  </td>
                </tr>
              ) : (
                transactions.map((t) => {
                  const isApproved = t.status === 'APPROVED';
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-4 px-6 font-mono font-bold text-slate-800">{t.id}</td>
                      <td className="py-4 px-6">
                        <span className="font-bold text-slate-900 block">{t.receiver_name}</span>
                        <span className="text-[11px] text-slate-400">{t.receiver_upi}</span>
                      </td>
                      <td className="py-4 px-6 font-black text-slate-900">
                        ₹{Number(t.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-medium">{t.date}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <div className="w-16 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-full ${
                                t.fraud_probability > 65
                                  ? 'bg-red-500'
                                  : t.fraud_probability > 35
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${t.fraud_probability}%` }}
                            />
                          </div>
                          <span className="font-mono font-bold text-[11px] text-slate-700">
                            {t.fraud_probability}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6">
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
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => setSelectedTxn(t)}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View SHAP & AI audit details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <span className="font-bold text-slate-800">{transactions.length}</span> of{' '}
            <span className="font-bold text-slate-800">{totalCount}</span> records
          </span>

          <div className="flex items-center space-x-2">
            <button
              disabled={currentPage <= 1}
              onClick={() => fetchTransactions(currentPage - 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages}
              onClick={() => fetchTransactions(currentPage + 1)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Transaction Inspection Detail Drawer / Modal */}
      {selectedTxn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-slate-200 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTxn(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center space-x-3 mb-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                selectedTxn.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
              }`}>
                {selectedTxn.status === 'APPROVED' ? <ShieldCheck className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Transaction Audit Breakdown</h3>
                <span className="font-mono text-xs text-slate-400">{selectedTxn.id}</span>
              </div>
            </div>

            {/* Circular Gauge */}
            <div className="py-2 flex justify-center mb-4">
              <CircularGauge
                percentage={selectedTxn.fraud_probability}
                riskLevel={selectedTxn.risk_level}
                size={140}
                strokeWidth={10}
              />
            </div>

            {/* Key Facts */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3.5 rounded-2xl mb-4">
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Receiver</span>
                <span className="font-bold text-slate-800">{selectedTxn.receiver_name}</span>
                <span className="text-[11px] text-slate-500 block truncate">{selectedTxn.receiver_upi}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Amount</span>
                <span className="font-black text-slate-900 text-sm">
                  ₹{Number(selectedTxn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="mt-2">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">XGBoost Score</span>
                <span className="font-mono font-bold text-slate-800">{selectedTxn.xgb_score}%</span>
              </div>
              <div className="mt-2">
                <span className="text-slate-400 block text-[10px] font-bold uppercase">Autoencoder Anomaly</span>
                <span className="font-mono font-bold text-slate-800">{selectedTxn.autoencoder_score}%</span>
              </div>
            </div>

            {/* Reasons List */}
            <div className="mb-4">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Engine Identified Factors
              </h4>
              <div className="space-y-1.5">
                {selectedTxn.reasons && selectedTxn.reasons.length > 0 ? (
                  selectedTxn.reasons.map((r, i) => (
                    <div key={i} className="text-xs p-2 rounded-xl bg-slate-100/70 text-slate-700 flex items-center space-x-2">
                      <span className="font-bold">{selectedTxn.status === 'APPROVED' ? '✓' : '⚠️'}</span>
                      <span>{r}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400">Normal verified activity pattern.</p>
                )}
              </div>
            </div>

            {/* Device Info */}
            {selectedTxn.device_info && (
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60 text-[11px] text-slate-600 space-y-1">
                <div className="font-bold text-slate-700 mb-1 flex items-center space-x-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600" />
                  <span>Telemetry Audit</span>
                </div>
                <div>Browser: <span className="font-semibold text-slate-800">{selectedTxn.device_info.browser || 'Chrome'}</span></div>
                <div>OS: <span className="font-semibold text-slate-800">{selectedTxn.device_info.os || 'Windows'}</span></div>
                <div>Fingerprint: <span className="font-mono font-semibold text-slate-800">{selectedTxn.device_info.device_fingerprint || 'fp_49e...'}</span></div>
                <div>IP Address: <span className="font-mono font-semibold text-slate-800">{selectedTxn.ip_address || '127.0.0.1'}</span></div>
              </div>
            )}

            <button
              onClick={() => {
                setSelectedTxn(null);
                navigate('/analytics');
              }}
              className="w-full mt-4 py-2.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 shadow-md shadow-purple-500/20 transition-all"
            >
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>Inspect in Gemini AI & SHAP Engine</span>
            </button>

            <button
              onClick={() => setSelectedTxn(null)}
              className="w-full mt-2 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Close Inspector
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
