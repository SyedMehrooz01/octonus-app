import { supabase } from "@/integrations/supabase/client";

export const getInventoryItems = async () => {
  try {
    const { data, error } = await supabase
      .from('inventory_items')
      .select('id, name, type, category, unit, current_stock, min_stock_level, purchase_price, supplier, status, created_at')
      .order('name');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getInventoryItems:", error);
    throw error;
  }
};

export const addInventoryItem = async (itemData: any) => {
  try {
    const { data, error } = await supabase.from('inventory_items').insert([itemData]).select();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addInventoryItem:", error);
    throw error;
  }
};

export const updateInventoryItem = async (id: string, itemData: any) => {
  try {
    const { data, error } = await supabase.from('inventory_items').update(itemData).eq('id', id);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in updateInventoryItem:", error);
    throw error;
  }
};

export const deleteInventoryItem = async (id: string) => {
  try {
    const { error } = await supabase.from('inventory_items').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error("Error in deleteInventoryItem:", error);
    throw error;
  }
};

export const getStockMovements = async () => {
  try {
    const { data, error } = await supabase
      .from('stock_movements')
      .select('id, item_id, item_name, movement_type, quantity, date, event_id, notes, created_by, created_at')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getStockMovements:", error);
    throw error;
  }
};

export const addStockMovement = async (movementData: any) => {
  try {
    const { data, error } = await supabase.from('stock_movements').insert([movementData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addStockMovement:", error);
    throw error;
  }
};

