import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  Send, 
  History, 
  Cpu, 
  LogOut, 
  Wallet,
  UserCheck,
  RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout, resetBalance } = useAuth();
  const [resetting, setResetting] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleReset = async () => {
    if (resetting) return;
    setResetting(true);
    await resetBalance(100000.0);
    setTimeout(() => setResetting(false), 500);
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/payment', label: 'Make Payment', icon: Send },
    { to: '/history', label: 'History', icon: History },
    { to: '/analytics', label: 'Explainable AI', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Brand Logo */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-xl font-bold tracking-tight text-slate-900">Aegis<span className="text-blue-600">Pay</span></span>
                <span className="bg-blue-100 text-blue-700 text-[10px] font-semibold px-1.5 py-0.5 rounded-full">AI UPI</span>
                <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex items-center space-x-1" title="MongoDB Atlas Cluster0 Connected">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>MongoDB Atlas</span>
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Real-Time Fraud Shield</p>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center space-x-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 text-blue-600 font-semibold shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right Action: Balance & User Menu */}
          <div className="flex items-center space-x-4">
            {/* Balance Pill */}
            {user && (
              <div className="hidden sm:flex items-center space-x-2 bg-slate-100/80 border border-slate-200/80 px-3.5 py-1.5 rounded-full">
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <Wallet className="w-3.5 h-3.5" />
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 font-medium block leading-none">Simulated Bal</span>
                  <span className="text-sm font-bold text-slate-800 leading-none">
                    ₹{Number(user.account_balance || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <button
                  onClick={handleReset}
                  disabled={resetting}
                  title="Reset balance to ₹100,000.00"
                  className="ml-1 p-1 rounded-full text-slate-400 hover:text-emerald-700 hover:bg-emerald-100/70 transition-colors"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin text-emerald-600' : ''}`} />
                </button>
              </div>
            )}

            {/* User Profile Info */}
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="hidden lg:block text-right">
                  <span className="text-xs font-semibold text-slate-800 block leading-tight">{user.full_name}</span>
                  <span className="text-[11px] text-slate-400 block leading-tight">{user.upi_id}</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate('/login')}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm"
              >
                Sign In
              </button>
            )}
          </div>

        </div>
      </div>
    </header>
  );
}
