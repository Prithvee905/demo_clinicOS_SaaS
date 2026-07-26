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
  Loader2
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

    // Find the invoice to fetch details for fallback link
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
      logErrorFallback(err);
      
      // Fallback: wa.me browser redirection
      if (inv) {
        const cleanPhone = inv.patientPhone.replace(/\D/g, ''); // strip non-numeric characters
        const messageText = `Hello ${inv.patientName},\n\nYour invoice *${inv.invoiceNumber}* from ClinicOS is ready.\nTotal amount: *INR ${inv.grandTotal.toFixed(2)}*.\n\nYou can view and download the PDF copy here:\n${inv.pdfUrl || 'Link not generated yet'}\n\nThank you!`;
        const encodedText = encodeURIComponent(messageText);
        
        // Open WhatsApp Web or Mobile WhatsApp App pre-filled
        const waUrl = `https://wa.me/${cleanPhone.startsWith('91') || cleanPhone.length > 10 ? cleanPhone : '91' + cleanPhone}?text=${encodedText}`;
        window.open(waUrl, '_blank');
        
        setSuccess(`Meta API not active. Opened WhatsApp Web/App fallback helper with invoice message.`);
        setTimeout(() => setSuccess(null), 4000);
      } else {
        setError(err.message);
      }
    } finally {
      setWhatsappLoading(null);
    }
  };

  const logErrorFallback = (err: any) => {
    console.warn("API WhatsApp Send failed. Running browser-based direct link fallback.", err);
  };

  const canModify = session?.role === 'ADMIN' || session?.role === 'RECEPTIONIST';

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white flex items-center gap-2">
            <Receipt className="w-8 h-8 text-violet-500" />
            Billing Registry
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track clinic invoices, print PDF sheets, and send WhatsApp alerts</p>
        </div>
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

      {/* Table grid */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs font-semibold uppercase bg-slate-950/40">
                <th className="px-6 py-4">Invoice No</th>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Patient</th>
                <th className="px-6 py-4">Subtotal</th>
                <th className="px-6 py-4">Tax (GST)</th>
                <th className="px-6 py-4">Grand Total</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-500 mx-auto mb-2" />
                    Loading invoices ledger...
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-500 italic">
                    No invoices generated yet. Wait for a completed prescription.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-800/20 text-slate-300">
                    <td className="px-6 py-4 font-mono font-bold text-white whitespace-nowrap">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-slate-400 text-xs">
                      {new Date(inv.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{inv.patientName}</div>
                      <span className="text-xs text-slate-500">{inv.patientPhone}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">INR {inv.subtotal.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-amber-500">INR {inv.taxAmount.toFixed(2)}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-emerald-400">
                      INR {inv.grandTotal.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                        inv.status === 'GENERATED' ? 'bg-blue-950 text-blue-400 border-blue-800/50' :
                        inv.status === 'SENT' ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50' :
                        'bg-red-950 text-red-400 border-red-800/50'
                      }`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap space-x-2">
                      <button
                        onClick={() => openViewModal(inv)}
                        className="text-xs font-semibold px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg transition-all"
                      >
                        Details
                      </button>

                      {inv.pdfUrl && (
                        <a
                          href={inv.pdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-lg transition-all"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </a>
                      )}

                      {inv.status !== 'CANCELLED' && canModify && (
                        <>
                          <button
                            onClick={() => handleSendWhatsApp(inv.id, inv.invoiceNumber)}
                            disabled={whatsappLoading === inv.id}
                            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-900 hover:border-emerald-700 text-emerald-400 hover:text-white rounded-lg transition-all disabled:opacity-40"
                          >
                            <Send className="w-3.5 h-3.5" />
                            <span>{whatsappLoading === inv.id ? 'Sending...' : 'WhatsApp'}</span>
                          </button>
                          
                          <button
                            onClick={() => handleCancelInvoice(inv.id)}
                            className="p-1.5 bg-slate-950 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-950 rounded-lg transition-all"
                            title="Cancel Invoice"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Details Modal */}
      {isViewModalOpen && selectedInvoice && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
            
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Printer className="w-5 h-5 text-violet-500" />
                Receipt Summary
              </h2>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-white focus:outline-none">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto text-sm">
              
              {/* Receipt Header details */}
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h3 className="font-extrabold text-white text-base">INVOICE: {selectedInvoice.invoiceNumber}</h3>
                  <p className="text-xs text-slate-500">{new Date(selectedInvoice.createdAt).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                    selectedInvoice.status === 'GENERATED' ? 'bg-blue-950 text-blue-400 border-blue-800/50' :
                    selectedInvoice.status === 'SENT' ? 'bg-emerald-950 text-emerald-400 border-emerald-800/50' :
                    'bg-red-950 text-red-400 border-red-800/50'
                  }`}>
                    {selectedInvoice.status}
                  </span>
                </div>
              </div>

              {/* Patient / Prescription codes */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-800 pb-4">
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Patient Chart</p>
                  <p className="font-bold text-white">{selectedInvoice.patientName}</p>
                  <p className="text-xs text-slate-400">{selectedInvoice.patientPhone}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-semibold uppercase">Prescription Link</p>
                  <p className="font-mono text-xs text-violet-400 truncate mt-1 select-all">
                    {selectedInvoice.prescriptionId}
                  </p>
                </div>
              </div>

              {/* Items Summary Table */}
              <div className="space-y-2">
                <p className="text-xs text-slate-500 font-semibold uppercase">Itemized Costs</p>
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/20">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-850 text-slate-400 uppercase font-semibold bg-slate-950/40">
                        <th className="px-4 py-2.5">Item Description</th>
                        <th className="px-4 py-2.5">Qty</th>
                        <th className="px-4 py-2.5">Unit Price</th>
                        <th className="px-4 py-2.5">Tax (GST)</th>
                        <th className="px-4 py-2.5 text-right">Total Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850">
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} className="text-slate-300">
                          <td className="px-4 py-2.5 font-bold text-white">{item.itemName}</td>
                          <td className="px-4 py-2.5">{item.quantity}</td>
                          <td className="px-4 py-2.5">INR {item.unitPrice.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-amber-500">INR {item.tax.toFixed(2)}</td>
                          <td className="px-4 py-2.5 text-right font-semibold">INR {item.totalPrice.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total calculations list */}
              <div className="border-t border-slate-800 pt-4 flex flex-col items-end space-y-2">
                <div className="w-64 flex justify-between text-slate-400 text-xs">
                  <span>Subtotal Cost:</span>
                  <span>INR {selectedInvoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="w-64 flex justify-between text-slate-450 text-xs border-b border-slate-800/80 pb-2">
                  <span>Total Tax Amount (GST):</span>
                  <span className="text-amber-500">INR {selectedInvoice.taxAmount.toFixed(2)}</span>
                </div>
                <div className="w-64 flex justify-between font-bold text-base text-white bg-slate-950 px-3 py-2 rounded-xl border border-slate-850">
                  <span>Grand Total:</span>
                  <span className="text-emerald-400">INR {selectedInvoice.grandTotal.toFixed(2)}</span>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/40 flex justify-between">
              {selectedInvoice.pdfUrl && (
                <a
                  href={selectedInvoice.pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition-all"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Download PDF Document</span>
                </a>
              )}
              <button
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold rounded-xl text-sm transition-all ml-auto"
              >
                Close Receipt
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
