-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  user_name TEXT,
  action TEXT NOT NULL,
  page TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all logs
CREATE POLICY "Admins can view all logs" 
  ON audit_logs FOR SELECT 
  USING (auth.jwt() ->> 'role' = 'admin');

-- Allow users to insert their own logs
CREATE POLICY "Users can insert their own logs" 
  ON audit_logs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);
