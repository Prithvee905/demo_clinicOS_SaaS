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
  UserCheck
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
  action: string;
  entityType: string;
  entityId: string;
  metadata: string;
  timestamp: string;
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Clock className="w-8 h-8 animate-spin text-violet-500 mb-2" />
        <span>Loading dashboard metrics...</span>
      </div>
    );
  }

  const statCards = [
    { name: 'Total Patients', value: metrics?.totalPatients ?? 0, icon: Users, color: 'text-blue-400', bg: 'bg-blue-950/30 border-blue-900/50' },
    { name: 'Total Doctors', value: metrics?.totalDoctors ?? 0, icon: Stethoscope, color: 'text-violet-400', bg: 'bg-violet-950/30 border-violet-900/50' },
    { name: 'Active Prescriptions', value: metrics?.activePrescriptions ?? 0, icon: FileText, color: 'text-amber-400', bg: 'bg-amber-950/30 border-amber-900/50' },
    { name: 'Invoices Generated', value: metrics?.invoicesGenerated ?? 0, icon: Receipt, color: 'text-emerald-400', bg: 'bg-emerald-950/30 border-emerald-900/50' },
    { name: 'Invoices Sent', value: metrics?.invoicesSent ?? 0, icon: Send, color: 'text-cyan-400', bg: 'bg-cyan-950/30 border-cyan-900/50' },
  ];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome back, {session?.name}
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Clinic dashboard for clinic code: <span className="text-violet-400 font-bold uppercase">{session?.clinicCode}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-semibold text-slate-300">
          <UserCheck className="w-4 h-4 text-violet-400" />
          <span>Role: {session?.role}</span>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/30 border border-red-900 text-red-300 rounded-xl text-sm">
          {error}
        </div>
      )}

      {/* Metrics Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {statCards.map((card) => (
          <div key={card.name} className={`p-6 rounded-2xl border ${card.bg} shadow-lg backdrop-blur-sm`}>
            <div className="flex justify-between items-start">
              <span className="text-2xl font-black text-white">{card.value}</span>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-xs font-medium text-slate-400 mt-2 uppercase tracking-wider">{card.name}</p>
          </div>
        ))}
      </div>

      {/* Dual Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Quick Actions Panel */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl lg:col-span-1">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-violet-400" />
            Quick Workflows
          </h2>
          <div className="space-y-3">
            {session?.role !== 'DOCTOR' && (
              <Link 
                href="/patients" 
                className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 hover:border-violet-500 rounded-xl text-sm font-semibold transition-all group"
              >
                <span className="text-slate-300 group-hover:text-white">Register Patient</span>
                <span className="text-xs bg-slate-800 text-slate-400 group-hover:bg-violet-950 group-hover:text-violet-400 px-2 py-1 rounded">Reception</span>
              </Link>
            )}
            
            {session?.role === 'DOCTOR' && (
              <Link 
                href="/prescriptions" 
                className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 hover:border-violet-500 rounded-xl text-sm font-semibold transition-all group"
              >
                <span className="text-slate-300 group-hover:text-white">New Prescription</span>
                <span className="text-xs bg-slate-800 text-slate-400 group-hover:bg-violet-950 group-hover:text-violet-400 px-2 py-1 rounded">Doctor</span>
              </Link>
            )}

            <Link 
              href="/invoices" 
              className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 hover:border-violet-500 rounded-xl text-sm font-semibold transition-all group"
            >
              <span className="text-slate-300 group-hover:text-white">View Billing Invoices</span>
              <span className="text-xs bg-slate-800 text-slate-400 group-hover:bg-violet-950 group-hover:text-violet-400 px-2 py-1 rounded">Billing</span>
            </Link>

            {session?.role === 'ADMIN' && (
              <>
                <Link 
                  href="/doctors" 
                  className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 hover:border-violet-500 rounded-xl text-sm font-semibold transition-all group"
                >
                  <span className="text-slate-300 group-hover:text-white">Add Clinic Doctor</span>
                  <span className="text-xs bg-slate-800 text-slate-400 group-hover:bg-violet-950 group-hover:text-violet-400 px-2 py-1 rounded">Admin</span>
                </Link>
                <Link 
                  href="/medicines" 
                  className="flex items-center justify-between p-3.5 bg-slate-950 border border-slate-800 hover:border-violet-500 rounded-xl text-sm font-semibold transition-all group"
                >
                  <span className="text-slate-300 group-hover:text-white">Manage Catalog Medicines</span>
                  <span className="text-xs bg-slate-800 text-slate-400 group-hover:bg-violet-950 group-hover:text-violet-400 px-2 py-1 rounded">Admin</span>
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Audit/Activity Panel (Admin Only) */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl lg:col-span-2">
          {session?.role === 'ADMIN' ? (
            <>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                Clinic Activity Logs
              </h2>
              {auditLogs.length === 0 ? (
                <p className="text-slate-400 text-sm italic">No recent activities registered.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase">
                        <th className="pb-3">Timestamp</th>
                        <th className="pb-3">Action</th>
                        <th className="pb-3">Entity</th>
                        <th className="pb-3">Metadata</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {auditLogs.map((log) => (
                        <tr key={log.id} className="text-slate-300">
                          <td className="py-3 text-xs text-slate-500 whitespace-nowrap">
                            {new Date(log.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 whitespace-nowrap">
                            <span className="bg-slate-800 text-slate-300 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-700 uppercase">
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 text-xs text-slate-400 whitespace-nowrap">
                            {log.entityType} ({log.entityId.substring(0, 8)})
                          </td>
                          <td className="py-3 text-xs text-slate-400 truncate max-w-[200px]">
                            {log.metadata}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-violet-400" />
                SaaS Workflow Guidelines
              </h2>
              <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
                <p>
                  To manage a patient's cycle from arrival to discharge:
                </p>
                <ol className="list-decimal list-inside space-y-2 text-slate-400 pl-2">
                  <li>
                    <strong className="text-slate-300">Register the Patient:</strong> Go to the Patients page to create a patient profile.
                  </li>
                  <li>
                    <strong className="text-slate-300">Consultation / Prescription:</strong> The consulting doctor logs in and opens the patient profile to write a clinical prescription (which is saved as a draft and then completed).
                  </li>
                  <li>
                    <strong className="text-slate-300">Billing:</strong> The reception team finds the completed prescription, generates the invoice bill, downloads the generated PDF, and dispatches the billing link directly to the patient's phone via the WhatsApp API.
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
