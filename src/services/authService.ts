import { supabase } from "@/integrations/supabase/client";

export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

export const onAuthStateChange = (callback: (event: any, session: any) => void) => {
  return supabase.auth.onAuthStateChange(callback);
};

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) throw error;
  return data;
};

export const signUp = async (email: string, password: string, metadata: any) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  });
  if (error) throw error;
  return data;
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

export const logAuditAction = async (auditData: any) => {
  const { error } = await supabase.from("audit_logs").insert([auditData]);
  if (error) throw error;
};

export const getAuditLogs = async () => {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(100);
  if (error) throw error;
  return data || [];
};
