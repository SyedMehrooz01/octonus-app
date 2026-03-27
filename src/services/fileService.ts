import { supabase } from "@/integrations/supabase/client";

export const getFiles = async (folderId: string | null = null) => {
  let query = supabase
    .from('file_manager')
    .select('id, name, type, size, url, parent_id, created_at, created_by')
    .order('created_at', { ascending: false });
  
  if (folderId) {
    query = query.eq('parent_id', folderId);
  } else {
    query = query.is('parent_id', null);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const addFileRecord = async (fileData: any) => {
  const { data, error } = await supabase.from('file_manager').insert([fileData]);
  if (error) throw error;
  return data;
};

export const deleteFileRecord = async (id: string) => {
  const { error } = await supabase.from('file_manager').delete().eq('id', id);
  if (error) throw error;
};

export const uploadFile = async (bucket: string, path: string, file: File) => {
  const { data, error } = await supabase.storage.from(bucket).upload(path, file);
  if (error) throw error;
  return data;
};

export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};

export const deleteFileStorage = async (bucket: string, paths: string[]) => {
  const { data, error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
  return data;
};
