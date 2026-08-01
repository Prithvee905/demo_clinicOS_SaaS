'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, getSession } from '@/lib/api';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  CheckCircle2, 
  ShieldAlert,
  Loader2,
  PhoneCall,
  User,
  Calendar,
  MapPin,
  HeartPulse
} from 'lucide-react';

interface Patient {
  id: string;
  patientCode: string;
  name: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  address: string;
  bloodGroup: string;
  createdAt: string;
}

export default function PatientsPage() {
  const [session, setSession] = useState<any>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('Male');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [address, setAddress] = useState('');
  const [bloodGroup, setBloodGroup] = useState('O+');

  const fetchPatients = useCallback(async (currentPage = 0, query = '') => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `/patients?page=${currentPage}&size=10`;
      if (query.trim()) {
        url = `/patients/search?query=${encodeURIComponent(query.trim())}&page=${currentPage}&size=10`;
      }

      const res = await apiFetch(url);
      if (!res.ok) throw new Error('Failed to load clinic patient records');
      
      const data = await res.json();
      setPatients(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSession(getSession());
    fetchPatients(0, '');
  }, [fetchPatients]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchPatients(0, searchTerm);
  };

  const openCreateModal = () => {
    setEditingPatient(null);
    setName('');
    setPhone('');
    setGender('Male');
    setDateOfBirth('');
    setAddress('');
    setBloodGroup('O+');
    setIsModalOpen(true);
  };

  const openEditModal = (patient: Patient) => {
    setEditingPatient(patient);
    setName(patient.name);
    setPhone(patient.phone);
    setGender(patient.gender || 'Male');
    setDateOfBirth(patient.dateOfBirth || '');
    setAddress(patient.address || '');
    setBloodGroup(patient.bloodGroup || 'O+');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const payload = {
      name,
      phone,
      gender,
      dateOfBirth: dateOfBirth || null,
      address,
      bloodGroup,
    };

    try {
      let res;
      if (editingPatient) {
        res = await apiFetch(`/patients/${editingPatient.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch('/patients', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');

      setSuccess(editingPatient ? 'Patient record updated successfully!' : `Patient ${data.name} registered! Code: ${data.patientCode}`);
      setIsModalOpen(false);
      fetchPatients(page, searchTerm);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this patient record?')) return;
    try {
      const res = await apiFetch(`/patients/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete patient');
      setSuccess('Patient deleted successfully!');
      fetchPatients(page, searchTerm);
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
              <Users className="w-3.5 h-3.5 text-emerald-600" />
              PATIENT MANAGEMENT DIRECTORY
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Patient Registry
          </h1>
          <p className="text-slate-600 text-sm font-medium mt-1">
            Register and manage patient profiles, demographics, contact numbers, and medical history.
          </p>
        </div>

        {session?.role !== 'DOCTOR' && (
          <button
            onClick={openCreateModal}
            className="px-5 py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Register New Patient</span>
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

      {/* Search Bar & Table Card */}
      <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-950/5 space-y-6">
        
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search patients by name, phone number, or patient code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-2xl pl-10 pr-4 py-3 text-sm text-slate-800 font-semibold focus:outline-none transition-all"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-4" />
          </div>
          <button
            type="submit"
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-md shadow-emerald-600/20 transition-all"
          >
            Search
          </button>
        </form>

        {/* Patients Table */}
        {loading ? (
          <div className="p-12 text-center text-emerald-600 font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading Patients...</span>
          </div>
        ) : patients.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
            <p className="font-bold text-slate-800 text-lg">No patient records found.</p>
            <p className="text-xs text-slate-500 mt-1">Click Register New Patient above to add a patient to the clinic directory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/60 border-b border-emerald-100 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="p-4 rounded-l-2xl">Code</th>
                  <th className="p-4">Patient Name</th>
                  <th className="p-4">Contact Phone</th>
                  <th className="p-4">Gender</th>
                  <th className="p-4">Blood Group</th>
                  <th className="p-4">Date Registered</th>
                  <th className="p-4 text-right rounded-r-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100/60 text-sm">
                {patients.map((pt) => (
                  <tr key={pt.id} className="hover:bg-emerald-50/40 transition-colors group">
                    <td className="p-4 font-black text-emerald-700 whitespace-nowrap">
                      <span className="bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-full text-xs">
                        {pt.patientCode}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-emerald-600" />
                        <span>{pt.name}</span>
                      </div>
                    </td>

                    <td className="p-4 text-slate-700 font-semibold whitespace-nowrap">
                      <span className="flex items-center gap-1.5 text-xs">
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                        {pt.phone}
                      </span>
                    </td>

                    <td className="p-4 text-slate-600 font-semibold whitespace-nowrap text-xs">
                      {pt.gender}
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 w-fit">
                        <HeartPulse className="w-3 h-3 text-rose-500" />
                        {pt.bloodGroup || 'N/A'}
                      </span>
                    </td>

                    <td className="p-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(pt.createdAt).toLocaleDateString()}
                      </span>
                    </td>

                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(pt)}
                          className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-all"
                          title="Edit Patient"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {session?.role === 'ADMIN' && (
                          <button
                            onClick={() => handleDelete(pt.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all"
                            title="Delete Patient"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center pt-4 border-t border-emerald-100">
            <button
              disabled={page === 0}
              onClick={() => { setPage(page - 1); fetchPatients(page - 1, searchTerm); }}
              className="px-4 py-2 bg-slate-100 hover:bg-emerald-100 text-slate-700 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs font-bold text-slate-600">
              Page {page + 1} of {totalPages}
            </span>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => { setPage(page + 1); fetchPatients(page + 1, searchTerm); }}
              className="px-4 py-2 bg-slate-100 hover:bg-emerald-100 text-slate-700 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Register/Edit Patient Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-100 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6">
            
            <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">
                {editingPatient ? 'Edit Patient Details' : 'Register New Patient'}
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
                <label className="block text-xs font-bold text-slate-600 mb-1">Full Patient Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                />
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
                  <label className="block text-xs font-bold text-slate-600 mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  >
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Residential Address</label>
                <textarea
                  rows={2}
                  placeholder="Street address, City..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                />
              </div>

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
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all"
                >
                  {editingPatient ? 'Update Patient' : 'Save Patient Record'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
