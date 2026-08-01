'use client';

import React, { useEffect, useState } from 'react';
import { apiFetch, getSession } from '@/lib/api';
import { 
  Receipt, 
  FileDown, 
  Trash2, 
  Send, 
  X, 
  CheckCircle2, 
  ShieldAlert, 
  Printer,
  ChevronRight,
  ClipboardList,
  Loader2,
  Sparkles,
  PhoneCall,
  User,
  Calendar,
  ExternalLink
} from 'lucide-react';

interface InvoiceItem {
  itemName: string;
  quantity: number;
  unitPrice: number;
  tax: number;
  totalPrice: number;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  prescriptionId: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  pdfUrl: string;
  status: string; // GENERATED, SENT, CANCELLED
  createdAt: string;
  items: InvoiceItem[];
}

export default function InvoicesPage() {
  const [session, setSession] = useState<any>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal details
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [whatsappLoading, setWhatsappLoading] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiFetch('/invoices');
      if (!res.ok) throw new Error('Failed to load clinic billing registry');
      const data = await res.json();
      setInvoices(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSession(getSession());
    fetchInvoices();
  }, []);

  const openViewModal = (inv: Invoice) => {
    setSelectedInvoice(inv);
    setIsViewModalOpen(true);
  };

  const handleCancelInvoice = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this billing invoice? This re-opens the associated prescription.')) return;
    setError(null);
    setSuccess(null);

    try {
      const res = await apiFetch(`/invoices/${id}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to cancel invoice');
      }

      setSuccess(`Invoice ${data.invoiceNumber} cancelled successfully!`);
      fetchInvoices();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSendWhatsApp = async (id: string, invoiceNumber: string) => {
    setError(null);
    setSuccess(null);
    setWhatsappLoading(id);

    const inv = invoices.find(i => i.id === id);

    try {
      const res = await apiFetch(`/whatsapp/send-invoice/${id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'WhatsApp message dispatch failed');
      }

      setSuccess(`Invoice ${invoiceNumber} notification dispatched via WhatsApp successfully! Status: ${data.status}`);
      fetchInvoices();
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: any) {
      if (inv) {
        const cleanPhone = inv.patientPhone.replace(/\D/g, '');
        const messageText = `Hello ${inv.patientName},\n\nYour invoice *${inv.invoiceNumber}* from ClinicOS is ready.\nTotal amount: *INR ${inv.grandTotal.toFixed(2)}*.\n\nYou can view and download the PDF copy here:\n${inv.pdfUrl || 'https://clinicossaas-production.up.railway.app/api/invoices/public-pdf/' + inv.id}\n\nThank you!`;
        const encodedText = encodeURIComponent(messageText);
        
        const waUrl = `https://wa.me/${cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : '91' + cleanPhone}?text=${encodedText}`;
        window.open(waUrl, '_blank');
        
        setSuccess(`Opened WhatsApp Web/App helper to send invoice message.`);
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(err.message);
      }
    } finally {
      setWhatsappLoading(null);
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
              <Receipt className="w-3.5 h-3.5 text-emerald-600" />
              BILLING & TAX INVOICE REGISTRY
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900">
            Billing & Invoices
          </h1>
          <p className="text-slate-600 text-sm font-medium mt-1">
            Automated tax billing, OpenPDF receipt generation, and 1-tap WhatsApp delivery.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 shadow-sm">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Total Invoices: {invoices.length}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-sm font-semibold flex items-center gap-2 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Invoices Table Container */}
      <div className="bg-white/90 backdrop-blur-xl border border-emerald-100 rounded-3xl shadow-xl shadow-emerald-950/5 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-emerald-600 font-semibold flex items-center justify-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            <span>Loading Clinic Invoices...</span>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Receipt className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
            <p className="font-bold text-slate-800 text-lg">No billing invoices found.</p>
            <p className="text-xs text-slate-500 mt-1">Invoices are created automatically when doctors complete prescriptions.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-emerald-50/60 border-b border-emerald-100 text-slate-600 text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="p-4 rounded-l-2xl">Invoice #</th>
                  <th className="p-4">Patient Demographics</th>
                  <th className="p-4">Total Amount</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Date Billed</th>
                  <th className="p-4 text-right rounded-r-2xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-emerald-100/60 text-sm">
                {invoices.map((inv) => {
                  const isSent = inv.status === 'SENT';
                  const isCancelled = inv.status === 'CANCELLED';

                  return (
                    <tr key={inv.id} className="hover:bg-emerald-50/40 transition-colors group">
                      <td className="p-4 font-black text-slate-900 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                          <span>{inv.invoiceNumber}</span>
                        </div>
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-900 flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-emerald-600" />
                            {inv.patientName}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 font-medium">
                            <PhoneCall className="w-3 h-3 text-slate-400" />
                            {inv.patientPhone}
                          </span>
                        </div>
                      </td>

                      <td className="p-4 font-black text-emerald-700 whitespace-nowrap text-base">
                        INR {inv.grandTotal.toFixed(2)}
                      </td>

                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider border ${
                          isSent 
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                            : isCancelled 
                              ? 'bg-rose-100 text-rose-800 border-rose-300' 
                              : 'bg-amber-100 text-amber-800 border-amber-300'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isSent ? 'bg-emerald-600' : isCancelled ? 'bg-rose-600' : 'bg-amber-600'}`}></span>
                          {inv.status}
                        </span>
                      </td>

                      <td className="p-4 text-xs font-semibold text-slate-500 whitespace-nowrap">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {new Date(inv.createdAt).toLocaleString()}
                        </span>
                      </td>

                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* View Details Button */}
                          <button
                            onClick={() => openViewModal(inv)}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            <span>Items</span>
                          </button>

                          {/* WhatsApp Dispatch Button */}
                          <button
                            onClick={() => handleSendWhatsApp(inv.id, inv.invoiceNumber)}
                            disabled={whatsappLoading === inv.id || isCancelled}
                            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/35 transition-all flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {whatsappLoading === inv.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>WhatsApp</span>
                          </button>

                          {/* Download PDF Button */}
                          <a
                            href={inv.pdfUrl || `https://clinicossaas-production.up.railway.app/api/invoices/public-pdf/${inv.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-slate-600 hover:text-emerald-800 border border-slate-200 rounded-xl transition-all"
                            title="Download PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </a>

                          {/* Cancel Invoice (Admin / Receptionist) */}
                          {session?.role !== 'DOCTOR' && !isCancelled && (
                            <button
                              onClick={() => handleCancelInvoice(inv.id)}
                              className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-700 border border-slate-200 rounded-xl transition-all"
                              title="Cancel Invoice"
                            >
                              <Trash2 className="w-4 h-4" />
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

      {/* Invoice Details Modal */}
      {isViewModalOpen && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-100 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl shadow-emerald-950/20 space-y-6 animate-scale-up">
            
            <div className="flex items-center justify-between border-b border-emerald-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Invoice #{selectedInvoice.invoiceNumber}</h3>
                  <p className="text-xs text-slate-500 font-medium">Billed for {selectedInvoice.patientName} ({selectedInvoice.patientPhone})</p>
                </div>
              </div>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Line Items Table */}
            <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-emerald-200/60 text-slate-600 font-bold uppercase">
                    <th className="pb-2">Item Description</th>
                    <th className="pb-2 text-center">Qty</th>
                    <th className="pb-2 text-right">Unit Price</th>
                    <th className="pb-2 text-right">GST Tax</th>
                    <th className="pb-2 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-emerald-100/60 text-slate-800">
                  {selectedInvoice.items?.map((item, idx) => (
                    <tr key={idx} className="font-semibold">
                      <td className="py-2.5 text-slate-900">{item.itemName}</td>
                      <td className="py-2.5 text-center font-bold">{item.quantity}</td>
                      <td className="py-2.5 text-right">INR {item.unitPrice.toFixed(2)}</td>
                      <td className="py-2.5 text-right text-slate-500">INR {item.tax.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-800">INR {item.totalPrice.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary Totals */}
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 space-y-2 text-xs font-bold text-slate-700">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>INR {selectedInvoice.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Tax (GST):</span>
                <span>INR {selectedInvoice.taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-emerald-800 border-t border-slate-200 pt-2">
                <span>Grand Total:</span>
                <span>INR {selectedInvoice.grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Close
              </button>
              
              <a
                href={selectedInvoice.pdfUrl || `https://clinicossaas-production.up.railway.app/api/invoices/public-pdf/${selectedInvoice.id}`}
                target="_blank"
                rel="noreferrer"
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-emerald-600/25 transition-all flex items-center gap-1.5"
              >
                <FileDown className="w-4 h-4" />
                <span>Download PDF Receipt</span>
              </a>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
