'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getSession, setSession, apiFetch } from '@/lib/api';
import { Activity, ShieldAlert, CheckCircle2, Sparkles, Lock, Mail, Building, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [forgotPasswordClinicCode, setForgotPasswordClinicCode] = useState('');
  const [forgotPasswordMessage, setForgotPasswordMessage] = useState<string | null>(null);

  // Login inputs
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginClinicCode, setLoginClinicCode] = useState('');

  // Registration inputs
  const [clinicName, setClinicName] = useState('');
  const [clinicCode, setClinicCode] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [clinicPhone, setClinicPhone] = useState('');
  const [clinicEmail, setClinicEmail] = useState('');
  const [clinicAddress, setClinicAddress] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  useEffect(() => {
    if (getSession()) {
      router.push('/');
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: loginEmail,
          password: loginPassword,
          clinicCode: loginClinicCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed. Please check your credentials.');
      }

      setSession({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        clinicCode: data.clinicCode,
        role: data.role,
        name: data.name,
        email: data.email,
        id: data.id,
      });

      router.push('/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await apiFetch('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          clinicName,
          clinicCode: clinicCode || undefined,
          ownerName,
          clinicPhone,
          clinicEmail,
          clinicAddress,
          adminEmail,
          adminName,
          adminPhone,
          adminPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Clinic registration failed.');
      }

      setSuccess(`Clinic registered successfully! Code: ${data.clinicCode}. You can now login.`);
      setLoginClinicCode(data.clinicCode);
      setLoginEmail(adminEmail);
      setActiveTab('login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotPasswordMessage(null);
    setLoading(true);

    try {
      const response = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: forgotPasswordEmail,
          clinicCode: forgotPasswordClinicCode,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to request password reset.');
      }

      setForgotPasswordMessage(data.message || 'Password reset link sent to your email.');
    } catch (err: any) {
      setForgotPasswordMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50/40 to-teal-50/50 flex flex-col justify-center items-center p-4 md:p-6 relative overflow-hidden">
      
      {/* Background Mesh Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-200/50 rounded-full blur-3xl -z-10 pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-200/40 rounded-full blur-3xl -z-10 pointer-events-none"></div>

      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl border border-emerald-100/90 rounded-3xl p-6 md:p-8 shadow-2xl shadow-emerald-950/10 space-y-6 my-8">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-600/30 mb-3">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">ClinicOS</h1>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-200 uppercase">
              Healthcare SaaS
            </span>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">
            Enterprise Clinic Management, Billing & WhatsApp Engine
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-emerald-50/80 p-1.5 rounded-2xl border border-emerald-200/60">
          <button
            type="button"
            onClick={() => { setActiveTab('login'); setError(null); setShowForgotPassword(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'login' && !showForgotPassword
                ? 'bg-white text-emerald-800 shadow-md shadow-emerald-950/5'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setActiveTab('register'); setError(null); setShowForgotPassword(false); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'register'
                ? 'bg-white text-emerald-800 shadow-md shadow-emerald-950/5'
                : 'text-slate-600 hover:text-emerald-700'
            }`}
          >
            Register Clinic
          </button>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {showForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <h2 className="text-sm font-bold text-slate-800 text-center">Reset Account Password</h2>
            {forgotPasswordMessage && (
              <p className="text-xs text-center font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
                {forgotPasswordMessage}
              </p>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Clinic Code</label>
              <input
                type="text"
                required
                placeholder="e.g. city-care"
                value={forgotPasswordClinicCode}
                onChange={(e) => setForgotPasswordClinicCode(e.target.value.toLowerCase())}
                className="w-full bg-slate-50 border border-emerald-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none transition-all font-semibold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Registered Email</label>
              <input
                type="email"
                required
                placeholder="doctor@clinic.com"
                value={forgotPasswordEmail}
                onChange={(e) => setForgotPasswordEmail(e.target.value)}
                className="w-full bg-slate-50 border border-emerald-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 focus:outline-none transition-all font-semibold"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3 rounded-xl text-xs shadow-lg shadow-emerald-600/25 transition-all"
            >
              {loading ? 'Sending Request...' : 'Send Password Reset Email'}
            </button>
            <button
              type="button"
              onClick={() => setShowForgotPassword(false)}
              className="w-full text-xs text-slate-500 hover:text-emerald-700 font-bold text-center block pt-2"
            >
              Back to Sign In
            </button>
          </form>
        ) : activeTab === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Clinic Code
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. city-care"
                  value={loginClinicCode}
                  onChange={(e) => setLoginClinicCode(e.target.value.toLowerCase())}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 font-semibold focus:outline-none transition-all"
                />
                <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="doctor@clinic.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 font-semibold focus:outline-none transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 font-semibold focus:outline-none transition-all"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-xl text-sm shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all flex items-center justify-center gap-2 mt-6"
            >
              <span>{loading ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-3">
              <h2 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                1. Clinic Demographics
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Clinic Name</label>
                <input
                  type="text"
                  required
                  placeholder="City Care Hospital"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Clinic Code</label>
                  <input
                    type="text"
                    placeholder="city-care"
                    value={clinicCode}
                    onChange={(e) => setClinicCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Phone</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={clinicPhone}
                    onChange={(e) => setClinicPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <h2 className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                2. Admin Administrator Account
              </h2>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Admin Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Dr. Dharani Boddu"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3.5 py-2 text-xs text-slate-800 font-semibold focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Admin Email</label>
                  <input
                    type="email"
                    required
                    placeholder="admin@clinic.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Admin Password</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 rounded-xl text-xs shadow-lg shadow-emerald-600/25 transition-all mt-4"
            >
              {loading ? 'Registering Workspace...' : 'Create Clinic Workspace'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
