-- HRMS Tables Migration

-- 1. Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    department TEXT NOT NULL,
    salary NUMERIC NOT NULL DEFAULT 0,
    phone TEXT,
    email TEXT UNIQUE,
    address TEXT,
    emergency_contact TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    leave_balance JSONB DEFAULT '{"annual": 14, "sick": 10, "casual": 10, "maternity": 12, "paternity": 5, "hajj": 1}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Attendance Table
CREATE TABLE IF NOT EXISTS attendance (
    id BIGSERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL, -- 'present', 'absent', 'late', 'half-day'
    check_in TIME,
    check_out TIME,
    late_minutes INTEGER DEFAULT 0,
    is_auto BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Leave Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
    id BIGSERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'Annual', 'Sick', 'Casual', 'Maternity', 'Paternity', 'Hajj'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Advance Salary Table
CREATE TABLE IF NOT EXISTS advance_salary (
    id BIGSERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    reason TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'paid'
    request_date DATE NOT NULL DEFAULT CURRENT_DATE,
    deduction_month TEXT, -- e.g. 'March 2024'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Overtime Table
CREATE TABLE IF NOT EXISTS overtime (
    id BIGSERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    hours NUMERIC NOT NULL,
    rate NUMERIC NOT NULL DEFAULT 1.5,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'paid'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Payroll History Table
CREATE TABLE IF NOT EXISTS payroll_history (
    id BIGSERIAL PRIMARY KEY,
    employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
    month TEXT NOT NULL, -- e.g. 'March 2024'
    basic_salary NUMERIC NOT NULL,
    hra NUMERIC NOT NULL DEFAULT 0,
    medical_allowance NUMERIC NOT NULL DEFAULT 0,
    conveyance_allowance NUMERIC NOT NULL DEFAULT 0,
    special_allowance NUMERIC NOT NULL DEFAULT 0,
    overtime_pay NUMERIC NOT NULL DEFAULT 0,
    gross_salary NUMERIC NOT NULL,
    income_tax NUMERIC NOT NULL DEFAULT 0,
    eobi NUMERIC NOT NULL DEFAULT 0,
    pessi NUMERIC NOT NULL DEFAULT 0,
    loan_deduction NUMERIC NOT NULL DEFAULT 0,
    late_deduction NUMERIC NOT NULL DEFAULT 0,
    absence_deduction NUMERIC NOT NULL DEFAULT 0,
    net_salary NUMERIC NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'paid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS (Optional, but good practice)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE advance_salary ENABLE ROW LEVEL SECURITY;
ALTER TABLE overtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_history ENABLE ROW LEVEL SECURITY;

-- Simple RLS policies for now (Allow all to authenticated users)
CREATE POLICY "Allow all for authenticated users" ON employees FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON attendance FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON leave_requests FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON advance_salary FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON overtime FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON payroll_history FOR ALL USING (auth.role() = 'authenticated');
