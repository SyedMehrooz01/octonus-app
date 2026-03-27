import { supabase } from "@/integrations/supabase/client";

export const getDocuments = async () => {
  const { data, error } = await supabase
    .from("documents")
    .select("id, doc_number, doc_type, client_company, contact_person, client_address, event_name, invoice_date, event_date, valid_until, items, total_amount, srb_amount, sub_total, terms, status, created_by, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addDocument = async (docData: any) => {
  const { data, error } = await supabase.from("documents").insert([docData]);
  if (error) throw error;
  return data;
};

export const deleteDocument = async (id: string) => {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
};

export const getLatestDocumentNumber = async (docType: string, prefix: string, year: number) => {
  const { data, error } = await supabase
    .from("documents")
    .select("doc_number")
    .eq("doc_type", docType)
    .like("doc_number", `${prefix}-${year}-%`)
    .order("doc_number", { ascending: false })
    .limit(1);
  if (error) throw error;
  return data?.[0]?.doc_number || null;
};
