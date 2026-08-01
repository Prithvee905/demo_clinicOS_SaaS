'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch, getSession } from '@/lib/api';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Stethoscope, 
  CheckCircle2, 
  ShieldAlert,
  Loader2,
  PhoneCall,
  Mail,
  Award,
  DollarSign,
  Sparkles
} from 'lucide-react';

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  registrationNumber: string;
  consultationFee: number;
  email: string;
  phone: string;
  version: number;
}

export default function DoctorsPage() {
  const [session, setSession] = useState<any>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/doctors');
      if (!res.ok) throw new Error('Failed to load clinic doctor roster');
      const data = await res.json();
      setDoctors(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSession(getSession());
    fetchDoctors();
  }, []);

  const openCreateModal = () => {
    setEditingDoctor(null);
    setName('');
    setSpecialization('');
    setRegistrationNumber('');
    setConsultationFee('');
    setEmail('');
    setPhone('');
    setPassword('');
    setIsModalOpen(true);
  };

  const openEditModal = (doc: Doctor) => {
    setEditingDoctor(doc);
    setName(doc.name);
    setSpecialization(doc.specialization);
    setRegistrationNumber(doc.registrationNumber);
    setConsultationFee(doc.consultationFee.toString());
    setEmail(doc.email);
    setPhone(doc.phone);
    setPassword('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFormLoading(true);

    const payload: any = {
      name,
      specialization,
      registrationNumber,
      consultationFee: parseFloat(consultationFee) || 0,
      email,
      phone,
    };

    if (password) {
      payload.password = password;
    }

    try {
      let res;
      if (editingDoctor) {
        payload.version = editingDoctor.version;
        res = await apiFetch(`/doctors/${editingDoctor.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        payload.password = password || 'Doctor@123';
        res = await apiFetch('/doctors', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');

      setSuccess(editingDoctor ? 'Doctor profile updated!' : `Doctor Dr. ${data.name} added to clinic staff!`);
      setIsModalOpen(false);
      fetchDoctors();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this doctor from clinic roster?')) return;
    try {
      const res = await apiFetch(`/doctors/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to remove doctor');
      setSuccess('Doctor profile removed.');
      fetchDoctors();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-emerald-950/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-100/60 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-emerald-100/80 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 uppercase">
              <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
              CLINIC MEDICAL STAFF DIRECTORY
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Doctors & Specialists
          </h1>
          <p className="text-slate-600 text-sm font-medium mt-1">
            Manage consulting physicians, medical registration numbers, and default consultation fees.
          </p>
        </div>

        {session?.role === 'ADMIN' && (
          <button
            onClick={openCreateModal}
            className="px-5 py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Doctor to Staff</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Doctors Grid / Table Container */}
      <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-950/5">
        {loading ? (
          <div className="p-12 text-center text-emerald-600 font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading Doctor Staff...</span>
          </div>
        ) : doctors.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Stethoscope className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
            <p className="font-bold text-slate-800 text-lg">No doctors registered yet.</p>
            <p className="text-xs text-slate-500 mt-1">Click Add Doctor to Staff above to register consulting doctors.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <div 
                key={doc.id} 
                className="bg-gradient-to-br from-white via-slate-50/50 to-emerald-50/20 border border-emerald-100/90 rounded-3xl p-6 shadow-lg shadow-emerald-950/5 hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-1 transition-all duration-300 relative group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/25">
                      <Stethoscope className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-extrabold text-emerald-800 bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-full uppercase">
                      {doc.specialization}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-slate-900">Dr. {doc.name}</h3>
                  
                  <div className="mt-4 space-y-2 text-xs text-slate-600 font-semibold">
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>Reg #: <strong className="text-slate-900">{doc.registrationNumber || 'N/A'}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <PhoneCall className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{doc.phone}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span>{doc.email}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-emerald-100 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">Consultation Fee</span>
                    <span className="text-lg font-black text-emerald-700">INR {doc.consultationFee.toFixed(2)}</span>
                  </div>

                  {session?.role === 'ADMIN' && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditModal(doc)}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-all"
                        title="Edit Doctor"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all"
                        title="Delete Doctor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Doctor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-100 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">
                {editingDoctor ? 'Edit Doctor Profile' : 'Add New Doctor to Staff'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Doctor Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dharani Boddu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Specialization</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Cardiology"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Reg Number (MCI/NMC)</label>
                  <input
                    type="text"
                    required
                    placeholder="MCI-12345"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Consultation Fee (INR)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="500.00"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="doctor@clinic.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              {!editingDoctor && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Login Password</label>
                  <input
                    type="password"
                    placeholder="•••••••• (Default: Doctor@123)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingDoctor ? 'Update Profile' : 'Save Doctor Profile'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
