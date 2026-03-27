import { supabase } from "@/integrations/supabase/client";

export const getInventoryItems = async () => {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('id, name, type, category, unit, current_stock, min_stock_level, purchase_price, supplier, status, created_at')
    .order('name');
  if (error) throw error;
  return data || [];
};

export const addInventoryItem = async (itemData: any) => {
  const { data, error } = await supabase.from('inventory_items').insert([itemData]);
  if (error) throw error;
  return data;
};

export const updateInventoryItem = async (id: string, itemData: any) => {
  const { data, error } = await supabase.from('inventory_items').update(itemData).eq('id', id);
  if (error) throw error;
  return data;
};

export const deleteInventoryItem = async (id: string) => {
  const { error } = await supabase.from('inventory_items').delete().eq('id', id);
  if (error) throw error;
};

export const getStockMovements = async () => {
  const { data, error } = await supabase
    .from('stock_movements')
    .select('id, item_id, item_name, type, category, qty, date, note, issued_to, returned_by, return_date, created_at')
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addStockMovement = async (movementData: any) => {
  // Map UI 'qty' to database 'qty' if needed, but here we assume DB also uses 'qty'
  // Based on the UI's addStockMovement call, it passes 'qty' and 'note' (singular)
  const { data, error } = await supabase.from('stock_movements').insert([movementData]);
  if (error) throw error;
  return data;
};
