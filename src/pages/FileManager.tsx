import { useState, useEffect } from "react";
import { 
  Plus, 
  Trash2, 
  Download, 
  Search, 
  Loader2, 
  Save, 
  FolderOpen,
  Upload,
  File,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  FileArchive,
  Link,
  Eye as EyeIcon,
  X,
  Grid,
  List as ListIcon
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import * as fileService from "@/services/fileService";
import { useAuth } from "@/contexts/AuthContext";

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

const FileManager = () => {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  
  // File Manager State
  const [files, setFiles] = useState<FileManagerData[]>([]);
  const [fileLoading, setFileLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const fetchFiles = useCallback(async (isMounted = true) => {
    if (isMounted) {
      setFileLoading(true);
      setError(null);
    }
    try {
      const data = await fileService.getFiles();
      if (!isMounted) return;
      if (!data) throw new Error("Failed to fetch files.");
      setFiles(data);
    } catch (err: any) {
      console.error("fetchFiles unexpected error:", err);
      if (isMounted) {
        setError(err.message || "An unexpected error occurred while fetching files.");
        setFiles([]);
      }
    } finally {
      if (isMounted) setFileLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    fetchFiles(isMounted);
    return () => { isMounted = false; };
  }, [fetchFiles]);

  const handleFileUpload = async () => {
    if (!uploadFile) {
      toast.error("Please select a file first");
      return;
    }

    setSaving(true);
    try {
      const fileName = uploadName || uploadFile.name;
      const fileExt = uploadFile.name.split(".").pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // 1. Upload to Supabase Storage in "documents" bucket
      await fileService.uploadFile("documents", filePath, uploadFile);

      // 2. Get Public URL
      const publicUrl = fileService.getPublicUrl("documents", filePath);

      // 3. Save Metadata to "file_manager" table
      await fileService.addFileRecord({
        file_name: fileName,
        file_url: publicUrl,
        file_type: uploadFile.type,
        file_size: (uploadFile.size / 1024 / 1024).toFixed(2) + " MB",
        category: uploadCategory,
        description: uploadDescription,
        uploaded_by: user?.name || user?.email || "System",
        created_at: new Date().toISOString()
      });

      toast.success("File uploaded successfully");
      setIsUploading(false);
      setUploadFile(null);
      setUploadName("");
      setUploadDescription("");
      fetchFiles();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err.message || "Failed to upload file");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteFile = async (id: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;

    try {
      // 1. Extract file path from URL to delete from Storage
      // Public URL format: https://[project-id].supabase.co/storage/v1/object/public/documents/[path]
      const urlParts = fileUrl.split("/");
      const filePath = urlParts[urlParts.length - 1];
      
      if (filePath) {
        await fileService.deleteFileStorage("documents", [filePath]);
      }

      // 2. Delete record from database
      await fileService.deleteFileRecord(id);

      toast.success("File deleted successfully");
      fetchFiles();
    } catch (err: any) {
      console.error("Delete error:", err);
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

  return (
    <div className="space-y-8 pb-10 max-w-full overflow-hidden">
      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-600 px-6 py-4 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top duration-300">
          <FolderOpen className="h-5 w-5" />
          <p className="font-bold">{error}</p>
          <Button variant="ghost" size="sm" onClick={() => fetchFiles(true)} className="ml-auto text-rose-600 hover:bg-rose-100 font-black uppercase text-[10px] tracking-widest">Retry</Button>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="animate-in fade-in slide-in-from-left duration-500">
          <h1 className="text-3xl font-black text-[#0f172a] tracking-tight">File Manager</h1>
          <p className="text-slate-500 font-bold mt-1">Manage all your company documents in one place.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 animate-in fade-in duration-500">
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
    </div>
  );
};

export default FileManager;
