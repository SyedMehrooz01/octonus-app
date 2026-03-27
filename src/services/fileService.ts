import { supabase } from "@/integrations/supabase/client";

export const getFiles = async () => {
  try {
    const { data, error } = await supabase
      .from('file_manager')
      .select('id, file_name, file_url, file_type, file_size, category, description, uploaded_by, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getFiles:", error);
    throw error;
  }
};

export const addFileRecord = async (fileData: any) => {
  try {
    const { data, error } = await supabase.from('file_manager').insert([fileData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addFileRecord:", error);
    throw error;
  }
};

export const deleteFileRecord = async (id: string) => {
  try {
    const { error } = await supabase.from('file_manager').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error("Error in deleteFileRecord:", error);
    throw error;
  }
};

export const uploadFile = async (bucket: string, path: string, file: File) => {
  try {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in uploadFile:", error);
    throw error;
  }
};

export const deleteFileStorage = async (bucket: string, paths: string[]) => {
  try {
    const { data, error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in deleteFileStorage:", error);
    throw error;
  }
};

export const getPublicUrl = (bucket: string, path: string) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
