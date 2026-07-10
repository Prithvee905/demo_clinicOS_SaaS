'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, getSession } from '@/lib/api';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Pill, 
  CheckCircle2, 
  ShieldAlert,
  Loader2
} from 'lucide-react';

interface Medicine {
  id: string;
  medicineCode: string;
  medicineName: string;
  unitPrice: number;
  gstPercentage: number;
  unitType: string;
  version: number;
}

export default function MedicinesPage() {
  const [session, setSession] = useState<any>(null);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);

  const [medicineCode, setMedicineCode] = useState('');
  const [medicineName, setMedicineName] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [gstPercentage, setGstPercentage] = useState('12.0'); // default 12%
  const [unitType, setUnitType] = useState('Tablet');
  const [formLoading, setFormLoading] = useState(false);

  const fetchMedicines = useCallback(async (searchQuery = '', pageNumber = 0) => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch(`/medicines?search=${encodeURIComponent(searchQuery)}&page=${pageNumber}&size=10`);
      if (!res.ok) throw new Error('Failed to load medicine catalog');
      const data = await res.json();
      setMedicines(data.content || []);
      setTotalPages(data.totalPages || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSession(getSession());
    fetchMedicines(searchTerm, page);
  }, [page, fetchMedicines]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(0);
    fetchMedicines(e.target.value, 0);
  };

  const openCreateModal = () => {
    setEditingMedicine(null);
    setMedicineCode('');
    setMedicineName('');
    setUnitPrice('');
    setGstPercentage('12.00');
    setUnitType('Tablet');
    setIsModalOpen(true);
  };

  const openEditModal = (med: Medicine) => {
    setEditingMedicine(med);
    setMedicineCode(med.medicineCode);
    setMedicineName(med.medicineName);
    setUnitPrice(String(med.unitPrice));
    setGstPercentage(String(med.gstPercentage));
    setUnitType(med.unitType);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFormLoading(true);

    try {
      const payload = {
        medicineCode: medicineCode.toUpperCase().replaceAll(' ', '-'),
        medicineName,
        unitPrice: parseFloat(unitPrice),
        gstPercentage: parseFloat(gstPercentage),
        unitType,
      };

      let res;
      if (editingMedicine) {
        res = await apiFetch(`/medicines/${editingMedicine.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch('/medicines', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Error occurred while saving medicine catalog item.');
      }

      setSuccess(`Medicine ${editingMedicine ? 'updated' : 'added'} successfully!`);
      setIsModalOpen(false);
      fetchMedicines(searchTerm, page);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to soft-delete this medicine?')) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch(`/medicines/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || 'Failed to delete medicine');
      }

      setSuccess('Medicine catalog item soft-deleted successfully!');
      fetchMedicines(searchTerm, page);
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
            <Pill className="w-8 h-8 text-violet-500" />
            Medicine Catalog
          </h1>
          <p className="text-slate-400 text-sm mt-1">Manage prescription drug catalogs, prices, and GST rates</p>
        </div>
        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-500 hover:to-blue-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:shadow-violet-500/10 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-3.5 w-4 h-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search catalog by name or code..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full bg-slate-900 border border-slate-800 focus:border-violet-500 rounded-xl pl-11 pr-4 py-3 text-slate-200 focus:outline-none transition-all placeholder:text-slate-500"
        />
      </div>

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase bg-slate-950/40">
                <th className="px-6 py-4">Code</th>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Unit Type</th>
                <th className="px-6 py-4">Unit Price (INR)</th>
                <th className="px-6 py-4">GST Rate (%)</th>
                <th className="px-6 py-4">Price + GST</th>
                {isAdmin && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-6 py-10 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto mb-2" />
                    Loading catalog list...
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="px-6 py-10 text-center text-slate-500 italic">
                    Catalog is empty. Add medicines to build prescriptions.
                  </td>
                </tr>
              ) : (
                medicines.map((med) => {
                  const withGst = med.unitPrice * (1 + med.gstPercentage / 100);
                  return (
                    <tr key={med.id} className="hover:bg-slate-800/20 text-slate-300">
                      <td className="px-6 py-4 font-mono font-bold text-slate-400 whitespace-nowrap">{med.medicineCode}</td>
                      <td className="px-6 py-4 font-bold text-white whitespace-nowrap">{med.medicineName}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="bg-slate-950 text-slate-300 px-2 py-0.5 rounded text-xs font-semibold border border-slate-800">
                          {med.unitType}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-semibold text-slate-300">INR {med.unitPrice.toFixed(2)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-amber-500 font-semibold">{med.gstPercentage.toFixed(2)}%</td>
                      <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-400">INR {withGst.toFixed(2)}</td>
                      {isAdmin && (
                        <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => openEditModal(med)}
                            className="p-1.5 bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg transition-all"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(med.id)}
                            className="p-1.5 bg-slate-950 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-950 rounded-lg transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Page {page + 1} of {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 0}
                onClick={() => setPage(page - 1)}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={page >= totalPages - 1}
                onClick={() => setPage(page + 1)}
                className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg disabled:opacity-40 disabled:pointer-events-none transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                {editingMedicine ? 'Edit Catalog Entry' : 'Add New Medicine'}
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
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Medicine Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 500mg"
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Medicine Code
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PCT-500"
                    value={medicineCode}
                    onChange={(e) => setMedicineCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Unit Type
                  </label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                  >
                    {['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Other'].map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    Unit Price (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="15.50"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                    GST Rate (%)
                  </label>
                  <select
                    value={gstPercentage}
                    onChange={(e) => setGstPercentage(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                  >
                    <option value="0.0">0% (Exempt)</option>
                    <option value="5.0">5%</option>
                    <option value="12.0">12%</option>
                    <option value="18.0">18%</option>
                    <option value="28.0">28%</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={formLoading}
                className="w-full bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-500 hover:to-blue-400 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-violet-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none mt-6"
              >
                {formLoading ? 'Saving product...' : (editingMedicine ? 'Update Medicine' : 'Add to Catalog')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
