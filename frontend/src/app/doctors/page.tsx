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
  Loader2
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
      if (!res.ok) throw new Error('Failed to load clinic doctors catalog');
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
    setConsultationFee(String(doc.consultationFee));
    setEmail(doc.email);
    setPhone(doc.phone);
    setPassword(''); // keep blank if not changing
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFormLoading(true);

    try {
      const payload = {
        name,
        specialization,
        registrationNumber,
        consultationFee: parseFloat(consultationFee),
        email,
        phone,
        password: password || undefined,
      };

      let res;
      if (editingDoctor) {
        res = await apiFetch(`/doctors/${editingDoctor.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        if (!password) throw new Error('Password is required for new doctor accounts');
        res = await apiFetch('/doctors', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error occurred while saving doctor profile.');
      }

      setSuccess(`Doctor ${editingDoctor ? 'updated' : 'added'} successfully!`);
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
    if (!confirm('Are you sure you want to soft-delete this doctor? This disables their login account.')) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch(`/doctors/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete doctor');
      }

      setSuccess('Doctor profile soft-deleted successfully!');
      fetchDoctors();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isAdmin = session?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Stethoscope className="w-8 h-8 text-violet-500" />
            Clinic Doctors
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage specialist profiles and consultation fees</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-500 hover:to-blue-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:shadow-violet-500/10 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Doctor</span>
          </button>
        )}
      </div>

      {success && (
        <div className="p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl flex items-center gap-2 text-emerald-300 text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <span>{success}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-2 text-red-300 text-sm">
          <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid listing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto mb-2" />
            Loading doctors directory...
          </div>
        ) : doctors.length === 0 ? (
          <div className="col-span-full py-20 text-center text-slate-500 italic">
            No doctors profiles registered in this clinic.
          </div>
        ) : (
          doctors.map((doc) => (
            <div key={doc.id} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
              
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">Dr. {doc.name}</h3>
                    <p className="text-xs text-violet-400 font-semibold tracking-wider uppercase mt-0.5">
                      {doc.specialization}
                    </p>
                  </div>
                  <span className="text-xs bg-slate-950 text-slate-300 border border-slate-800 px-2 py-1 rounded font-bold">
                    Reg: {doc.registrationNumber}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-400 border-t border-slate-800/60 pt-4">
                  <div className="flex justify-between">
                    <span>Consultation Fee:</span>
                    <strong className="text-emerald-400">INR {doc.consultationFee.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between truncate">
                    <span>Email:</span>
                    <span className="text-slate-300">{doc.email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Phone:</span>
                    <span className="text-slate-300">{doc.phone}</span>
                  </div>
                </div>
              </div>

              {isAdmin && (
                <div className="flex justify-end gap-2 border-t border-slate-800/60 pt-4 mt-6">
                  <button
                    onClick={() => openEditModal(doc)}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg transition-all"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(doc.id)}
                    className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-red-950 text-slate-500 hover:text-red-400 rounded-lg transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              )}

            </div>
          ))
        )}
      </div>

      {/* Slide-over Drawer / Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
            
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                {editingDoctor ? 'Edit Doctor Profile' : 'Enroll New Doctor'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white focus:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="p-4 bg-red-950/40 border border-red-800/60 rounded-xl flex items-center gap-2 text-red-300 text-sm">
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Doctor Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Consultation Fee (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="500.00"
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dentist, Cardiologist"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Registration No
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. DMC-12345"
                    value={registrationNumber}
                    onChange={(e) => setRegistrationNumber(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                  />
                </div>
              </div>

              {/* Login profile */}
              <div className="space-y-4 border-t border-slate-800/80 pt-4">
                <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wide">
                  Credentials & Contact Profile
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Login Email</label>
                    <input
                      type="email"
                      required
                      placeholder="suresh@clinic.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={!!editingDoctor}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Contact Phone</label>
                    <input
                      type="text"
                      required
                      placeholder="9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">
                    {editingDoctor ? 'Change Password (Leave blank to keep current)' : 'Account Password'}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required={!editingDoctor}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-500 hover:to-blue-400 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-violet-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-6"
              >
                {formLoading ? 'Saving changes...' : (editingDoctor ? 'Update Profile' : 'Enroll Doctor')}
              </button>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
