import { supabase } from "@/integrations/supabase/client";

export const getBookings = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, client_name, client_phone, event_type, event_date, venue, pax, total_amount, advance_paid, balance_due, status, created_at, menu, notes, payment_method, third_party, supplier_cost, selling_rate')
    .order('event_date', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getBookingsSummary = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, event_date, status, balance_due');
  if (error) throw error;
  return data || [];
};

export const searchBookings = async (query: string) => {
  const { data, error } = await supabase
    .from('bookings')
    .select('id, client_name, event_type')
    .ilike('client_name', `%${query}%`)
    .limit(3);
  if (error) throw error;
  return data || [];
};

export const addBooking = async (bookingData: any) => {
  const { data, error } = await supabase.from('bookings').insert([bookingData]);
  if (error) throw error;
  return data;
};

export const updateBooking = async (id: number, bookingData: any) => {
  const { data, error } = await supabase.from('bookings').update(bookingData).eq('id', id);
  if (error) throw error;
  return data;
};

export const deleteBooking = async (id: number) => {
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) throw error;
};

export const getMenus = async () => {
  const { data, error } = await supabase
    .from('menus')
    .select('id, name')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const getMenuItems = async () => {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, menu_id, name, quantity, unit, rate, created_at')
    .order('id', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const addMenuItem = async (itemData: any) => {
  const { data, error } = await supabase.from('menu_items').insert([itemData]);
  if (error) throw error;
  return data;
};

export const updateMenuItem = async (id: number | string, itemData: any) => {
  const { data, error } = await supabase.from('menu_items').update(itemData).eq('id', id);
  if (error) throw error;
  return data;
};

export const getSuppliers = async () => {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, contact_number, email, service_type, current_balance, opening_balance');
  if (error) throw error;
  return data || [];
};

export const addSupplier = async (supplierData: any) => {
  const { data, error } = await supabase.from('suppliers').insert([supplierData]);
  if (error) throw error;
  return data;
};

export const updateSupplier = async (id: string, supplierData: any) => {
  const { data, error } = await supabase.from('suppliers').update(supplierData).eq('id', id);
  if (error) throw error;
  return data;
};

export const getSupplierPayments = async () => {
  const { data, error } = await supabase
    .from('supplier_payments')
    .select('id, supplier_id, date, amount, method, notes')
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addSupplierPayment = async (paymentData: any) => {
  const { data, error } = await supabase.from('supplier_payments').insert([paymentData]);
  if (error) throw error;
  return data;
};

export const getKitchenItems = async (eventId: number) => {
  const { data, error } = await supabase
    .from('kitchen_items')
    .select('*')
    .eq('event_id', eventId);
  if (error) throw error;
  return data || [];
};

export const upsertKitchenItems = async (items: any[]) => {
  const { data, error } = await supabase.from('kitchen_items').upsert(items, { onConflict: 'event_id,item_name' });
  if (error) throw error;
  return data;
};

export const getRawMaterials = async (eventId: number) => {
  const { data, error } = await supabase
    .from('raw_materials')
    .select('*')
    .eq('event_id', eventId);
  if (error) throw error;
  return data || [];
};

export const upsertRawMaterials = async (materials: any[]) => {
  const { data, error } = await supabase.from('raw_materials').upsert(materials, { onConflict: 'event_id,material_name' });
  if (error) throw error;
  return data;
};
