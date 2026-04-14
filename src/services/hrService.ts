import { supabase } from "@/integrations/supabase/client";

export const getStaff = async () => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role, department, salary, phone, email, joining_date, status, avatar, emergency_contact, address, created_at')
      .order('name');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getStaff:", error);
    throw error;
  }
};

export const getStaffSummary = async () => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, status');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getStaffSummary:", error);
    throw error;
  }
};

export const searchStaff = async (query: string) => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, name, role')
      .ilike('name', `%${query}%`)
      .limit(3);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in searchStaff:", error);
    throw error;
  }
};

export const addStaff = async (staffData: any) => {
  try {
    const { data, error } = await supabase.from('staff').insert([staffData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addStaff:", error);
    throw error;
  }
};

export const updateStaff = async (id: string, staffData: any) => {
  try {
    const { data, error } = await supabase.from('staff').update(staffData).eq('id', id);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in updateStaff:", error);
    throw error;
  }
};

export const deleteStaff = async (id: string) => {
  try {
    const { error } = await supabase.from('staff').delete().eq('id', id);
    if (error) throw error;
  } catch (error) {
    console.error("Error in deleteStaff:", error);
    throw error;
  }
};

export const getAttendance = async () => {
  try {
    const { data, error } = await supabase
      .from('attendance')
      .select('id, employee_id, date, check_in, check_out, status, created_at')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getAttendance:", error);
    throw error;
  }
};

export const upsertAttendance = async (attendanceData: any | any[]) => {
  try {
    const { data, error } = await supabase.from('attendance').upsert(attendanceData, { onConflict: 'employee_id,date' });
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in upsertAttendance:", error);
    throw error;
  }
};

export const updateAttendance = async (id: string, status: string) => {
  try {
    const { data, error } = await supabase.from('attendance').update({ status }).eq('id', id);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in updateAttendance:", error);
    throw error;
  }
};

export const getLeaves = async () => {
  try {
    const { data, error } = await supabase
      .from('leaves')
      .select('id, employee_id, leave_type, start_date, end_date, reason, status, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getLeaves:", error);
    throw error;
  }
};

export const addLeave = async (leaveData: any) => {
  try {
    const { data, error } = await supabase.from('leaves').insert([leaveData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addLeave:", error);
    throw error;
  }
};

export const updateLeaveStatus = async (id: string, status: string) => {
  try {
    const { data, error } = await supabase.from('leaves').update({ status }).eq('id', id);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in updateLeaveStatus:", error);
    throw error;
  }
};

export const getAnnouncements = async (limit = 5) => {
  try {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, message, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getAnnouncements:", error);
    throw error;
  }
};

export const addAnnouncement = async (announcementData: any) => {
  try {
    const { data, error } = await supabase.from('announcements').insert([announcementData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addAnnouncement:", error);
    throw error;
  }
};

export const getOvertime = async () => {
  try {
    const { data, error } = await supabase
      .from('overtime')
      .select('id, employee_id, date, hours, rate, total, status, created_at')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getOvertime:", error);
    throw error;
  }
};

export const addOvertime = async (overtimeData: any) => {
  try {
    const { data, error } = await supabase.from('overtime').insert([overtimeData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addOvertime:", error);
    throw error;
  }
};

export const updateOvertimeStatus = async (id: string, status: string) => {
  try {
    const { data, error } = await supabase.from('overtime').update({ status }).eq('id', id);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in updateOvertimeStatus:", error);
    throw error;
  }
};

export const getAdvanceSalary = async () => {
  try {
    const { data, error } = await supabase
      .from('advance_salary')
      .select('id, employee_id, amount, reason, status, request_date, deduction_month, created_at')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getAdvanceSalary:", error);
    throw error;
  }
};

export const addAdvanceSalary = async (advanceData: any) => {
  try {
    const { data, error } = await supabase.from('advance_salary').insert([advanceData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addAdvanceSalary:", error);
    throw error;
  }
};

export const updateAdvanceSalaryStatus = async (id: string, status: string) => {
  try {
    const { data, error } = await supabase.from('advance_salary').update({ status }).eq('id', id);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in updateAdvanceSalaryStatus:", error);
    throw error;
  }
};

export const getOutsideWorkers = async () => {
  try {
    const { data, error } = await supabase
      .from('outside_workers')
      .select('id, name, skill, phone, rate, rate_type, status, rating, type, created_at')
      .order('name');
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getOutsideWorkers:", error);
    throw error;
  }
};

export const addOutsideWorker = async (workerData: any) => {
  try {
    const { data, error } = await supabase.from('outside_workers').insert([workerData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addOutsideWorker:", error);
    throw error;
  }
};

export const getPayrollHistory = async () => {
  try {
    const { data, error } = await supabase
      .from('payroll_history')
      .select('id, employee_id, month, basic_salary, bonus, allowances, deductions, net_pay, status, payment_date, created_at')
      .order('month', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getPayrollHistory:", error);
    throw error;
  }
};

export const getWorkerAssignments = async () => {
  try {
    const { data, error } = await supabase
      .from('worker_assignments')
      .select('id, worker_id, event_name, date, amount, status')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getWorkerAssignments:", error);
    throw error;
  }
};

export const addWorkerAssignment = async (assignmentData: any) => {
  try {
    const { data, error } = await supabase.from('worker_assignments').insert([assignmentData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addWorkerAssignment:", error);
    throw error;
  }
};

export const getWorkerPayments = async () => {
  try {
    const { data, error } = await supabase
      .from('worker_payments')
      .select('id, worker_id, amount, date, method')
      .order('date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error in getWorkerPayments:", error);
    throw error;
  }
};

export const addWorkerPayment = async (paymentData: any) => {
  try {
    const { data, error } = await supabase.from('worker_payments').insert([paymentData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addWorkerPayment:", error);
    throw error;
  }
};

export const addPerformance = async (performanceData: any) => {
  try {
    const { data, error } = await supabase.from('performance').insert([performanceData]);
    if (error) throw error;
    return data;
  } catch (error) {
    console.error("Error in addPerformance:", error);
    throw error;
  }
};

