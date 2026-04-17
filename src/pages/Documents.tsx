import { useState, useEffect, useCallback } from "react";
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
import * as documentService from "@/services/documentService";
import { useAuth } from "@/contexts/AuthContext";

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
  doc_number: string;
  doc_type: "Quotation" | "Invoice";
  invoice_date: string;
  valid_until?: string;
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
  status?: string;
  created_by?: string;
  created_at?: string;
}

const Documents = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"Quotation" | "Invoice" | "archive">("Quotation");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const fetchDocuments = useCallback(async (isMounted = true, retry = true) => {
    if (isMounted) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await documentService.getDocuments();
      if (!isMounted) return;
      setDocuments(data ?? []);
    } catch (err: any) {
      console.error("fetchDocuments unexpected error:", err);
      if (retry) {
        setTimeout(() => fetchDocuments(isMounted, false), 2000);
        return;
      }
      if (isMounted) {
        setError(err.message || "An unexpected error occurred while fetching documents.");
        setDocuments([]);
      }
    } finally {
      if (isMounted) setLoading(false);
    }
  }, []);


  const generateDocNo = useCallback(async (isMounted = true) => {
    if (activeTab === "archive") return;
    try {
      const prefix = activeTab === "Quotation" ? "QT" : "INV";
      const currentYear = new Date().getFullYear();
      
      const lastNo = await documentService.getLatestDocumentNumber(activeTab, prefix, currentYear);

      if (!isMounted) return;

      let nextNum = 1;
      if (lastNo) {
        const parts = lastNo.split("-");
        const lastNum = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      setDocNo(`${prefix}-${currentYear}-${nextNum.toString().padStart(3, "0")}`);
    } catch (err: any) {
      if (isMounted) toast.error("Failed to generate document number");
    }
  }, [activeTab]);

  useEffect(() => {
    let isMounted = true;
    fetchDocuments(isMounted);
    generateDocNo(isMounted);
    return () => { isMounted = false; };
  }, [fetchDocuments, generateDocNo]);

  useEffect(() => {
    setTerms(activeTab === "Quotation" ? quotationTerms : invoiceTerms);
  }, [activeTab]);

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
    if (activeTab === "archive") return;
    if (!clientCompany || !eventName) {
      toast.error("Please fill in client company and event name");
      return;
    }

    setSaving(true);
    try {
      const docData: Partial<DocumentData> = {
        doc_number: docNo,
        doc_type: activeTab as "Quotation" | "Invoice",
        invoice_date: date,
        client_company: clientCompany,
        contact_person: contactPerson,
        client_address: clientAddress,
        event_name: eventName,
        items: items,
        total_amount: total,
        srb_amount: srb,
        sub_total: subTotal,
        terms: terms,
        status: "Active",
        created_by: user?.name || user?.email || "System"
      };

      if (activeTab === "Quotation") {
        docData.valid_until = validUntil;
      } else if (activeTab === "Invoice") {
        docData.event_date = eventDate;
      }

      await documentService.addDocument(docData);

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

  const loadLogo = async (pdf: jsPDF, x: number, y: number, size: number) => {
    return new Promise<boolean>((resolve) => {
      const img = new Image();
      img.src = "/logo.png";
      img.onload = () => {
        try {
          pdf.addImage(img, 'PNG', x, y, size, size);
          resolve(true);
        } catch (e) {
          resolve(false);
        }
      };
      img.onerror = () => {
        resolve(false);
      };
    });
  };

  const generatePDFWithLetterhead = async (
    drawContent: (doc: jsPDF, startY: number, pageWidth: number, margin: number) => void,
    fileName: string
  ) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;

    // ── TOP HEADER ──────────────────────────────────────────────
    // Diagonal teal/cyan decorative stripes (top-left)
    doc.setFillColor(51, 204, 255); // cyan (#33CCFF)
    doc.triangle(0, 0, 38, 0, 0, 18, "F");
    doc.setFillColor(154, 205, 50); // green (#9ACD32)
    doc.triangle(0, 0, 28, 0, 0, 13, "F");

    // Thin horizontal lines
    doc.setDrawColor(51, 204, 255);
    doc.setLineWidth(0.4);
    doc.line(40, 6, pageWidth - margin, 6);
    doc.setDrawColor(154, 205, 50);
    doc.line(40, 9, pageWidth - margin, 9);

    // Company name (top right, styled)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(154, 205, 50); // green
    doc.text("Octonus", pageWidth - margin - 28, 12, { align: "right" });
    doc.setFontSize(14);
    doc.setTextColor(100, 100, 100);
    doc.text("Solutions", pageWidth - margin, 18, { align: "right" });
    doc.setFontSize(6);
    doc.setTextColor(120, 120, 120);
    doc.text("A SPECTACULAR TURN OF EVENTS", pageWidth - margin, 22, { align: "right" });

    // ── CONTENT AREA ────────────────────────────────────────────
    const contentStartY = 32;
    drawContent(doc, contentStartY, pageWidth, margin);

    // ── BOTTOM FOOTER ───────────────────────────────────────────
    const footerY = pageHeight - 22;

    // Olive green footer bar
    doc.setFillColor(154, 205, 50); // #9ACD32
    doc.rect(0, footerY, pageWidth, 22, "F");

    // Decorative teal/cyan triangle (bottom right)
    doc.setFillColor(51, 204, 255); // #33CCFF
    doc.triangle(pageWidth, footerY + 8, pageWidth, pageHeight, pageWidth - 22, pageHeight, "F");
    doc.setFillColor(154, 205, 50); // #9ACD32
    doc.triangle(pageWidth, footerY + 14, pageWidth, pageHeight, pageWidth - 14, pageHeight, "F");

    // Footer text — 3 columns
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);

    // Left: Address
    doc.text("Office No. 2, Crown Centre,", 18, footerY + 8);
    doc.text("Gulshan-e-Iqbal, Karachi", 18, footerY + 14);

    // Center: Email + Website
    doc.text("octonussolutions@gmail.com", pageWidth / 2, footerY + 8, { align: "center" });
    doc.text("www.octonussolutions.com.pk", pageWidth / 2, footerY + 14, { align: "center" });

    // Right: Phone
    doc.text("+92 331 3195 292", pageWidth - 18, footerY + 8, { align: "right" });
    doc.text("021 34 977 797", pageWidth - 18, footerY + 14, { align: "right" });

    doc.save(fileName);
  };

  const generatePDF = async (doc: DocumentData) => {
    if (!doc.client_company || !doc.doc_number || (doc.items ?? []).length === 0) {
      toast.error("Required document fields are missing");
      return;
    }

    const isInvoice = doc.doc_type === "Invoice";
    const title = isInvoice ? "INVOICE" : "QUOTATION";

    await generatePDFWithLetterhead((pdf, startY, pageWidth, margin) => {
      // Document title
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.setTextColor(40, 40, 40);
      pdf.text(title, pageWidth / 2, startY + 6, { align: "center" });

      // Horizontal rule below title
      pdf.setDrawColor(180, 180, 180);
      pdf.setLineWidth(0.3);
      pdf.line(margin, startY + 10, pageWidth - margin, startY + 10);

      // Doc number + date (two columns)
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(80, 80, 80);
      pdf.text(`${title} No: ${doc.doc_number ?? "N/A"}`, margin, startY + 18);
      pdf.text(`Date: ${doc.invoice_date ? format(new Date(doc.invoice_date), "dd MMM yyyy") : "N/A"}`, pageWidth - margin, startY + 18, { align: "right" });

      // Valid until (for quotations)
      if (!isInvoice && doc.valid_until) {
        pdf.text(`Valid Until: ${format(new Date(doc.valid_until), "dd MMM yyyy")}`, margin, startY + 24);
      }

      // Bill To section
      const billY = startY + 32;
      pdf.setFillColor(245, 245, 245);
      pdf.roundedRect(margin, billY, (pageWidth - 2 * margin) / 2 - 4, 24, 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text("BILL TO", margin + 4, billY + 7);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(30, 30, 30);
      pdf.text(doc.client_company ?? "N/A", margin + 4, billY + 14);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(80, 80, 80);
      pdf.text(doc.contact_person ?? "", margin + 4, billY + 20);

      // Items Table
      const tableStartY = billY + 32;
      const colWidths = [10, 75, 25, 25, 35]; // #, Description, Qty, Rate, Amount
      const colX = [margin, margin + 10, margin + 85, margin + 110, margin + 135];
      const rowH = 8;

      // Table header
      pdf.setFillColor(100, 116, 55); // olive green matching footer
      pdf.rect(margin, tableStartY, pageWidth - 2 * margin, rowH, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      ["#", "DESCRIPTION", "QTY", "RATE", "AMOUNT"].forEach((h, i) => {
        pdf.text(h, colX[i] + 2, tableStartY + 5.5);
      });

      // Table rows
      const items = doc.items ?? [];
      items.forEach((item: any, idx: number) => {
        const rowY = tableStartY + rowH + idx * rowH;
        if (idx % 2 === 0) {
          pdf.setFillColor(250, 250, 250);
          pdf.rect(margin, rowY, pageWidth - 2 * margin, rowH, "F");
        }
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(50, 50, 50);
        pdf.text(String(idx + 1), colX[0] + 2, rowY + 5.5);
        pdf.text(String(item.description ?? item.name ?? ""), colX[1] + 2, rowY + 5.5, { maxWidth: 72 });
        pdf.text(String(item.quantity ?? item.qty ?? 1), colX[2] + 2, rowY + 5.5);
        pdf.text(`Rs ${Number(item.rate ?? item.unit_price ?? 0).toLocaleString()}`, colX[3] + 2, rowY + 5.5);
        const amt = (item.quantity ?? item.qty ?? 1) * (item.rate ?? item.unit_price ?? 0);
        pdf.text(`Rs ${Number(amt).toLocaleString()}`, colX[4] + 2, rowY + 5.5);
      });

      // Totals section
      const totalsY = tableStartY + rowH + items.length * rowH + 6;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(pageWidth - margin - 60, totalsY, pageWidth - margin, totalsY);

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(60, 60, 60);
      pdf.text("Subtotal:", pageWidth - margin - 58, totalsY + 7);
      pdf.text(`Rs ${Number(doc.total_amount ?? doc.sub_total ?? 0).toLocaleString()}`, pageWidth - margin, totalsY + 7, { align: "right" });

      if (doc.srb_amount) {
        pdf.text("SRB (15%):", pageWidth - margin - 58, totalsY + 14);
        pdf.setTextColor(220, 50, 50);
        pdf.text(`Rs ${Number(doc.srb_amount).toLocaleString()}`, pageWidth - margin, totalsY + 14, { align: "right" });
      }

      // Grand total box
      pdf.setFillColor(100, 116, 55);
      pdf.roundedRect(pageWidth - margin - 62, totalsY + 18, 62, 12, 2, 2, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text("TOTAL:", pageWidth - margin - 58, totalsY + 26);
      pdf.text(`Rs ${Number(doc.sub_total ?? 0).toLocaleString()}`, pageWidth - margin - 2, totalsY + 26, { align: "right" });

      // Notes
      if (doc.terms) {
        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(8);
        pdf.setTextColor(120, 120, 120);
        const splitTerms = pdf.splitTextToSize(doc.terms, pageWidth - 2 * margin);
        pdf.text(splitTerms, margin, totalsY + 38);
      }

      // Thank you line
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 55);
      pdf.text("Thank you for choosing Octonus Solutions!", pageWidth / 2, totalsY + 48 + (doc.terms ? (pdf.splitTextToSize(doc.terms, pageWidth - 2 * margin).length * 4) : 0), { align: "center" });

    }, `${title}_${doc.doc_number ?? doc.id}.pdf`);
  };

  const generateExcel = (doc: DocumentData) => {
    const wb = XLSX.utils.book_new();
    
    const header = [
      ["OCTONUS SOLUTIONS"],
      [COMPANY.tagline],
      [COMPANY.address],
      [`Phone: ${COMPANY.phone} | Email: ${COMPANY.email}`],
      [],
      [doc.doc_type.toUpperCase()],
      [],
      ["Client Details:", "", "", "Document Info:"],
      [`Company: ${doc.client_company}`, "", "", `${doc.doc_type} No: ${doc.doc_number}`],
      [`Contact: ${doc.contact_person}`, "", "", `Date: ${doc.invoice_date}`],
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

    XLSX.utils.book_append_sheet(wb, ws, doc.doc_type);
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const data = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(data, `${doc.doc_number}_${doc.client_company.replace(/\s+/g, '_')}.xlsx`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    
    try {
      await documentService.deleteDocument(id);
      toast.success("Document deleted");
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete document");
    }
  };

  const handleConvertDocType = async (doc: DocumentData) => {
    if (!doc.id) return;
    const newType = doc.doc_type === "Quotation" ? "Invoice" : "Quotation";
    const prefix = newType === "Invoice" ? "INV" : "QT";
    const newDocNumber = doc.doc_number?.replace(/^(QT|INV)/, prefix) ?? `${prefix}-${Date.now()}`;
    
    try {
      await documentService.updateDocument(doc.id, {
        doc_type: newType,
        doc_number: newDocNumber
      });
      
      toast.success(`Converted to ${newType} successfully`);
      fetchDocuments();
    } catch (err: any) {
      toast.error(err.message || "Conversion failed");
    }
  };

  const filteredDocs = (documents ?? []).filter(doc => 
    (doc?.client_company ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc?.event_name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (doc?.doc_number ?? "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading && (documents ?? []).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-4" />
        <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Loading documents...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm m-4">
        <h2 className="text-xl font-black text-[#0f172a] uppercase tracking-tight mb-4">Error Loading Documents</h2>
        <p className="text-slate-500 mb-6 font-bold">{error}</p>
        <Button onClick={() => fetchDocuments(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl px-8 h-12 gap-2 shadow-lg shadow-blue-600/20">
          <History className="h-4 w-4" /> RETRY LOADING
        </Button>
      </div>
    );
  }

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
                  <div className="px-8 pt-8 pb-4">
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
                  ) : activeTab === "Invoice" ? (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Event Date</Label>
                      <Input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)} className="h-12 rounded-xl font-bold" />
                    </div>
                  ) : null}
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
                    <Button onClick={() => handleAddItem()} variant="outline" className="rounded-xl font-black text-[10px] uppercase tracking-widest gap-2 h-10 border-blue-200 text-blue-600 hover:bg-blue-50">
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
                        onClick={() => handleSave()} 
                        disabled={saving}
                        className="flex-1 h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest gap-3 shadow-xl shadow-blue-600/20"
                      >
                        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                        Save {activeTab}
                      </Button>
                      <Button 
                        onClick={() => {
                          const tempDoc: DocumentData = {
                            doc_number: docNo,
                            doc_type: activeTab,
                            invoice_date: date,
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
                            <td className="px-8 py-6 font-black text-blue-600 tracking-tight">{doc?.doc_number}</td>
                            <td className="px-8 py-6">
                              <Badge className={`rounded-lg px-3 py-1 text-[10px] font-black uppercase tracking-tighter border-none shadow-sm ${doc?.doc_type === 'Quotation' ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                {doc?.doc_type}
                              </Badge>
                            </td>
                            <td className="px-8 py-6">
                              <p className="text-sm font-black text-[#0f172a] leading-none group-hover:text-blue-600 transition-colors">{doc?.client_company}</p>
                              <p className="text-[11px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">{doc?.event_name}</p>
                            </td>
                            <td className="px-8 py-6 text-sm font-black text-slate-500 tracking-tight">{doc?.invoice_date ? format(new Date(doc.invoice_date), 'MMM dd, yyyy') : "No date"}</td>
                            <td className="px-8 py-6 text-right font-black text-[#0f172a] tracking-tight">{formatCurrency(doc?.sub_total ?? 0)}</td>
                            <td className="px-8 py-6 text-right">
                              <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  onClick={() => handleConvertDocType(doc)} 
                                  className="rounded-lg h-8 px-3 text-[10px] font-black uppercase tracking-widest border-indigo-200 text-indigo-600 hover:bg-indigo-50" 
                                > 
                                  {doc.doc_type === "Quotation" ? "→ Invoice" : "→ Quotation"} 
                                </Button> 
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
