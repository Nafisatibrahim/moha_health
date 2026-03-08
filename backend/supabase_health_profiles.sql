-- Run this in Supabase SQL Editor to create the health_profiles table.
-- Required for GET /profile/health and PUT /profile/health.

CREATE TABLE IF NOT EXISTS health_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id TEXT UNIQUE NOT NULL,
  allergies TEXT DEFAULT '',
  past_surgeries TEXT DEFAULT '',
  last_surgery_date TEXT DEFAULT '',
  chronic_conditions TEXT DEFAULT '',
  medications TEXT DEFAULT '',
  blood_type TEXT DEFAULT '',
  family_history TEXT DEFAULT '',
  other_relevant TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Optional: trigger to auto-update updated_at on row change
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS health_profiles_updated_at ON health_profiles;
CREATE TRIGGER health_profiles_updated_at
  BEFORE UPDATE ON health_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
