import { supabase } from "@/integrations/supabase/client";

export const getLedgerEntries = async () => {
  try {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('id, date, description, debit, credit, balance, account_type, reference, created_at')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getLedgerEntries:", error);
    throw error;
  }
};

export const getLedgerByDateRange = async (start: string, end: string) => {
  try {
    const { data, error } = await supabase
      .from('ledger_entries')
      .select('debit, credit, date')
      .gte('date', start)
      .lte('date', end);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getLedgerByDateRange:", error);
    throw error;
  }
};

export const addLedgerEntry = async (entryData: any) => {
  try {
    const { data, error } = await supabase.from('ledger_entries').insert([entryData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addLedgerEntry:", error);
    throw error;
  }
};

export const deleteLedgerEntry = async (id: string) => {
  try {
    const { error } = await supabase.from('ledger_entries').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error("Error in deleteLedgerEntry:", error);
    throw error;
  }
};

export const getExpenses = async () => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, voucher_no, date, description, category, payment_mode, amount, linked_event, status, approved_by, approved_at, created_by, created_by_name, created_by_id, created_by_role, created_at, rejection_reason')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getExpenses:", error);
    throw error;
  }
};

export const getExpensesByDateRange = async (start: string, end: string) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('amount, date')
      .eq('status', 'approved')
      .gte('date', start)
      .lte('date', end);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getExpensesByDateRange:", error);
    throw error;
  }
};

export const searchExpenses = async (query: string) => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('id, description, amount')
      .ilike('description', `%${query}%`)
      .limit(3);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in searchExpenses:", error);
    throw error;
  }
};

export const addExpense = async (expenseData: any) => {
  try {
    const { data, error } = await supabase.from('expenses').insert([expenseData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addExpense:", error);
    throw error;
  }
};

export const updateExpenseStatus = async (id: string, statusData: any) => {
  try {
    const { data, error } = await supabase.from('expenses').update(statusData).eq('id', id);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in updateExpenseStatus:", error);
    throw error;
  }
};

export const deleteExpense = async (id: string) => {
  try {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error("Error in deleteExpense:", error);
    throw error;
  }
};

