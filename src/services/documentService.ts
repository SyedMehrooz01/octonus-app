import { supabase } from "@/integrations/supabase/client";

export const getDocuments = async () => {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("id, doc_number, doc_type, client_company, contact_person, client_address, event_name, invoice_date, event_date, valid_until, items, total_amount, srb_amount, sub_total, terms, status, created_by, created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map(doc => ({
      ...doc,
      items: typeof doc.items === 'string' ? JSON.parse(doc.items) : (doc.items ?? [])
    }));
  } catch (error) {
    console.error("Error in getDocuments:", error);
    throw error;
  }
};

export const addDocument = async (docData: any) => {
  try {
    const dataToSave = {
      ...docData,
      items: JSON.stringify(docData.items ?? [])
    };
    const { data, error } = await supabase.from("documents").insert([dataToSave]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addDocument:", error);
    throw error;
  }
};

export const deleteDocument = async (id: string) => {
  try {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw error;
  } catch (error) {
    console.error("Error in deleteDocument:", error);
    throw error;
  }
};

export const getLatestDocumentNumber = async (docType: string, prefix: string, year: number) => {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("doc_number")
      .eq("doc_type", docType)
      .like("doc_number", `${prefix}-${year}-%`)
      .order("doc_number", { ascending: false })
      .limit(1);
    if (error) throw error;
    return data?.[0]?.doc_number || null;
  } catch (error) {
    console.error("Error in getLatestDocumentNumber:", error);
    throw error;
  }
};

