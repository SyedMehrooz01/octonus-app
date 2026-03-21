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
  History,
  FolderOpen,
  Upload,
  File,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileArchive,
  MoreVertical,
  Link,
  Eye as EyeIcon,
  X,
  Grid,
  List as ListIcon
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

interface FileManagerData {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: string;
  category: string;
  description: string;
  uploaded_by: string;
  created_at: string;
}

const Documents = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"Quotation" | "Invoice" | "archive" | "file-manager">("Quotation");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [documents, setDocuments] = useState<DocumentData[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // File Manager State
  const [files, setFiles] = useState<FileManagerData[]>([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
  const [fileCategory, setFileCategory] = useState("all");
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadCategory, setUploadCategory] = useState("General");
  const [uploadDescription, setUploadDescription] = useState("");

  const categories = [
    "Contracts", "Proposals", "Presentations", "Legal Documents", 
    "Client Documents", "Financial Records", "HR Documents", "General"
  ];

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
    if (activeTab === "file-manager") {
      fetchFiles();
    } else {
      fetchDocuments();
      generateDocNo();
    }
  }, [activeTab]);

  useEffect(() => {
    setTerms(activeTab === "Quotation" ? quotationTerms : invoiceTerms);
  }, [activeTab]);

  const fetchFiles = async () => {
    setFileLoading(true);
    try {
      const { data, error } = await supabase
        .from("file_manager")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err: any) {
      console.error("Fetch files error:", err);
      toast.error("Failed to fetch files");
    } finally {
      setFileLoading(false);
    }
  };

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file first");
      return;
    }

    setSaving(true);
    try {
      const fileName = uploadName || uploadFile.name;
      const fileExt = uploadFile.name.split(".").pop();
      const filePath = `${Math.random()}.${fileExt}`;

      // 1. Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // 2. Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      // 3. Save Metadata to DB
      const { error: dbError } = await supabase.from("file_manager").insert([
        {
          file_name: fileName,
          file_url: publicUrl,
          file_type: uploadFile.type,
          file_size: (uploadFile.size / 1024 / 1024).toFixed(2) + " MB",
          category: uploadCategory,
          description: uploadDescription,
          uploaded_by: user?.name || user?.email || "System",
        },
      ]);

      if (dbError) throw dbError;

      toast.success("File uploaded successfully");
      setIsUploading(false);
      setUploadFile(null);
      setUploadName("");
      setUploadDescription("");
      fetchFiles();
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFile = async (id: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      // Extract file path from URL
      const filePath = fileUrl.split("/").pop();
      if (filePath) {
        await supabase.storage.from("documents").remove([filePath]);
      }

      const { error } = await supabase.from("file_manager").delete().eq("id", id);
      if (error) throw error;

      toast.success("File deleted successfully");
      fetchFiles();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete file");
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return <FileText className="h-10 w-10 text-rose-500" />;
    if (type.includes("word") || type.includes("officedocument.wordprocessingml")) return <File className="h-10 w-10 text-blue-500" />;
    if (type.includes("excel") || type.includes("spreadsheet")) return <FileSpreadsheet className="h-10 w-10 text-emerald-500" />;
    if (type.includes("image")) return <FileImage className="h-10 w-10 text-purple-500" />;
    if (type.includes("video")) return <FileVideo className="h-10 w-10 text-amber-500" />;
    if (type.includes("zip") || type.includes("archive")) return <FileArchive className="h-10 w-10 text-slate-500" />;
    return <File className="h-10 w-10 text-slate-400" />;
  };

  const filteredFiles = (files ?? []).filter(file => {
    const matchesSearch = (file?.file_name ?? "").toLowerCase().includes(fileSearch.toLowerCase());
    const matchesCategory = fileCategory === "all" || file.category === fileCategory;
    return matchesSearch && matchesCategory;
  });

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("id, doc_number, doc_type, client_company, contact_person, client_address, event_name, invoice_date, event_date, valid_until, items, total_amount, srb_amount, sub_total, terms, status, created_by, created_at")
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
      const currentYear = new Date().getFullYear();
      
      const { data, error } = await supabase
        .from("documents")
        .select("doc_number")
        .eq("doc_type", activeTab)
        .like("doc_number", `${prefix}-${currentYear}-%`)
        .order("doc_number", { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNum = 1;
      if (data && data.length > 0) {
        const lastNo = data[0].doc_number;
        const parts = lastNo.split("-");
        const lastNum = parseInt(parts[parts.length - 1]);
        if (!isNaN(lastNum)) {
          nextNum = lastNum + 1;
        }
      }
      setDocNo(`${prefix}-${currentYear}-${nextNum.toString().padStart(3, "0")}`);
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
        status: "Active",
        created_by: user?.name || user?.email || "System"
      };

      if (activeTab === "Quotation") {
        docData.valid_until = validUntil;
      } else {
        docData.event_date = eventDate;
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
    const title = doc.doc_type === "Quotation" ? "QUOTATION" : "SALES TAX INVOICE";
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
    pdf.text(`${doc.doc_type} No: ${doc.doc_number}`, 120, 56);
    pdf.text(`Date: ${format(new Date(doc.invoice_date), "PP")}`, 120, 61);
    pdf.text(`Event: ${doc.event_name}`, 120, 66, { maxWidth: 75 });
    if (doc.doc_type === "Quotation" && doc.valid_until) {
      pdf.text(`Valid Until: ${format(new Date(doc.valid_until), "PP")}`, 120, 71);
    } else if (doc.doc_type === "Invoice" && doc.event_date) {
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

    pdf.save(`${doc.doc_number}_${doc.client_company.replace(/\s+/g, '_')}.pdf`);
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
    (doc?.doc_number ?? "").toLowerCase().includes(searchQuery.toLowerCase())
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
          <TabsTrigger value="file-manager" className="rounded-xl px-8 py-3 font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all gap-2">
            <FolderOpen className="h-4 w-4" /> File Manager
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
                          <td className="px-8 py-6 text-sm font-black text-slate-500 tracking-tight">{doc?.invoice_date ? format(new Date(doc.invoice_date), 'MMM dd, yyyy') : "N/A"}</td>
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

        <TabsContent value="file-manager" className="space-y-6 animate-in fade-in duration-500">
          <div className="flex flex-col gap-6">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <Button 
                  onClick={() => setIsUploading(true)} 
                  className="bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest gap-2 rounded-xl h-12 px-6 shadow-lg shadow-blue-600/20"
                >
                  <Upload className="h-4 w-4" /> Upload
                </Button>
                <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block" />
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <Button 
                    variant={viewMode === "grid" ? "secondary" : "ghost"} 
                    size="icon" 
                    onClick={() => setViewMode("grid")}
                    className={`h-10 w-10 rounded-lg ${viewMode === "grid" ? "bg-white shadow-sm" : ""}`}
                  >
                    <Grid className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant={viewMode === "list" ? "secondary" : "ghost"} 
                    size="icon" 
                    onClick={() => setViewMode("list")}
                    className={`h-10 w-10 rounded-lg ${viewMode === "list" ? "bg-white shadow-sm" : ""}`}
                  >
                    <ListIcon className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                <div className="relative group flex-1 sm:w-64">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-600 transition-colors" />
                  <Input 
                    placeholder="Search files..." 
                    value={fileSearch}
                    onChange={e => setFileSearch(e.target.value)}
                    className="pl-11 h-12 bg-slate-50 border-none rounded-xl font-bold"
                  />
                </div>
                <select 
                  value={fileCategory}
                  onChange={e => setFileCategory(e.target.value)}
                  className="h-12 px-4 bg-slate-50 border-none rounded-xl font-bold text-sm focus:ring-2 focus:ring-blue-500/20 outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload Modal Overlay */}
            {isUploading && (
              <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-[2rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in duration-300">
                  <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                      <h3 className="text-xl font-black text-[#0f172a]">Upload New File</h3>
                      <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mt-1">Add documents to your cloud storage</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => setIsUploading(false)} className="rounded-xl hover:bg-white">
                      <X className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="p-8 space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Select File</Label>
                      <div className="relative group">
                        <input 
                          type="file" 
                          onChange={e => {
                            const file = e.target.files?.[0] || null;
                            setUploadFile(file);
                            if (file) setUploadName(file.name.split('.')[0]);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="h-32 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-3 group-hover:border-blue-400 group-hover:bg-blue-50/50 transition-all">
                          {uploadFile ? (
                            <>
                              <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                                <File className="h-6 w-6" />
                              </div>
                              <span className="text-sm font-black text-blue-600">{uploadFile.name}</span>
                            </>
                          ) : (
                            <>
                              <div className="bg-slate-100 p-2 rounded-lg text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-100 transition-colors">
                                <Upload className="h-6 w-6" />
                              </div>
                              <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Click or drag file here</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">File Name</Label>
                        <Input 
                          value={uploadName} 
                          onChange={e => setUploadName(e.target.value)}
                          placeholder="File name"
                          className="h-12 rounded-xl font-bold bg-slate-50 border-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Category</Label>
                        <select 
                          value={uploadCategory}
                          onChange={e => setUploadCategory(e.target.value)}
                          className="w-full h-12 px-4 bg-slate-50 border-none rounded-xl font-bold text-sm outline-none"
                        >
                          {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Description (Optional)</Label>
                      <textarea 
                        value={uploadDescription}
                        onChange={e => setUploadDescription(e.target.value)}
                        placeholder="Add some notes about this file..."
                        className="w-full h-24 rounded-2xl bg-slate-50 border-none p-4 text-sm font-bold outline-none resize-none"
                      />
                    </div>

                    <Button 
                      onClick={handleFileUpload} 
                      disabled={saving || !uploadFile}
                      className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest gap-3 shadow-xl shadow-blue-600/20"
                    >
                      {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                      Start Upload
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* File Display Area */}
            {fileLoading ? (
              <div className="py-20 text-center bg-white rounded-3xl border border-slate-100">
                <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mt-4">Accessing Storage...</p>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-32 text-center bg-white rounded-3xl border border-slate-100">
                <div className="bg-slate-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <FolderOpen className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black text-[#0f172a]">No Files Found</h3>
                <p className="text-slate-400 font-bold mt-2">Upload your first document to get started.</p>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {(filteredFiles ?? []).map((file) => (
                  <div key={file.id} className="group bg-white rounded-[2rem] border border-slate-100 p-6 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-start justify-between mb-6">
                      <div className="p-4 bg-slate-50 rounded-2xl group-hover:scale-110 transition-transform duration-300">
                        {getFileIcon(file.file_type)}
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => window.open(file.file_url, '_blank')}
                          className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-50"
                          title="Preview"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => {
                            navigator.clipboard.writeText(file.file_url);
                            toast.success("Link copied to clipboard");
                          }}
                          className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-50"
                          title="Copy Link"
                        >
                          <Link className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteFile(file.id, file.file_url)}
                          className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-50"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-black text-[#0f172a] truncate mb-1" title={file.file_name}>{file.file_name}</h4>
                      <div className="flex items-center gap-2 mb-4">
                        <Badge className="bg-slate-100 text-slate-500 border-none text-[9px] font-black uppercase tracking-tighter px-2 py-0.5">
                          {file.category}
                        </Badge>
                        <span className="text-[10px] font-bold text-slate-300">{file.file_size}</span>
                      </div>
                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Uploaded By</span>
                          <span className="text-[11px] font-black text-slate-600 truncate max-w-[100px]">{file.uploaded_by}</span>
                        </div>
                        <a 
                          href={file.file_url} 
                          download={file.file_name}
                          className="bg-slate-900 text-white p-2.5 rounded-xl hover:bg-blue-600 transition-colors shadow-lg shadow-slate-900/10"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50/80 border-b border-slate-100">
                    <tr>
                      <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Name</th>
                      <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Category</th>
                      <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Size</th>
                      <th className="px-8 py-6 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Uploaded By</th>
                      <th className="px-8 py-6 text-right text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {(filteredFiles ?? []).map((file) => (
                      <tr key={file.id} className="hover:bg-blue-50/40 transition-all duration-200 group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-4">
                            <div className="p-2 bg-slate-50 rounded-lg group-hover:scale-110 transition-transform">
                              {getFileIcon(file.file_type)}
                            </div>
                            <span className="font-black text-[#0f172a] text-sm">{file.file_name}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5">
                          <Badge className="bg-slate-100 text-slate-500 border-none text-[10px] font-black uppercase tracking-tighter">
                            {file.category}
                          </Badge>
                        </td>
                        <td className="px-8 py-5 text-sm font-bold text-slate-400">{file.file_size}</td>
                        <td className="px-8 py-5">
                          <span className="text-sm font-black text-slate-600">{file.uploaded_by}</span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => window.open(file.file_url, '_blank')} className="h-9 w-9 rounded-xl text-blue-600 hover:bg-blue-100/50">
                              <EyeIcon className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => {
                              navigator.clipboard.writeText(file.file_url);
                              toast.success("Link copied to clipboard");
                            }} className="h-9 w-9 rounded-xl text-emerald-600 hover:bg-emerald-100/50">
                              <Link className="h-4 w-4" />
                            </Button>
                            <a href={file.file_url} download className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100">
                              <Download className="h-4 w-4" />
                            </a>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteFile(file.id, file.file_url)} className="h-9 w-9 rounded-xl text-rose-500 hover:bg-rose-100/50">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Documents;
