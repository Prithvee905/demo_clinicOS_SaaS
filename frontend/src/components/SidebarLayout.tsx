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
  X
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

    if (!activeSession && pathname !== '/login') {
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

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Activity className="w-8 h-8 animate-pulse text-violet-500 mr-2" />
        <span>Loading session...</span>
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* Mobile Top Navbar */}
      <div className="md:hidden bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-violet-500" />
          <span className="font-bold tracking-tight text-white">ClinicOS</span>
        </div>
        <button 
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="text-slate-400 hover:text-white focus:outline-none"
        >
          {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Panel */}
      <aside className={`
        fixed inset-y-0 left-0 transform md:relative md:translate-x-0 transition-transform duration-200 ease-in-out
        w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between z-40
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
        md:flex md:w-64
      `}>
        
        {/* Top Header */}
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-violet-600 to-blue-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold tracking-tight text-white text-lg">ClinicOS</h2>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">
                Code: {session.clinicCode}
              </span>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 mb-6">
            <p className="text-xs font-semibold text-slate-400">Signed In As</p>
            <p className="text-sm font-bold text-slate-200 truncate">{session.name}</p>
            <span className="mt-1 inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-violet-950 text-violet-300 border border-violet-800/50 uppercase">
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
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive 
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/10'
                      : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Actions */}
        <div className="p-6 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-slate-950 border border-slate-800 hover:border-red-900 hover:text-red-400 text-slate-400 py-2.5 rounded-xl text-sm font-semibold transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Backdrop overlay for mobile menu */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-30 md:hidden"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-6 md:p-10 relative overflow-y-auto max-h-screen">
        {children}
      </main>
    </div>
  );
}
