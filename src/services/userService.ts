import { supabase } from "@/integrations/supabase/client";

export const getUsers = async () => {
  const { data, error } = await supabase
    .from('system_users')
    .select('id, full_name, email, role, status, page_access, action_permissions, last_login, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addUser = async (userData: any) => {
  const { data, error } = await supabase.from('system_users').insert([userData]);
  if (error) throw error;
  return data;
};

export const updateUser = async (id: string, userData: any) => {
  const { data, error } = await supabase.from('system_users').update(userData).eq('id', id);
  if (error) throw error;
  return data;
};

export const deleteUser = async (id: string) => {
  const { error } = await supabase.from('system_users').delete().eq('id', id);
  if (error) throw error;
};
