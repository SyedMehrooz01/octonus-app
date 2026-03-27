import { supabase } from "@/integrations/supabase/client";

export const getLedgerEntries = async () => {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('id, date, description, debit, credit, balance, account_type, reference, created_at')
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getLedgerByDateRange = async (start: string, end: string) => {
  const { data, error } = await supabase
    .from('ledger_entries')
    .select('debit, date')
    .gte('date', start)
    .lte('date', end);
  if (error) throw error;
  return data || [];
};

export const addLedgerEntry = async (entryData: any) => {
  const { data, error } = await supabase.from('ledger_entries').insert([entryData]);
  if (error) throw error;
  return data;
};

export const deleteLedgerEntry = async (id: string | number) => {
  const { error } = await supabase.from('ledger_entries').delete().eq('id', id);
  if (error) throw error;
};

export const getExpenses = async () => {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, voucher_no, date, description, category, payment_mode, amount, linked_event, status, approved_by, approved_at, created_by, created_by_name, created_by_id, created_by_role, created_at, rejection_reason')
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const getExpensesByDateRange = async (start: string, end: string) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('amount, date')
    .eq('status', 'approved')
    .gte('date', start)
    .lte('date', end);
  if (error) throw error;
  return data || [];
};

export const searchExpenses = async (query: string) => {
  const { data, error } = await supabase
    .from('expenses')
    .select('id, description, amount')
    .ilike('description', `%${query}%`)
    .limit(3);
  if (error) throw error;
  return data || [];
};

export const addExpense = async (expenseData: any) => {
  const { data, error } = await supabase.from('expenses').insert([expenseData]);
  if (error) throw error;
  return data;
};

export const updateExpenseStatus = async (id: string | number, statusData: any) => {
  const { data, error } = await supabase.from('expenses').update(statusData).eq('id', id);
  if (error) throw error;
  return data;
};

export const deleteExpense = async (id: string | number) => {
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw error;
};
