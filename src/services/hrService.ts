import { supabase } from "@/integrations/supabase/client";

export const getStaff = async () => {
  const { data, error } = await supabase
    .from('staff')
    .select('id, name, email, role, department, salary, status, phone, address, emergency_contact, join_date, rights')
    .order('name');
  if (error) throw error;
  return data || [];
};

export const getStaffSummary = async () => {
  const { data, error } = await supabase
    .from('staff')
    .select('id, status');
  if (error) throw error;
  return data || [];
};

export const searchStaff = async (query: string) => {
  const { data, error } = await supabase
    .from('staff')
    .select('id, name, role')
    .ilike('name', `%${query}%`)
    .limit(3);
  if (error) throw error;
  return data || [];
};

export const addStaff = async (staffData: any) => {
  const { data, error } = await supabase.from('staff').insert([staffData]);
  if (error) throw error;
  return data;
};

export const updateStaff = async (id: string, staffData: any) => {
  const { data, error } = await supabase.from('staff').update(staffData).eq('id', id);
  if (error) throw error;
  return data;
};

export const deleteStaff = async (id: string) => {
  const { error } = await supabase.from('staff').delete().eq('id', id);
  if (error) throw error;
};

export const getAttendance = async () => {
  const { data, error } = await supabase
    .from('attendance')
    .select('id, employee_id, date, status, check_in, check_out')
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const upsertAttendance = async (attendanceData: any | any[]) => {
  const { data, error } = await supabase.from('attendance').upsert(attendanceData, { onConflict: 'employee_id,date' });
  if (error) throw error;
  return data;
};

export const updateAttendance = async (id: number, status: string) => {
  const { data, error } = await supabase.from('attendance').update({ status }).eq('id', id);
  if (error) throw error;
  return data;
};

export const getLeaves = async () => {
  const { data, error } = await supabase
    .from('leaves')
    .select('id, employee_id, leave_type, start_date, end_date, reason, status')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addLeave = async (leaveData: any) => {
  const { data, error } = await supabase.from('leaves').insert([leaveData]);
  if (error) throw error;
  return data;
};

export const updateLeaveStatus = async (id: number, status: string) => {
  const { data, error } = await supabase.from('leaves').update({ status }).eq('id', id);
  if (error) throw error;
  return data;
};

export const getAnnouncements = async (limit = 5) => {
  const { data, error } = await supabase
    .from('announcements')
    .select('id, title, message, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
};

export const addAnnouncement = async (announcementData: any) => {
  const { data, error } = await supabase.from('announcements').insert([announcementData]);
  if (error) throw error;
  return data;
};

export const getOvertime = async () => {
  const { data, error } = await supabase
    .from('overtime')
    .select('id, employee_id, hours, date, status')
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addOvertime = async (overtimeData: any) => {
  const { data, error } = await supabase.from('overtime').insert([overtimeData]);
  if (error) throw error;
  return data;
};

export const updateOvertimeStatus = async (id: number, status: string) => {
  const { data, error } = await supabase.from('overtime').update({ status }).eq('id', id);
  if (error) throw error;
  return data;
};

export const getAdvanceSalary = async () => {
  const { data, error } = await supabase
    .from('advance_salary')
    .select('id, employee_id, amount, reason, status')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addAdvanceSalary = async (advanceData: any) => {
  const { data, error } = await supabase.from('advance_salary').insert([advanceData]);
  if (error) throw error;
  return data;
};

export const updateAdvanceSalaryStatus = async (id: number, status: string) => {
  const { data, error } = await supabase.from('advance_salary').update({ status }).eq('id', id);
  if (error) throw error;
  return data;
};

export const getOutsideWorkers = async () => {
  const { data, error } = await supabase
    .from('outside_workers')
    .select('id, name, type, skill, phone, rate, rate_type')
    .order('name');
  if (error) throw error;
  return data || [];
};

export const addOutsideWorker = async (workerData: any) => {
  const { data, error } = await supabase.from('outside_workers').insert([workerData]);
  if (error) throw error;
  return data;
};

export const getWorkerAssignments = async () => {
  const { data, error } = await supabase
    .from('worker_assignments')
    .select('id, worker_id, event_name, date, amount, status')
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addWorkerAssignment = async (assignmentData: any) => {
  const { data, error } = await supabase.from('worker_assignments').insert([assignmentData]);
  if (error) throw error;
  return data;
};

export const getWorkerPayments = async () => {
  const { data, error } = await supabase
    .from('worker_payments')
    .select('id, worker_id, amount, date, method')
    .order('date', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addWorkerPayment = async (paymentData: any) => {
  const { data, error } = await supabase.from('worker_payments').insert([paymentData]);
  if (error) throw error;
  return data;
};
