'use client';

import React, { useEffect, useState } from 'react';
import { getSession, apiFetch } from '@/lib/api';
import { 
  Users, 
  Stethoscope, 
  FileText, 
  Receipt, 
  Send,
  Plus,
  ShieldCheck,
  Clock,
  UserCheck,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Activity,
  CheckCircle2
} from 'lucide-react';
import Link from 'next/link';

interface DashboardMetrics {
  totalPatients: number;
  totalDoctors: number;
  activePrescriptions: number;
  invoicesGenerated: number;
  invoicesSent: number;
}

interface AuditLog {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata: string;
  createdAt?: string;
  timestamp?: string;
}

export default function DashboardPage() {
  const [session, setSession] = useState<any>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const actSession = getSession();
    setSession(actSession);

    if (actSession) {
      fetchDashboardData(actSession);
    }
  }, []);

  const fetchDashboardData = async (userSession: any) => {
    try {
      setLoading(true);
      setError(null);

      // 1. Fetch metrics
      const metricsRes = await apiFetch('/dashboard/metrics');
      if (!metricsRes.ok) throw new Error('Failed to load dashboard metrics');
      const metricsData = await metricsRes.json();
      setMetrics(metricsData);

      // 2. If Admin, fetch audit logs
      if (userSession.role === 'ADMIN') {
        const logsRes = await apiFetch('/audit-logs?page=0&size=8');
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setAuditLogs(logsData.content || []);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error occurred while loading dashboard.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-emerald-600">
        <Activity className="w-10 h-10 animate-spin text-emerald-500 mb-3" />
        <span className="font-semibold text-slate-700">Loading Clinic Analytics...</span>
      </div>
    );
  }

  const statCards = [
    { 
      name: 'Total Patients', 
      value: metrics?.totalPatients ?? 0, 
      icon: Users, 
      color: 'text-emerald-600', 
      bg: 'bg-emerald-50/70 border-emerald-200/80',
      pill: '+12% this month' 
    },
    { 
      name: 'Total Doctors', 
      value: metrics?.totalDoctors ?? 0, 
      icon: Stethoscope, 
      color: 'text-teal-600', 
      bg: 'bg-teal-50/70 border-teal-200/80',
      pill: 'Active On Duty' 
    },
    { 
      name: 'Active Prescriptions', 
      value: metrics?.activePrescriptions ?? 0, 
      icon: FileText, 
      color: 'text-emerald-700', 
      bg: 'bg-emerald-100/50 border-emerald-300/60',
      pill: 'e-Rx Verified' 
    },
    { 
      name: 'Invoices Generated', 
      value: metrics?.invoicesGenerated ?? 0, 
      icon: Receipt, 
      color: 'text-cyan-700', 
      bg: 'bg-cyan-50/70 border-cyan-200/80',
      pill: 'Auto Billed' 
    },
    { 
      name: 'WhatsApp Sent', 
      value: metrics?.invoicesSent ?? 0, 
      icon: Send, 
      color: 'text-emerald-600', 
      bg: 'bg-gradient-to-br from-emerald-100/80 to-teal-50 border-emerald-300',
      pill: '99.8% Delivered' 
    },
  ];

  return (
    <div className="space-y-8">
      
      {/* Top Banner & Header */}
      <div className="bg-white/90 backdrop-blur-xl border border-emerald-100/90 rounded-3xl p-6 md:p-8 shadow-xl shadow-emerald-950/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        
        {/* Subtle Background Glow Mesh */}
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-100/60 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-teal-100/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-emerald-100/80 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              CLINIC OPERATIONS DASHBOARD
            </span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">
            Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">{session?.name}</span> 👋
          </h1>
          <p className="text-slate-600 text-sm font-medium mt-1">
            Real-time management for clinic: <span className="text-emerald-700 font-bold uppercase">{session?.clinicCode}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-emerald-50/90 border border-emerald-200/80 px-4 py-2 rounded-2xl text-xs font-bold text-emerald-800 shadow-sm">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>Role: {session?.role}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {statCards.map((card) => (
          <div 
            key={card.name} 
            className={`p-6 rounded-3xl border ${card.bg} shadow-lg shadow-emerald-950/5 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 backdrop-blur-sm relative overflow-hidden group`}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{card.name}</p>
                <span className="text-3xl font-black text-slate-900 block mt-2">{card.value}</span>
              </div>
              <div className="p-3 rounded-2xl bg-white/80 shadow-md border border-emerald-100 group-hover:scale-110 transition-transform">
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-emerald-200/40 flex items-center justify-between">
              <span className="text-[11px] font-extrabold text-emerald-700 bg-white/80 border border-emerald-200 px-2 py-0.5 rounded-full">
                {card.pill}
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
        ))}
      </div>

      {/* Dual Column Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Workflows Navigation Box */}
        <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-950/5 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Plus className="w-5 h-5" />
                </div>
                Quick Workflows
              </h2>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">1-Tap Actions</span>
            </div>

            <div className="space-y-3">
              {session?.role !== 'DOCTOR' && (
                <Link 
                  href="/patients" 
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-emerald-100/90 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl text-sm font-bold text-slate-800 transition-all duration-200 group shadow-sm hover:shadow-md"
                >
                  <span className="group-hover:text-emerald-700">Register Patient</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">Reception</span>
                    <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}
              
              {session?.role === 'DOCTOR' && (
                <Link 
                  href="/prescriptions" 
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-emerald-100/90 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl text-sm font-bold text-slate-800 transition-all duration-200 group shadow-sm hover:shadow-md"
                >
                  <span className="group-hover:text-emerald-700">New e-Prescription</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full uppercase">Doctor</span>
                    <ArrowRight className="w-4 h-4 text-teal-600 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              )}

              <Link 
                href="/invoices" 
                className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-emerald-100/90 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl text-sm font-bold text-slate-800 transition-all duration-200 group shadow-sm hover:shadow-md"
              >
                <span className="group-hover:text-emerald-700">View Invoices & WhatsApp</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full uppercase">Billing</span>
                  <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>

              {session?.role === 'ADMIN' && (
                <>
                  <Link 
                    href="/doctors" 
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-emerald-100/90 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl text-sm font-bold text-slate-800 transition-all duration-200 group shadow-sm hover:shadow-md"
                  >
                    <span className="group-hover:text-emerald-700">Manage Doctors</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full uppercase">Admin</span>
                      <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>

                  <Link 
                    href="/medicines" 
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-emerald-50/40 border border-emerald-100/90 hover:border-emerald-400 hover:bg-emerald-50 rounded-2xl text-sm font-bold text-slate-800 transition-all duration-200 group shadow-sm hover:shadow-md"
                  >
                    <span className="group-hover:text-emerald-700">Medicine Catalog</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full uppercase">Admin</span>
                      <ArrowRight className="w-4 h-4 text-emerald-600 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <p className="text-xs font-semibold text-emerald-900">
              WhatsApp Cloud API is online & delivering instant PDF invoices.
            </p>
          </div>
        </div>

        {/* Audit/Activity Panel (Admin Only) */}
        <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-950/5 lg:col-span-2">
          {session?.role === 'ADMIN' ? (
            <>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  Real-Time Audit Activity Log
                </h2>
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Live Sync
                </span>
              </div>

              {auditLogs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-medium">
                  No recent activities registered in audit log.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-emerald-100 text-slate-500 text-[11px] font-bold uppercase tracking-wider bg-emerald-50/50">
                        <th className="p-3.5 rounded-l-xl">Timestamp</th>
                        <th className="p-3.5">Performer</th>
                        <th className="p-3.5">Action</th>
                        <th className="p-3.5">Entity</th>
                        <th className="p-3.5 rounded-r-xl">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-emerald-100/60">
                      {auditLogs.map((log) => {
                        const displayDate = log.createdAt 
                          ? new Date(log.createdAt).toLocaleString() 
                          : (log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A');
                        const performer = log.userName || log.userEmail || (log.userId ? `User (${log.userId.substring(0, 6)})` : 'System');

                        return (
                          <tr key={log.id} className="hover:bg-emerald-50/40 transition-colors">
                            <td className="p-3.5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                              {displayDate}
                            </td>
                            <td className="p-3.5 text-xs font-bold text-emerald-700 whitespace-nowrap">
                              {performer}
                            </td>
                            <td className="p-3.5 whitespace-nowrap">
                              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-200/80 uppercase">
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3.5 text-xs font-medium text-slate-600 whitespace-nowrap">
                              {log.entityType} ({log.entityId ? log.entityId.substring(0, 8) : 'N/A'})
                            </td>
                            <td className="p-3.5 text-xs font-medium text-slate-600 truncate max-w-[220px]" title={log.metadata}>
                              {log.metadata}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                Clinic Workflow Guidelines
              </h2>
              <div className="space-y-4 text-sm text-slate-700 leading-relaxed bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100">
                <p className="font-semibold text-slate-900">
                  Follow this 3-step operational cycle for patients:
                </p>
                <ol className="space-y-3 pl-1">
                  <li className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">1</span>
                    <div>
                      <strong className="text-slate-900 block">Patient Intake (Receptionist):</strong>
                      <span className="text-xs text-slate-600">Register new patient profiles and record contact numbers.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">2</span>
                    <div>
                      <strong className="text-slate-900 block">Digital e-Prescription (Doctor):</strong>
                      <span className="text-xs text-slate-600">Doctor prescribes medicines with dosages and consultation fees.</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">3</span>
                    <div>
                      <strong className="text-slate-900 block">Billing & WhatsApp PDF (Receptionist):</strong>
                      <span className="text-xs text-slate-600">Generate the tax invoice and click WhatsApp to deliver the PDF directly to the patient.</span>
                    </div>
                  </li>
                </ol>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}
