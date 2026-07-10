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
  Loader2
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
  userId: string;
  consultationFee: number;
}

interface Medicine {
  id: string;
  medicineCode: string;
  medicineName: string;
  unitPrice: number;
  gstPercentage: number;
  unitType: string;
}

export default function PrescriptionsPage() {
  const [session, setSession] = useState<any>(null);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Builder Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null);
  const [editingPrescription, setEditingPrescription] = useState<Prescription | null>(null);

  // Form Fields
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [doctorNotes, setDoctorNotes] = useState('');
  const [builderItems, setBuilderItems] = useState<PrescriptionItem[]>([]);

  // Item Builder Inputs
  const [medicineQuery, setMedicineQuery] = useState('');
  const [medSearchResults, setMedSearchResults] = useState<Medicine[]>([]);
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [dosage, setDosage] = useState('1-0-1');
  const [frequency, setFrequency] = useState('Daily (After meals)');
  const [duration, setDuration] = useState('5 days');
  const [remarks, setRemarks] = useState('');

  const [formLoading, setFormLoading] = useState(false);

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/prescriptions');
      if (!res.ok) throw new Error('Failed to fetch prescriptions list');
      const data = await res.json();
      setPrescriptions(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = useCallback(async (userSession: any) => {
    try {
      // 1. Fetch Patients
      const patientsRes = await apiFetch('/patients?size=100');
      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        setPatients(patientsData.content || []);
      }

      // 2. Fetch Doctors
      const doctorsRes = await apiFetch('/doctors');
      if (doctorsRes.ok) {
        const doctorsData = await doctorsRes.json();
        setDoctors(doctorsData || []);
        
        // Auto-select doctor profile if current user is doctor
        if (userSession.role === 'DOCTOR') {
          const docProfile = (doctorsData || []).find((d: Doctor) => d.name === userSession.name);
          if (docProfile) {
            setSelectedDoctorId(docProfile.id);
            setConsultationFee(String(docProfile.consultationFee));
          }
        }
      }
    } catch (e) {
      console.error('Failed to load metadata', e);
    }
  }, []);

  useEffect(() => {
    const actSession = getSession();
    setSession(actSession);
    fetchPrescriptions();
    if (actSession) {
      fetchMetadata(actSession);
    }
  }, [fetchMetadata]);

  // Autocomplete medicine lookup
  const handleMedicineSearch = async (query: string) => {
    setMedicineQuery(query);
    if (query.trim().length < 2) {
      setMedSearchResults([]);
      return;
    }
    try {
      const res = await apiFetch(`/medicines/search?query=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setMedSearchResults(data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const selectMedicine = (med: Medicine) => {
    setSelectedMedicine(med);
    setMedicineQuery(med.medicineName);
    setMedSearchResults([]);
  };

  const addBuilderItem = () => {
    if (!selectedMedicine) return;
    const newItem: PrescriptionItem = {
      medicineId: selectedMedicine.id,
      medicineName: selectedMedicine.medicineName,
      quantity,
      dosage,
      frequency,
      duration,
      remarks,
    };
    setBuilderItems([...builderItems, newItem]);
    
    // reset item inputs
    setSelectedMedicine(null);
    setMedicineQuery('');
    setQuantity(1);
    setDosage('1-0-1');
    setFrequency('Daily (After meals)');
    setDuration('5 days');
    setRemarks('');
  };

  const removeBuilderItem = (index: number) => {
    setBuilderItems(builderItems.filter((_, i) => i !== index));
  };

  const openCreateBuilder = () => {
    setEditingPrescription(null);
    setSelectedPatientId(patients[0]?.id || '');
    setDoctorNotes('');
    setBuilderItems([]);
    
    if (session.role === 'DOCTOR') {
      const docProfile = doctors.find(d => d.name === session.name);
      if (docProfile) {
        setSelectedDoctorId(docProfile.id);
        setConsultationFee(String(docProfile.consultationFee));
      }
    } else {
      setSelectedDoctorId(doctors[0]?.id || '');
      setConsultationFee('0.00');
    }
    setIsModalOpen(true);
  };

  const openEditBuilder = (p: Prescription) => {
    setEditingPrescription(p);
    setSelectedPatientId(p.patientId);
    setSelectedDoctorId(p.doctorId);
    setConsultationFee(String(p.consultationFee));
    setDoctorNotes(p.doctorNotes === '[REDACTED - DOCTORS ONLY]' ? '' : p.doctorNotes);
    setBuilderItems(p.items.map(item => ({
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      quantity: item.quantity,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      remarks: item.remarks,
    })));
    setIsModalOpen(true);
  };

  const handleSaveDraft = async () => {
    await submitPrescription('DRAFT');
  };

  const handleComplete = async (prescriptionId?: string) => {
    if (prescriptionId) {
      // Transition existing draft to completed
      setError(null);
      setSuccess(null);
      try {
        const res = await apiFetch(`/prescriptions/${prescriptionId}/complete`, { method: 'POST' });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to complete prescription');
        }
        setSuccess('Prescription completed successfully and pricing snapshotted!');
        fetchPrescriptions();
        setTimeout(() => setSuccess(null), 3000);
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      // Save and Complete immediately
      await submitPrescription('COMPLETED');
    }
  };

  const submitPrescription = async (targetStatus: 'DRAFT' | 'COMPLETED') => {
    setError(null);
    setSuccess(null);
    setFormLoading(true);

    if (builderItems.length === 0) {
      setError('Prescription must contain at least one medicine item');
      setFormLoading(false);
      return;
    }

    try {
      const payload = {
        patientId: selectedPatientId,
        doctorId: selectedDoctorId,
        consultationFee: parseFloat(consultationFee),
        doctorNotes,
        items: builderItems.map(item => ({
          medicineId: item.medicineId,
          quantity: item.quantity,
          dosage: item.dosage,
          frequency: item.frequency,
          duration: item.duration,
          remarks: item.remarks,
        })),
      };

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

      let data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to save prescription.');
      }

      if (targetStatus === 'COMPLETED' && (!editingPrescription || editingPrescription.status === 'DRAFT')) {
        // Automatically complete the draft
        const completeRes = await apiFetch(`/prescriptions/${data.id}/complete`, { method: 'POST' });
        if (!completeRes.ok) {
          const cData = await completeRes.json();
          throw new Error(cData.message || 'Saved as draft, but failed to complete price snapshot.');
        }
      }

      setSuccess(`Prescription saved as ${targetStatus} successfully!`);
      setIsModalOpen(false);
      fetchPrescriptions();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  const openViewModal = (p: Prescription) => {
    setSelectedPrescription(p);
    setIsViewModalOpen(true);
  };

  const handleGenerateInvoice = async (prescriptionId: string) => {
    setError(null);
    setSuccess(null);
    try {
      const res = await apiFetch(`/invoices/generate/${prescriptionId}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to generate billing invoice');
      }
      setSuccess(`Invoice ${data.invoiceNumber} generated successfully!`);
      fetchPrescriptions();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isDoctor = session?.role === 'DOCTOR';
  const canBilling = session?.role === 'ADMIN' || session?.role === 'RECEPTIONIST';

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <FileText className="w-8 h-8 text-violet-500" />
            Clinical Prescriptions
          </h1>
          <p className="text-slate-400 text-sm mt-1">Write digital prescriptions, snap prices, and prompt billing</p>
        </div>
        {isDoctor && (
          <button
            onClick={openCreateBuilder}
            className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-500 hover:to-blue-400 text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg hover:shadow-violet-500/10 active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Prescription</span>
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

      {/* Table */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase bg-slate-950/40">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Consulting Doctor</th>
                <th className="px-6 py-4">Fee (INR)</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto mb-2" />
                    Loading prescriptions history...
                  </td>
                </tr>
              ) : prescriptions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-slate-500 italic">
                    No prescription records logged in this clinic context.
                  </td>
                </tr>
              ) : (
                prescriptions.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/20 text-slate-300">
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                      {new Date(p.prescriptionDate).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-bold text-white">{p.patientName}</div>
                      <span className="text-xs text-slate-500">{p.patientPhone}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-semibold">Dr. {p.doctorName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">INR {p.consultationFee.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        p.status === 'DRAFT' ? 'bg-amber-950 text-amber-400 border-amber-800/50' :
                        p.status === 'COMPLETED' ? 'bg-blue-950 text-blue-400 border-blue-800/50' :
                        'bg-emerald-950 text-emerald-400 border-emerald-800/50'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => openViewModal(p)}
                        className="text-xs font-semibold px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg transition-all"
                      >
                        View Details
                      </button>

                      {p.status === 'DRAFT' && isDoctor && (
                        <>
                          <button
                            onClick={() => openEditBuilder(p)}
                            className="p-1.5 bg-slate-950 text-slate-400 hover:text-white border border-slate-800 hover:border-slate-700 rounded-lg transition-all"
                            title="Edit Draft"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleComplete(p.id)}
                            className="text-xs font-semibold px-2 py-1.5 bg-violet-950 text-violet-400 border border-violet-850 hover:bg-violet-900 rounded-lg transition-all"
                          >
                            Complete
                          </button>
                        </>
                      )}

                      {p.status === 'COMPLETED' && canBilling && (
                        <button
                          onClick={() => handleGenerateInvoice(p.id)}
                          className="text-xs font-semibold px-3 py-1.5 bg-emerald-950 text-emerald-400 border border-emerald-850 hover:bg-emerald-900 rounded-lg transition-all"
                        >
                          Generate Invoice
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Builder Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative my-8">
            
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">
                {editingPrescription ? 'Edit Prescription Draft' : 'Prescription Builder'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white focus:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-5 gap-6 max-h-[70vh] overflow-y-auto">
              {/* Left Column: Patient & consultation configurations */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                  1. Clinical Metadata
                </h3>
                
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Select Patient</label>
                  <select
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    disabled={!!editingPrescription}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all disabled:opacity-50"
                  >
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Consulting Doctor</label>
                  <select
                    value={selectedDoctorId}
                    onChange={(e) => {
                      setSelectedDoctorId(e.target.value);
                      const doc = doctors.find(d => d.id === e.target.value);
                      if (doc) setConsultationFee(String(doc.consultationFee));
                    }}
                    disabled={isDoctor} // locks doctor value if logged in as DOCTOR role
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all disabled:opacity-50"
                  >
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Consultation Fee (INR)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={consultationFee}
                    onChange={(e) => setConsultationFee(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Clinical Notes (Redacted to Reception)</label>
                  <textarea
                    rows={4}
                    placeholder="Diagnosis, Symptoms, Vital parameters..."
                    value={doctorNotes}
                    onChange={(e) => setDoctorNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-4 py-2.5 text-slate-200 focus:outline-none transition-all resize-none text-sm"
                  />
                </div>
              </div>

              {/* Right Column: Medicine item builder and summary */}
              <div className="lg:col-span-3 space-y-6">
                
                {/* Item adder block */}
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-4 space-y-4">
                  <h3 className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                    2. Add Medicine
                  </h3>
                  
                  {/* Medicine Autocomplete */}
                  <div className="relative">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Search Drug Catalog</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Type medicine code or name..."
                        value={medicineQuery}
                        onChange={(e) => handleMedicineSearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl pl-9 pr-4 py-2 text-sm text-slate-200 focus:outline-none transition-all"
                      />
                    </div>

                    {/* Dropdown results */}
                    {medSearchResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 bg-slate-900 border border-slate-800 rounded-xl max-h-48 overflow-y-auto z-20 shadow-2xl divide-y divide-slate-850">
                        {medSearchResults.map(med => (
                          <div
                            key={med.id}
                            onClick={() => selectMedicine(med)}
                            className="px-4 py-2.5 text-sm hover:bg-slate-850 cursor-pointer flex justify-between"
                          >
                            <span className="font-bold text-slate-200">{med.medicineName}</span>
                            <span className="text-xs text-slate-500 uppercase">{med.medicineCode} ({med.unitType})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {selectedMedicine && (
                    <div className="bg-slate-950/90 border border-violet-950 rounded-lg p-2.5 text-xs text-violet-300 flex justify-between items-center">
                      <span>Selected: <strong>{selectedMedicine.medicineName}</strong> (INR {selectedMedicine.unitPrice.toFixed(2)} + {selectedMedicine.gstPercentage}% GST)</span>
                      <button onClick={() => setSelectedMedicine(null)} className="text-slate-500 hover:text-white">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(e) => setQuantity(parseInt(e.target.value))}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Dosage</label>
                      <input
                        type="text"
                        value={dosage}
                        onChange={(e) => setDosage(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Frequency</label>
                      <input
                        type="text"
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Duration</label>
                      <input
                        type="text"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Remarks (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Take with warm water"
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-violet-500 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none transition-all"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={addBuilderItem}
                    disabled={!selectedMedicine}
                    className="w-full flex items-center justify-center gap-1 bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 rounded-xl text-sm transition-all disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Add Item
                  </button>
                </div>

                {/* Items Summary Table */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    3. Prescribed Items Summary
                  </h3>
                  <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 uppercase font-semibold bg-slate-950/60">
                          <th className="px-4 py-2.5">Medicine</th>
                          <th className="px-4 py-2.5">Qty</th>
                          <th className="px-4 py-2.5">Instructions</th>
                          <th className="px-4 py-2.5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-805">
                        {builderItems.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="px-4 py-6 text-center text-slate-500 italic">
                              No medicine items added yet.
                            </td>
                          </tr>
                        ) : (
                          builderItems.map((item, index) => (
                            <tr key={index} className="text-slate-300">
                              <td className="px-4 py-2.5 font-bold text-white">{item.medicineName}</td>
                              <td className="px-4 py-2.5">{item.quantity}</td>
                              <td className="px-4 py-2.5">
                                {item.dosage} | {item.frequency} | {item.duration}
                                {item.remarks && <span className="block text-[10px] text-slate-500">Note: {item.remarks}</span>}
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <button
                                  type="button"
                                  onClick={() => removeBuilderItem(index)}
                                  className="text-red-500 hover:text-red-400"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-between gap-4">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-xl text-sm font-semibold transition-all"
              >
                Cancel
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={formLoading}
                  className="px-4 py-2 bg-slate-950 border border-slate-800 hover:border-slate-700 text-amber-500 font-semibold rounded-xl text-sm transition-all"
                >
                  Save as Draft
                </button>
                <button
                  type="button"
                  onClick={() => handleComplete()}
                  disabled={formLoading}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-blue-500 hover:from-violet-500 hover:to-blue-400 text-white font-semibold rounded-xl text-sm shadow-lg hover:shadow-violet-500/10 active:scale-[0.98] transition-all"
                >
                  Save & Complete
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedPrescription && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
            
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-violet-500" />
                Prescription Details
              </h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-white focus:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto text-sm">
              <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-4">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Patient</p>
                  <p className="font-bold text-white">{selectedPrescription.patientName}</p>
                  <p className="text-xs text-slate-400">{selectedPrescription.patientPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Consulting Doctor</p>
                  <p className="font-bold text-white">Dr. {selectedPrescription.doctorName}</p>
                  <p className="text-xs text-slate-450">Fee: INR {selectedPrescription.consultationFee.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Clinical Notes</p>
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl text-slate-300 italic">
                  {selectedPrescription.doctorNotes || 'No notes added.'}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-semibold uppercase">Prescribed Medicines</p>
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-400 uppercase font-semibold bg-slate-950/40">
                        <th className="px-4 py-2.5">Medicine</th>
                        <th className="px-4 py-2.5">Qty</th>
                        <th className="px-4 py-2.5">Instructions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {selectedPrescription.items.map((item, index) => (
                        <tr key={index} className="text-slate-300">
                          <td className="px-4 py-2.5 font-bold text-white">{item.medicineName}</td>
                          <td className="px-4 py-2.5">{item.quantity}</td>
                          <td className="px-4 py-2.5">
                            {item.dosage} | {item.frequency} | {item.duration}
                            {item.remarks && <span className="block text-[10px] text-slate-500">Note: {item.remarks}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-end">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
