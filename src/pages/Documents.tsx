import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Download, 
  FileText, 
  Search, 
  Loader2, 
  PlusCircle, 
  Save, 
  FileDown,
  Receipt,
  History
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";

// Company Details
const COMPANY = {
  name: "Octonus Solutions",
  address: "Office No. 2, Crown Centre, Gulshan-e-Iqbal, Karachi",
  phone: "+92-331-3195292 / 021-34-977-797",
  email: "octonussolutions@gmail.com",
  website: "www.octonussolutions.com.pk",
  tagline: "A Spectacular Turn of Events",
};

interface DocItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

interface DocumentData {
  id?: string;
  doc_no: string;
  type: "Quotation" | "Invoice";
  date: string;
  valid_until?: string;
  invoice_date?: string;
  event_date?: string;
  client_company: string;
  contact_person: string;
  client_address: string;
  event_name: string;
  items: DocItem[];
  total_amount: number;
  srb_amount: number;
  sub_total: number;
  terms: string;
  created_at?: string;
}

const Documents = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"Quotation" | "Invoice">("Quotation");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [docNo, setDocNo] = useState("");
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [validUntil, setValidUntil] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [eventName, setEventName] = useState("");
  const [items, setItems] = useState<DocItem[]>([{ description: "", qty: 1, rate: 0, amount: 0 }]);
  const [terms, setTerms] = useState("");

  const quotationTerms = `1. Quoted Amount Including 15% SRB & 11% Income Taxes.\n2. Payment 50% Advance at the time of Work Order & 50% After Handling.\n3. Any Extra or Additional Work Will be Charged Extra.\n4. All Equipment and Structure are on Rental Basis.`;
  
  const invoiceTerms = `1. Amount Including 15% SRB & 11% Income Taxes.\n2. All Payment Should be Favor in Octonus Solutions by Cheque/IBFT.\n3. Payment Made Before Due Date.`;

  useEffect(() => {
    fetchDocuments();
    generateDocNo();
  }, [activeTab]);

  useEffect(() => {
    setTerms(activeTab === "Quotation" ? quotationTerms : invoiceTerms);
  }, [activeTab]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (err: any) {
      toast.error("Failed to fetch documents archive");
    } finally {
      setLoading(false);
    }
  };

  const generateDocNo = async () => {
    try {
      const prefix = activeTab === "Quotation" ? "QT" : "INV";
      const { data, error } = await supabase
        .from("documents")
        .select("doc_no")
        .eq("type", activeTab)
        .order("doc_no", { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNum = 1;
      if (data && data.length > 0) {
        const lastNo = data[0].doc_no;
        const lastNum = parseInt(lastNo.split("-")[1]);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      setDocNo(`${prefix}-${nextNum.toString().padStart(3, "0")}`);
    } catch (err: any) {
      toast.error("Failed to generate document number");
    }
  };

  const handleAddItem = () => {
    setItems([...items, { description: "", qty: 1, rate: 0, amount: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: keyof DocItem, value: any) => {
    const newItems = [...items];
    const item = { ...newItems[index] };
    
    if (field === "qty" || field === "rate") {
      const val = parseFloat(value) || 0;
      (item as any)[field] = val;
      item.amount = item.qty * item.rate;
    } else {
      (item as any)[field] = value;
    }
    
    newItems[index] = item;
    setItems(newItems);
  };

  const calculateTotals = () => {
    const total = items.reduce((sum, item) => sum + item.amount, 0);
    const srb = total * 0.15;
    const subTotal = total + srb;
    return { total, srb, subTotal };
  };

  const { total, srb, subTotal } = calculateTotals();

  const handleSave = async () => {
    if (!clientCompany || !eventName) {
      toast.error("Please fill in client company and event name");
      return;
    }

    setSaving(true);
    try {
      const docData: Partial<DocumentData> = {
        doc_no: docNo,
        type: activeTab,
        date: date,
        client_company: clientCompany,
        contact_person: contactPerson,
        client_address: clientAddress,
        event_name: eventName,
        items: items,
        total_amount: total,
        srb_amount: srb,
        sub_total: subTotal,
        terms: terms,
      };

      if (activeTab === "Quotation") {
        docData.valid_until = validUntil;
      } else {
        docData.event_date = eventDate;
        docData.invoice_date = date;
      }

      const { error } = await supabase.from("documents").insert([docData]);

      if (error) throw error;

      toast.success(`${activeTab} saved successfully`);
      fetchDocuments();
      resetForm();
    } catch (err: any) {
      toast.error(err.message || "Failed to save document");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    generateDocNo();
    setDate(format(new Date(), "yyyy-MM-dd"));
    setValidUntil("");
    setEventDate("");
    setClientCompany("");
    setContactPerson("");
    setClientAddress("");
    setEventName("");
    setItems([{ description: "", qty: 1, rate: 0, amount: 0 }]);
    setTerms(activeTab === "Quotation" ? quotationTerms : invoiceTerms);
  };

  const formatCurrency = (amount: number) => {
    return `Rs. ${amount.toLocaleString()}/-`;
  };

  const generatePDF = (doc: DocumentData) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    // Header Bar
    pdf.setFillColor(22, 101, 52); // Green
    pdf.rect(0, 0, pageWidth, 20, "F");
    
    // Logo Text (Placeholder for actual logo)
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text(COMPANY.name.toUpperCase(), 15, 13);
    
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "normal");
    pdf.text(COMPANY.tagline, 15, 17);

    // Document Title
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    const title = doc.type === "Quotation" ? "QUOTATION" : "SALES TAX INVOICE";
    const titleWidth = pdf.getTextWidth(title);
    pdf.text(title, (pageWidth - titleWidth) / 2, 35);
    
    // Client & Doc Info
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("CLIENT DETAILS:", 15, 50);
    pdf.setFont("helvetica", "normal");
    pdf.text(`To: ${doc.client_company}`, 15, 56);
    pdf.text(`Attn: ${doc.contact_person}`, 15, 61);
    pdf.text(`Address: ${doc.client_address}`, 15, 66, { maxWidth: 80 });

    pdf.setFont("helvetica", "bold");
    pdf.text("DOCUMENT INFO:", 120, 50);
    pdf.setFont("helvetica", "normal");
    pdf.text(`${doc.type} No: ${doc.doc_no}`, 120, 56);
    pdf.text(`Date: ${format(new Date(doc.date), "PP")}`, 120, 61);
    pdf.text(`Event: ${doc.event_name}`, 120, 66, { maxWidth: 75 });
    if (doc.type === "Quotation" && doc.valid_until) {
      pdf.text(`Valid Until: ${format(new Date(doc.valid_until), "PP")}`, 120, 71);
    } else if (doc.type === "Invoice" && doc.event_date) {
      pdf.text(`Event Date: ${format(new Date(doc.event_date), "PP")}`, 120, 71);
    }

    // Table
    const tableData = (doc?.items ?? []).map((item, index) => [
      index + 1,
      item?.description ?? "N/A",
      item?.qty ?? 0,
      (item?.rate ?? 0).toLocaleString(),
      (item?.amount ?? 0).toLocaleString()
    ]);

    autoTable(pdf, {
      startY: 85,
      head: [["S.NO", "DESCRIPTION", "QTY", "RATE (RS.)", "AMOUNT (RS.)"]],
      body: tableData,
      theme: "grid",
      headStyles: { fillColor: [22, 101, 52], textColor: 255, fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 15, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 20, halign: "center" },
        3: { cellWidth: 30, halign: "right" },
        4: { cellWidth: 35, halign: "right" }
      },
      styles: { fontSize: 9 }
    });

    const finalY = (pdf as any).lastAutoTable.finalY + 10;

    // Totals
    pdf.setFont("helvetica", "bold");
    pdf.text("TOTAL AMOUNT:", 130, finalY);
    pdf.text(doc.total_amount.toLocaleString(), 190, finalY, { align: "right" });
    
    pdf.text("SRB (15%):", 130, finalY + 7);
    pdf.text(doc.srb_amount.toLocaleString(), 190, finalY + 7, { align: "right" });
    
    pdf.setFontSize(12);
    pdf.setTextColor(22, 101, 52);
    pdf.text("SUB TOTAL:", 130, finalY + 15);
    pdf.text(`RS. ${doc.sub_total.toLocaleString()}/-`, 190, finalY + 15, { align: "right" });

    // Terms
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.text("TERMS & CONDITIONS:", 15, finalY + 25);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    const splitTerms = pdf.splitTextToSize(doc.terms, pageWidth - 30);
    pdf.text(splitTerms, 15, finalY + 32);

    pdf.text("E.&O.E.", 15, pdf.internal.pageSize.getHeight() - 25);

    // Footer Bar
    pdf.setFillColor(22, 101, 52);
    pdf.rect(0, pdf.internal.pageSize.getHeight() - 20, pageWidth, 20, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(7);
    const footerText = `${COMPANY.address} | Email: ${COMPANY.email} | Phone: ${COMPANY.phone}`;
    const footerWidth = pdf.getTextWidth(footerText);
    pdf.text(footerText, (pageWidth - footerWidth) / 2, pdf.internal.pageSize.getHeight() - 10);

    pdf.save(`${doc.doc_no}_${doc.client_company.replace(/\s+/g, '_')}.pdf`);
  };

  const generateExcel = (doc: DocumentData) => {
    const wb = XLSX.utils.book_new();
    
    const header = [
      ["OCTONUS SOLUTIONS"],
      [COMPANY.tagline],
      [COMPANY.address],
      [`Phone: ${COMPANY.phone} | Email: ${COMPANY.email}`],
      [],
      [doc.type.toUpperCase()],
      [],
      ["Client Details:", "", "", "Document Info:"],
      [`Company: ${doc.client_company}`, "", "", `${doc.type} No: ${doc.doc_no}`],
      [`Contact: ${doc.contact_person}`, "", "", `Date: ${doc.date}`],
      [`Address: ${doc.client_address}`, "", "", `Event: ${doc.event_name}`],
      [],
      ["S.NO", "DESCRIPTION", "QTY", "RATE (RS.)", "AMOUNT (RS.)"]
    ];

    const itemRows = (doc?.items ?? []).map((item, index) => [
      index + 1,
      item?.description ?? "N/A",
      item?.qty ?? 0,
      item?.rate ?? 0,
      item?.amount ?? 0
    ]);

    const totalRows = [
      [],
      ["", "", "", "TOTAL AMOUNT:", doc?.total_amount ?? 0],
      ["", "", "", "SRB (15%):", doc?.srb_amount ?? 0],
      ["", "", "", "SUB TOTAL:", doc?.sub_total ?? 0],
      [],
      ["TERMS & CONDITIONS:"],
      ...(doc?.terms ?? "").split("\n").map(line => [line]),
      [],
      ["E.&O.E."]
    ];

    const ws = XLSX.utils.aoa_to_sheet([...header, ...itemRows, ...totalRows]);
    
    // Simple styling
    ws["!cols"] = [
      { wch: 8 },  // S.No
      { wch: 50 }, // Description
      { wch: 10 }, // Qty
      { wch: 15 }, // Rate
      { wch: 20 }  // Amount
    ];

    XLSX.utils.book_append_sheet(wb, ws, doc.type);
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(data, `${doc.doc_no}_${doc.client_company.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      const { error } = await supabase.from("documents").delete().eq("id", id);
      if (error) throw error;
      toast.success("Document deleted");
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    }
  };

  const filteredDocs = (documents ?? []).filter(doc => 
    (doc?.client_company ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc?.event_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc?.doc_no ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="animate-in fade-in slide-in-from-left duration-500">
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">Documents Generator</h1>
          <p className="text-slate-500 font-bold mt-1">Create professional Quotations and Invoices instantly.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
        <TabsList className="mb-8 h-auto gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60">
          <TabsTrigger value="Quotation" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-2">
            <FileText className="h-4 w-4" /> Quotation
          </TabsTrigger>
          <TabsTrigger value="Invoice" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-2">
            <Receipt className="h-4 w-4" /> Invoice
          </TabsTrigger>
          <TabsTrigger value="archive" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-2">
            <History className="h-4 w-4" /> Archive
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-6 animate-in fade-in duration-500">
          <div className="rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/40 overflow-hidden">
            <div className="bg-slate-50/50 border-b border-slate-100 p-6">
              <h2 className="text-xl font-black text-[#0f172a] flex items-center gap-3">
                <PlusCircle className="h-6 w-6 text-blue-600" />
                New {activeTab} Setup
              </h2>
            </div>
            <div className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Document Number</Label>
                  <Input value={docNo} readOnly className="h-12 rounded-xl bg-slate-50 font-black text-blue-600 border-slate-200" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">{activeTab} Date</Label>
                  <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-12 rounded-xl font-bold" />
                </div>
                {activeTab === "Quotation" ? (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Valid Until</Label>
                    <Input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="h-12 rounded-xl font-bold" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Event Date</Label>
                    <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="h-12 rounded-xl font-bold" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Client Company Name</Label>
                  <Input placeholder="Enter company name" value={clientCompany} onChange={e => setClientCompany(e.target.value)} className="h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Contact Person</Label>
                  <Input placeholder="Enter contact name" value={contactPerson} onChange={e => setContactPerson(e.target.value)} className="h-12 rounded-xl font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Event Name / Description</Label>
                  <Input placeholder="e.g. Corporate Dinner 2024" value={eventName} onChange={e => setEventName(e.target.value)} className="h-12 rounded-xl font-bold" />
                </div>
                <div className="md:col-span-2 lg:col-span-3 space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Client Address</Label>
                  <Input placeholder="Enter complete address" value={clientAddress} onChange={e => setClientAddress(e.target.value)} className="h-12 rounded-xl font-bold" />
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-4 mb-10">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-[#0f172a] uppercase tracking-widest">Line Items</h3>
                  <Button onClick={handleAddItem} variant="outline" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 h-10 border-blue-200 text-blue-600 hover:bg-blue-50">
                    <Plus className="h-4 w-4" /> Add Row
                  </Button>
                </div>
                <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-4 py-3 text-center font-black text-[10px] uppercase tracking-widest w-16">S.No</th>
                          <th className="px-4 py-3 text-left font-black text-[10px] uppercase tracking-widest">Description</th>
                          <th className="px-4 py-3 text-center font-black text-[10px] uppercase tracking-widest w-24">Qty</th>
                          <th className="px-4 py-3 text-right font-black text-[10px] uppercase tracking-widest w-40">Rate (Rs.)</th>
                          <th className="px-4 py-3 text-right font-black text-[10px] uppercase tracking-widest w-40">Amount</th>
                          <th className="px-4 py-3 w-16"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {(items ?? []).map((item, index) => (
                          <tr key={index} className="group hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-center font-bold text-slate-400">{index + 1}</td>
                            <td className="px-4 py-3">
                              <Input 
                                placeholder="Item description" 
                                value={item?.description ?? ""} 
                                onChange={e => handleItemChange(index, "description", e.target.value)}
                                className="border-none focus-visible:ring-0 bg-transparent font-bold"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input 
                                type="number" 
                                value={item?.qty ?? 0} 
                                onChange={e => handleItemChange(index, "qty", e.target.value)}
                                className="text-center font-bold h-9 rounded-lg"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input 
                                type="number" 
                                value={item?.rate ?? 0} 
                                onChange={e => handleItemChange(index, "rate", e.target.value)}
                                className="text-right font-bold h-9 rounded-lg"
                              />
                            </td>
                            <td className="px-4 py-3 text-right font-black text-slate-700">{(item?.amount ?? 0).toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => handleRemoveItem(index)}
                                className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Bottom Section: Terms & Totals */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 pt-8 border-t border-slate-100">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Terms & Conditions</Label>
                  <textarea 
                    value={terms} 
                    onChange={e => setTerms(e.target.value)}
                    className="w-full h-40 rounded-2xl border-slate-200 p-4 text-sm font-medium focus:ring-2 focus:ring-blue-500/20 outline-none resize-none bg-slate-50/30"
                  />
                </div>
                <div className="space-y-4 bg-slate-50/50 p-8 rounded-3xl border border-slate-100">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-500 uppercase tracking-widest">
                    <span>Total Amount</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold text-slate-500 uppercase tracking-widest">
                    <span>SRB Tax (15%)</span>
                    <span>{formatCurrency(srb)}</span>
                  </div>
                  <div className="h-px bg-slate-200 my-4" />
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-black text-[#0f172a] uppercase tracking-widest">Sub Total</span>
                    <span className="text-2xl font-black text-blue-600">{formatCurrency(subTotal)}</span>
                  </div>
                  
                  <div className="flex gap-3 pt-8">
                    <Button 
                      onClick={handleSave} 
                      disabled={saving}
                      className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest gap-3 shadow-xl shadow-blue-600/20"
                    >
                      {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                      Save {activeTab}
                    </Button>
                    <Button 
                      onClick={() => {
                        const tempDoc: DocumentData = {
                          doc_no: docNo,
                          type: activeTab,
                          date: date,
                          client_company: clientCompany,
                          contact_person: contactPerson,
                          client_address: clientAddress,
                          event_name: eventName,
                          items: items,
                          total_amount: total,
                          srb_amount: srb,
                          sub_total: subTotal,
                          terms: terms,
                          valid_until: validUntil,
                          event_date: eventDate
                        };
                        generatePDF(tempDoc);
                      }} 
                      variant="outline"
                      className="h-14 w-14 rounded-2xl border-slate-200 hover:bg-slate-50 text-slate-600"
                    >
                      <FileDown className="h-6 w-6" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="archive" className="space-y-6">
          {/* Saved Documents Table */}
          <div className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-tight">Saved Documents Archive</h2>
              <div className="relative w-full sm:max-w-xs group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                <Input 
                  placeholder="Search archive..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-11 h-12 bg-slate-50 border-none rounded-xl font-bold transition-all"
                />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white shadow-2xl shadow-slate-200/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Doc No</th>
                      <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Type</th>
                      <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Client / Event</th>
                      <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Date</th>
                      <th className="px-8 py-6 text-right text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Amount</th>
                      <th className="px-8 py-6 text-right text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
                          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-4">Retrieving Archives...</p>
                        </td>
                      </tr>
                    ) : (filteredDocs ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-20 text-center">
                          <p className="text-sm font-black text-slate-400 uppercase tracking-widest">No documents found in archive</p>
                        </td>
                      </tr>
                    ) : (
                      (filteredDocs ?? []).map((doc, idx) => (
                        <tr key={doc?.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'} hover:bg-blue-50/40 transition-all duration-200 group`}>
                          <td className="px-8 py-6 font-black text-blue-600 tracking-tight">{doc?.doc_no}</td>
                          <td className="px-8 py-6">
                            <Badge className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-tighter border-none shadow-sm ${doc?.type === 'Quotation' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                              {doc?.type}
                            </Badge>
                          </td>
                          <td className="px-8 py-6">
                            <p className="text-sm font-black text-[#0f172a] leading-none group-hover:text-blue-600 transition-colors">{doc?.client_company}</p>
                            <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">{doc?.event_name}</p>
                          </td>
                          <td className="px-8 py-6 text-sm font-black text-slate-500 tracking-tight">{doc?.date ? format(new Date(doc.date), 'MMM dd, yyyy') : "N/A"}</td>
                          <td className="px-8 py-6 text-right font-black text-[#0f172a] tracking-tight">{formatCurrency(doc?.sub_total ?? 0)}</td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-100/50 shadow-sm" onClick={() => generatePDF(doc)}>
                                <FileDown className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-100/50 shadow-sm" onClick={() => generateExcel(doc)}>
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-100/50 shadow-sm" onClick={() => doc?.id && handleDelete(doc.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Documents;
