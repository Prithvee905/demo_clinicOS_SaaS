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
  Loader2,
  Tag,
  DollarSign
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
  const [gstPercentage, setGstPercentage] = useState('12.0');
  const [unitType, setUnitType] = useState('Tablet');
  const [formLoading, setFormLoading] = useState(false);

  const fetchMedicines = useCallback(async (searchQuery = '', pageNumber = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      let url = `/medicines?page=${pageNumber}&size=10`;
      if (searchQuery.trim()) {
        url = `/medicines/search?query=${encodeURIComponent(searchQuery.trim())}&page=${pageNumber}&size=10`;
      }

      const res = await apiFetch(url);
      if (!res.ok) throw new Error('Failed to load clinic medicine catalog');
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
    fetchMedicines('', 0);
  }, [fetchMedicines]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
    fetchMedicines(searchTerm, 0);
  };

  const openCreateModal = () => {
    setEditingMedicine(null);
    setMedicineCode('');
    setMedicineName('');
    setUnitPrice('');
    setGstPercentage('12.0');
    setUnitType('Tablet');
    setIsModalOpen(true);
  };

  const openEditModal = (med: Medicine) => {
    setEditingMedicine(med);
    setMedicineCode(med.medicineCode);
    setMedicineName(med.medicineName);
    setUnitPrice(med.unitPrice.toString());
    setGstPercentage(med.gstPercentage.toString());
    setUnitType(med.unitType || 'Tablet');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setFormLoading(true);

    const payload: any = {
      medicineCode: medicineCode || undefined,
      medicineName,
      unitPrice: parseFloat(unitPrice) || 0,
      gstPercentage: parseFloat(gstPercentage) || 0,
      unitType,
    };

    try {
      let res;
      if (editingMedicine) {
        payload.version = editingMedicine.version;
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
      if (!res.ok) throw new Error(data.message || 'Operation failed');

      setSuccess(editingMedicine ? 'Medicine details updated!' : `Medicine ${data.medicineName} added to catalog! Code: ${data.medicineCode}`);
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
    if (!confirm('Are you sure you want to delete this medicine from catalog?')) return;
    try {
      const res = await apiFetch(`/medicines/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete medicine');
      setSuccess('Medicine item deleted.');
      fetchMedicines(searchTerm, page);
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
              <Pill className="w-3.5 h-3.5 text-emerald-600" />
              MEDICINE & PHARMACEUTICAL CATALOG
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Medicine Catalog
          </h1>
          <p className="text-slate-600 text-sm font-medium mt-1">
            Manage catalog drugs, unit pricing, GST tax rates, and dosage packaging.
          </p>
        </div>

        {session?.role === 'ADMIN' && (
          <button
            onClick={openCreateModal}
            className="px-5 py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add New Medicine</span>
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

      {/* Search & Medicines Table Card */}
      <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-950/5 space-y-6">
        
        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search catalog by medicine name or drug code..."
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

        {/* Medicines Table */}
        {loading ? (
          <div className="p-12 text-center text-emerald-600 font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading Medicine Catalog...</span>
          </div>
        ) : medicines.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Pill className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
            <p className="font-bold text-slate-800 text-lg">No medicine items found.</p>
            <p className="text-xs text-slate-500 mt-1">Click Add New Medicine above to populate the pharmacy catalog.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/60 border-b border-emerald-100 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="p-4 rounded-l-2xl">Drug Code</th>
                  <th className="p-4">Medicine Name</th>
                  <th className="p-4">Unit Packaging</th>
                  <th className="p-4">Unit Price</th>
                  <th className="p-4">GST Tax</th>
                  <th className="p-4 text-right rounded-r-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100/60 text-sm">
                {medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-emerald-50/40 transition-colors group">
                    <td className="p-4 font-black text-emerald-700 whitespace-nowrap">
                      <span className="bg-emerald-100/80 border border-emerald-200 px-2.5 py-1 rounded-full text-xs">
                        {med.medicineCode}
                      </span>
                    </td>

                    <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Pill className="w-4 h-4 text-emerald-600" />
                        <span>{med.medicineName}</span>
                      </div>
                    </td>

                    <td className="p-4 text-slate-600 font-semibold whitespace-nowrap text-xs">
                      {med.unitType || 'Tablet'}
                    </td>

                    <td className="p-4 font-black text-emerald-700 whitespace-nowrap">
                      INR {med.unitPrice.toFixed(2)}
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {med.gstPercentage}% GST
                      </span>
                    </td>

                    <td className="p-4 text-right whitespace-nowrap">
                      {session?.role === 'ADMIN' && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(med)}
                            className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-all"
                            title="Edit Medicine"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(med.id)}
                            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all"
                            title="Delete Medicine"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
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
              onClick={() => { setPage(page - 1); fetchMedicines(searchTerm, page - 1); }}
              className="px-4 py-2 bg-slate-100 hover:bg-emerald-100 text-slate-700 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs font-bold text-slate-600">
              Page {page + 1} of {totalPages}
            </span>
            <button
              disabled={page + 1 >= totalPages}
              onClick={() => { setPage(page + 1); fetchMedicines(searchTerm, page + 1); }}
              className="px-4 py-2 bg-slate-100 hover:bg-emerald-100 text-slate-700 rounded-xl text-xs font-bold disabled:opacity-40 flex items-center gap-1"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-100 rounded-3xl max-w-lg w-full p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">
                {editingMedicine ? 'Edit Medicine Item' : 'Add New Medicine Item'}
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
                <label className="block text-xs font-bold text-slate-600 mb-1">Medicine Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paracetamol 500mg"
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Medicine Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="MED-1001"
                    value={medicineCode}
                    onChange={(e) => setMedicineCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Packaging / Unit Type</label>
                  <select
                    value={unitType}
                    onChange={(e) => setUnitType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup (ml)</option>
                    <option value="Injection">Injection (vial)</option>
                    <option value="Ointment">Ointment (cream)</option>
                    <option value="Strip">Strip (10 Tablets)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Unit Price (INR)</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    placeholder="15.50"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">GST Tax (%)</label>
                  <select
                    value={gstPercentage}
                    onChange={(e) => setGstPercentage(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-sm text-slate-800 font-semibold focus:outline-none"
                  >
                    <option value="0.0">0% (Exempt)</option>
                    <option value="5.0">5% GST</option>
                    <option value="12.0">12% GST</option>
                    <option value="18.0">18% GST</option>
                  </select>
                </div>
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
                  disabled={formLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-2"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{editingMedicine ? 'Update Medicine' : 'Save to Catalog'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
