import { supabase } from "@/integrations/supabase/client";

export const getUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('system_users')
      .select('id, full_name, email, role, status, page_access, action_permissions, last_login, created_by, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getUsers:", error);
    throw error;
  }
};

export const addUser = async (userData: any) => {
  try {
    const { data, error } = await supabase.from('system_users').insert([userData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addUser:", error);
    throw error;
  }
};

export const updateUser = async (id: string, userData: any) => {
  try {
    const { data, error } = await supabase.from('system_users').update(userData).eq('id', id);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in updateUser:", error);
    throw error;
  }
};

export const deleteUser = async (id: string) => {
  try {
    const { error } = await supabase.from('system_users').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error("Error in deleteUser:", error);
    throw error;
  }
};

