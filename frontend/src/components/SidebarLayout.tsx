'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getSession, setSession, apiFetch } from '@/lib/api';
import { 
  LayoutDashboard, 
  Users, 
  Stethoscope, 
  Pill, 
  FileText, 
  Receipt, 
  LogOut, 
  Activity,
  Menu,
  X,
  Sparkles
} from 'lucide-react';
import Link from 'next/link';

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setLocalSession] = useState<any>(null);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const activeSession = getSession();
    setLocalSession(activeSession);
    setLoading(false);

    if (!activeSession && pathname !== '/login' && !pathname.startsWith('/reset-password')) {
      router.push('/login');
    }
  }, [pathname, router]);

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore errors on logout
    }
    setSession(null);
    router.push('/login');
  };

  if (pathname === '/login' || pathname.startsWith('/reset-password')) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-emerald-600">
        <Activity className="w-8 h-8 animate-pulse text-emerald-500 mr-2" />
        <span className="font-semibold text-slate-700">Loading ClinicOS...</span>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Patients', path: '/patients', icon: Users },
    { name: 'Doctors', path: '/doctors', icon: Stethoscope },
    { name: 'Medicines', path: '/medicines', icon: Pill },
    { name: 'Prescriptions', path: '/prescriptions', icon: FileText },
    { name: 'Invoices', path: '/invoices', icon: Receipt },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/20 to-teal-50/30 text-slate-800 flex flex-col md:flex-row">
      
      {/* Mobile Top Navbar */}
      <div className="md:hidden bg-white/90 backdrop-blur-md border-b border-emerald-100 px-4 py-3 flex items-center justify-between z-30 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-md shadow-emerald-500/20">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="font-extrabold tracking-tight text-slate-900 text-lg">ClinicOS</span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 text-slate-600 hover:text-emerald-600 focus:outline-none rounded-lg hover:bg-emerald-50"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Panel */}
      <aside className={`
        fixed inset-y-0 left-0 transform md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
        w-64 bg-white/80 backdrop-blur-xl border-r border-emerald-100/80 flex flex-col justify-between z-40 shadow-xl shadow-emerald-950/5
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:flex md:w-64
      `}>
        
        {/* Top Header */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/25">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-black tracking-tight text-slate-900 text-xl">ClinicOS</h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              </div>
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100/80 border border-emerald-200/60 px-2 py-0.5 rounded-full inline-block mt-0.5">
                CODE: {session.clinicCode}
              </span>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="bg-gradient-to-br from-emerald-50/80 to-teal-50/50 border border-emerald-200/70 rounded-2xl p-3.5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">Logged In User</p>
              <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <p className="text-sm font-extrabold text-slate-900 truncate">{session.name}</p>
            <span className="mt-1.5 inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm uppercase tracking-wider">
              {session.role}
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                    isActive 
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/25 scale-[1.02]'
                      : 'text-slate-600 hover:bg-emerald-50/80 hover:text-emerald-700 hover:scale-[1.01]'
                  }`}
                >
                  <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-emerald-600'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-6 border-t border-emerald-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Backdrop overlay for mobile menu */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 relative overflow-y-auto max-h-screen">
        {children}
      </main>
    </div>
  );
}
