-- Run this in Supabase SQL Editor to create the assessments table.
-- Required for GET /profile/assessments and for prompt context (previous visits).

CREATE TABLE IF NOT EXISTS assessments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  primary_symptom TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  severity TEXT DEFAULT '',
  specialist TEXT DEFAULT '',
  urgency TEXT DEFAULT '',
  report TEXT DEFAULT '',
  report_json JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessments_patient_id_created_at
  ON assessments (patient_id, created_at DESC);

-- Optional: RLS (Row Level Security) - enable if you want users to only see their own rows.
-- ALTER TABLE assessments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Users can read own assessments" ON assessments FOR SELECT USING (auth.uid()::text = patient_id);
-- (Backend uses service key, so RLS is often not applied for server-side reads.)
