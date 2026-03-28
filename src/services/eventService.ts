import { supabase } from "@/integrations/supabase/client";

export const getBookings = async () => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, client_name, client_phone, event_type, event_date, venue, pax, total_amount, advance_paid, balance_due, status, menu, notes, created_at')
      .order('event_date', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getBookings:", error);
    throw error;
  }
};

export const getBookingsSummary = async () => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, event_date, status, balance_due');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getBookingsSummary:", error);
    throw error;
  }
};

export const searchBookings = async (query: string) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('id, client_name, event_type')
      .ilike('client_name', `%${query}%`)
      .limit(3);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in searchBookings:", error);
    throw error;
  }
};

export const addBooking = async (bookingData: any) => {
  try {
    const { data, error } = await supabase.from('bookings').insert([bookingData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addBooking:", error);
    throw error;
  }
};

export const updateBooking = async (id: string, bookingData: any) => {
  try {
    const { data, error } = await supabase.from('bookings').update(bookingData).eq('id', id);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in updateBooking:", error);
    throw error;
  }
};

export const deleteBooking = async (id: string) => {
  try {
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error("Error in deleteBooking:", error);
    throw error;
  }
};

export const getMenus = async () => {
  try {
    const { data, error } = await supabase
      .from('menus')
      .select('id, name')
      .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getMenus:", error);
    throw error;
  }
};

export const getMenuItems = async () => {
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('id, menu_id, name, quantity, unit, rate, created_at')
      .order('id', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getMenuItems:", error);
    throw error;
  }
};

export const addMenuItem = async (itemData: any) => {
  try {
    const { data, error } = await supabase.from('menu_items').insert([itemData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addMenuItem:", error);
    throw error;
  }
};

export const updateMenuItem = async (id: number | string, itemData: any) => {
  try {
    const { data, error } = await supabase.from('menu_items').update(itemData).eq('id', id);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in updateMenuItem:", error);
    throw error;
  }
};

export const getSuppliers = async () => {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .select('id, name, contact_number, email, service_type, current_balance, opening_balance');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getSuppliers:", error);
    throw error;
  }
};

export const addSupplier = async (supplierData: any) => {
  try {
    const { data, error } = await supabase.from('suppliers').insert([supplierData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addSupplier:", error);
    throw error;
  }
};

export const updateSupplier = async (id: string, supplierData: any) => {
  try {
    const { data, error } = await supabase.from('suppliers').update(supplierData).eq('id', id);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in updateSupplier:", error);
    throw error;
  }
};

export const getSupplierPayments = async () => {
  try {
    const { data, error } = await supabase
      .from('supplier_payments')
      .select('id, supplier_id, amount, payment_date, payment_method, notes, created_by, created_at')
      .order('payment_date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getSupplierPayments:", error);
    throw error;
  }
};

export const addSupplierPayment = async (paymentData: any) => {
  try {
    // Map UI fields to DB fields if they differ
    const dbData = {
      supplier_id: paymentData.supplier_id,
      amount: paymentData.amount,
      payment_date: paymentData.payment_date || paymentData.date,
      payment_method: paymentData.payment_method || paymentData.method,
      notes: paymentData.notes,
      created_by: paymentData.created_by
    };
    const { data, error } = await supabase.from('supplier_payments').insert([dbData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addSupplierPayment:", error);
    throw error;
  }
};

export const getKitchenItems = async (eventId: string) => {
  try {
    const { data, error } = await supabase
      .from('kitchen_items')
      .select('*')
      .eq('event_id', eventId);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getKitchenItems:", error);
    throw error;
  }
};

export const upsertKitchenItems = async (items: any[]) => {
  try {
    const { data, error } = await supabase.from('kitchen_items').upsert(items, { onConflict: 'event_id,item_name' });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in upsertKitchenItems:", error);
    throw error;
  }
};

export const getRawMaterials = async (eventId: string) => {
  try {
    const { data, error } = await supabase
      .from('raw_materials')
      .select('*')
      .eq('event_id', eventId);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getRawMaterials:", error);
    throw error;
  }
};

export const upsertRawMaterials = async (materials: any[]) => {
  try {
    const { data, error } = await supabase.from('raw_materials').upsert(materials, { onConflict: 'event_id,material_name' });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in upsertRawMaterials:", error);
    throw error;
  }
};

