'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { apiFetch, getSession } from '@/lib/api';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  FileText, 
  CheckCircle2, 
  ShieldAlert, 
  PlusCircle, 
  Search,
  Check,
  ClipboardList,
  Loader2,
  Receipt,
  User,
  Stethoscope,
  Sparkles
} from 'lucide-react';

interface PrescriptionItem {
  medicineId: string;
  medicineName?: string;
  quantity: number;
  dosage: string;
  frequency: string;
  duration: string;
  remarks: string;
}

interface Prescription {
  id: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  consultationFee: number;
  doctorNotes: string;
  prescriptionDate: string;
  status: string; // DRAFT, COMPLETED, BILLED
  items: PrescriptionItem[];
}

interface Patient {
  id: string;
  patientCode: string;
  name: string;
  phone: string;
}

interface Doctor {
  id: string;
  name: string;
  specialization: string;
  consultationFee: number;
}

interface Medicine {
  id: string;
  medicineCode: string;
  medicineName: string;
  unitPrice: number;
  unitType: string;
}

export default function PrescriptionsPage() {
  const [session, setSession] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Reference lists for form dropdowns
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  // Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);

  const [patientId, setPatientId] = useState('');
  const [doctorId, setDoctorId] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // View modal
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/prescriptions');
      if (!res.ok) throw new Error('Failed to load clinic prescriptions');
      const data = await res.json();
      setPrescriptions(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchReferenceData = async () => {
    try {
      const [ptRes, docRes, medRes] = await Promise.all([
        apiFetch('/patients?page=0&size=100'),
        apiFetch('/doctors'),
        apiFetch('/medicines?page=0&size=100'),
      ]);

      if (ptRes.ok) {
        const ptData = await ptRes.json();
        setPatients(ptData.content || []);
      }
      if (docRes.ok) {
        const docData = await docRes.json();
        setDoctors(docData || []);
      }
      if (medRes.ok) {
        const medData = await medRes.json();
        setMedicines(medData.content || []);
      }
    } catch (e) {
      // Ignore reference fetch errors
    }
  };

  useEffect(() => {
    setSession(getSession());
    fetchPrescriptions();
    fetchReferenceData();
  }, [fetchPrescriptions]);

  const openCreateModal = () => {
    setEditingPrescription(null);
    setPatientId('');
    setDoctorId('');
    setConsultationFee('');
    setDoctorNotes('');
    setItems([]);
    setIsModalOpen(true);
  };

  const addItemRow = () => {
    setItems([
      ...items,
      { medicineId: '', quantity: 1, dosage: '500mg', frequency: '1-0-1', duration: '5 days', remarks: 'After food' }
    ]);
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: keyof PrescriptionItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const handleDoctorSelect = (docId: string) => {
    setDoctorId(docId);
    const selDoc = doctors.find(d => d.id === docId);
    if (selDoc) {
      setConsultationFee(selDoc.consultationFee.toString());
    }
  };

  const handleSubmit = async (e: React.FormEvent, isComplete = false) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!patientId || !doctorId) {
      setError('Please select both a Patient and a Doctor.');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one prescribed medicine item.');
      return;
    }

    setFormLoading(true);

    const payload = {
      patientId,
      doctorId,
      consultationFee: parseFloat(consultationFee) || 0,
      doctorNotes,
      items: items.map(it => ({
        medicineId: it.medicineId,
        quantity: Number(it.quantity) || 1,
        dosage: it.dosage,
        frequency: it.frequency,
        duration: it.duration,
        remarks: it.remarks,
      })),
    };

    try {
      let res;
      if (editingPrescription) {
        res = await apiFetch(`/prescriptions/${editingPrescription.id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        res = await apiFetch('/prescriptions', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to save prescription');

      if (isComplete) {
        await apiFetch(`/prescriptions/${data.id}/complete`, { method: 'POST' });
      }

      setSuccess(`Prescription saved ${isComplete ? 'and marked COMPLETED' : 'as DRAFT'}!`);
      setIsModalOpen(false);
      fetchPrescriptions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleCompletePrescription = async (id: string) => {
    try {
      const res = await apiFetch(`/prescriptions/${id}/complete`, { method: 'POST' });
      if (!res.ok) throw new Error('Failed to complete prescription');
      setSuccess('Prescription marked COMPLETED! Ready for billing invoice generation.');
      fetchPrescriptions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleGenerateInvoice = async (prescriptionId: string) => {
    try {
      const res = await apiFetch(`/invoices/generate/${prescriptionId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to generate invoice');
      setSuccess(`Invoice ${data.invoiceNumber} generated successfully!`);
      fetchPrescriptions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openViewModal = (p: Prescription) => {
    setSelectedPrescription(p);
    setIsViewModalOpen(true);
  };

  return (
    <div className="space-y-8">
      
      {/* Header Banner */}
      <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl p-6 md:p-8 shadow-xl shadow-emerald-950/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-100/60 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-emerald-100/80 text-emerald-800 text-xs font-extrabold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 uppercase">
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              CLINICAL e-PRESCRIPTION REGISTRY
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Digital Prescriptions
          </h1>
          <p className="text-slate-600 text-sm font-medium mt-1">
            Doctor prescriptions with medicine dosages, frequencies, consultation fees, and instant billing generation.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="px-5 py-3 bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-emerald-600/25 hover:shadow-emerald-600/40 transition-all flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Prescription</span>
        </button>
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

      {/* Prescriptions Table Card */}
      <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl p-6 shadow-xl shadow-emerald-950/5">
        {loading ? (
          <div className="p-12 text-center text-emerald-600 font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading Prescriptions...</span>
          </div>
        ) : prescriptions.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <FileText className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
            <p className="font-bold text-slate-800 text-lg">No prescriptions recorded yet.</p>
            <p className="text-xs text-slate-500 mt-1">Click New Prescription above to write a digital prescription for a patient.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/60 border-b border-emerald-100 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="p-4 rounded-l-2xl">Date</th>
                  <th className="p-4">Patient</th>
                  <th className="p-4">Doctor</th>
                  <th className="p-4">Consultation Fee</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right rounded-r-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100/60 text-sm">
                {prescriptions.map((p) => {
                  const isCompleted = p.status === 'COMPLETED';
                  const isBilled = p.status === 'BILLED';
                  const isDraft = p.status === 'DRAFT';

                  return (
                    <tr key={p.id} className="hover:bg-emerald-50/40 transition-colors group">
                      <td className="p-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                        {new Date(p.prescriptionDate).toLocaleDateString()}
                      </td>

                      <td className="p-4 font-bold text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-emerald-600" />
                          <span>{p.patientName}</span>
                        </div>
                      </td>

                      <td className="p-4 font-semibold text-slate-700 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs">
                          <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                          <span>Dr. {p.doctorName}</span>
                        </div>
                      </td>

                      <td className="p-4 font-black text-emerald-700 whitespace-nowrap">
                        INR {p.consultationFee.toFixed(2)}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                          isBilled 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : isCompleted 
                              ? 'bg-teal-100 text-teal-800 border-teal-300' 
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isBilled ? 'bg-emerald-600' : isCompleted ? 'bg-teal-600' : 'bg-amber-600'}`}></span>
                          {p.status}
                        </span>
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          
                          <button
                            onClick={() => openViewModal(p)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all flex items-center gap-1"
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            <span>Rx Items ({p.items?.length || 0})</span>
                          </button>

                          {isDraft && (
                            <button
                              onClick={() => handleCompletePrescription(p.id)}
                              className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 transition-all flex items-center gap-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Complete</span>
                            </button>
                          )}

                          {isCompleted && session?.role !== 'DOCTOR' && (
                            <button
                              onClick={() => handleGenerateInvoice(p.id)}
                              className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>Generate Invoice</span>
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Prescription Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto max-h-screen">
          <div className="bg-white border border-emerald-100 rounded-3xl max-w-3xl w-full p-6 md:p-8 shadow-2xl space-y-6 my-8">
            
            <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
              <h3 className="text-xl font-black text-slate-900">
                {editingPrescription ? 'Edit Prescription' : 'Write Clinical e-Prescription'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
              
              {/* Doctor & Patient Selector */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Select Patient</label>
                  <select
                    required
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
                  >
                    <option value="">-- Choose Patient --</option>
                    {patients.map(pt => (
                      <option key={pt.id} value={pt.id}>{pt.name} ({pt.phone}) - [{pt.patientCode}]</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Select Consulting Doctor</label>
                  <select
                    required
                    value={doctorId}
                    onChange={(e) => handleDoctorSelect(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
                  >
                    <option value="">-- Choose Doctor --</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.name} ({d.specialization}) - INR {d.consultationFee}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Consultation Fee (INR)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="500.00"
                  value={consultationFee}
                  onChange={(e) => setConsultationFee(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              {/* Medicine Line Items */}
              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200/80">
                  <span className="text-xs font-extrabold text-emerald-800 uppercase tracking-wider">Prescribed Medicines Catalog</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Add Medicine</span>
                  </button>
                </div>

                {items.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-4">No medicines added yet. Click Add Medicine above.</p>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {items.map((it, idx) => (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-2xl p-3 grid grid-cols-1 md:grid-cols-6 gap-2 text-xs items-center">
                        <div className="md:col-span-2">
                          <select
                            required
                            value={it.medicineId}
                            onChange={(e) => updateItemRow(idx, 'medicineId', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold"
                          >
                            <option value="">-- Select Drug --</option>
                            {medicines.map(m => (
                              <option key={m.id} value={m.id}>{m.medicineName} ({m.unitType}) - INR {m.unitPrice}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={it.quantity}
                            onChange={(e) => updateItemRow(idx, 'quantity', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold text-center"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Frequency (1-0-1)"
                            value={it.frequency}
                            onChange={(e) => updateItemRow(idx, 'frequency', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold"
                          />
                        </div>
                        <div>
                          <input
                            type="text"
                            placeholder="Duration (5 days)"
                            value={it.duration}
                            onChange={(e) => updateItemRow(idx, 'duration', e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-lg p-2 font-semibold"
                          />
                        </div>
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => removeItemRow(idx)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Clinical Notes & Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Clinical diagnosis, diet instructions..."
                  value={doctorNotes}
                  onChange={(e) => setDoctorNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 rounded-xl px-4 py-2.5 text-xs text-slate-800 font-semibold focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
                  className="px-5 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={formLoading}
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5"
                >
                  {formLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Save & Mark Completed</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* View Prescription Modal */}
      {isViewModalOpen && selectedPrescription && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-100 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
              <div>
                <h3 className="text-xl font-black text-slate-900">Rx for {selectedPrescription.patientName}</h3>
                <p className="text-xs text-slate-500 font-semibold">Prescribed by Dr. {selectedPrescription.doctorName}</p>
              </div>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-extrabold uppercase text-emerald-800">Prescribed Medicine Items</h4>
              <ul className="divide-y divide-emerald-100 text-xs text-slate-800">
                {selectedPrescription.items?.map((it, idx) => (
                  <li key={idx} className="py-2 flex justify-between items-center font-semibold">
                    <div>
                      <span className="font-bold text-slate-900 block">{it.medicineName || 'Medicine'}</span>
                      <span className="text-[11px] text-slate-500">{it.dosage} • {it.frequency} • {it.duration}</span>
                    </div>
                    <span className="bg-emerald-100 text-emerald-800 font-extrabold px-2.5 py-1 rounded-full">
                      Qty: {it.quantity}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex items-center justify-end pt-2">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
