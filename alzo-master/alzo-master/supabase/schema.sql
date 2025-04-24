-- Create profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('patient', 'caregiver', 'doctor')),
  patient_id TEXT UNIQUE,
  specialty TEXT,
  sos_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create medications table
CREATE TABLE medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES profiles(id) NOT NULL,
  doctor_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  time TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  taken BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES profiles(id) NOT NULL,
  doctor_id UUID REFERENCES profiles(id) NOT NULL,
  date DATE NOT NULL,
  time TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create sos_alerts table
CREATE TABLE sos_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES profiles(id) NOT NULL,
  doctor_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT CHECK (status IN ('active', 'resolved')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create videos table
CREATE TABLE videos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create patients table for medical records
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) NOT NULL,
  name TEXT NOT NULL,
  date_of_birth DATE,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create medical_records table
CREATE TABLE medical_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID REFERENCES patients(id) NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

-- Medications policies
CREATE POLICY "Patients can view their own medications" 
  ON medications FOR SELECT 
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view medications they prescribed" 
  ON medications FOR SELECT 
  USING (auth.uid() = doctor_id);

CREATE POLICY "Doctors can create medications" 
  ON medications FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );

CREATE POLICY "Patients can update medication status" 
  ON medications FOR UPDATE 
  USING (auth.uid() = patient_id)
  WITH CHECK (
    -- Only allow updating the 'taken' field
    (OLD.name = NEW.name) AND 
    (OLD.time = NEW.time) AND 
    (OLD.date = NEW.date) AND 
    (OLD.patient_id = NEW.patient_id) AND 
    (OLD.doctor_id = NEW.doctor_id)
  );

-- Appointments policies
CREATE POLICY "Patients can view their own appointments" 
  ON appointments FOR SELECT 
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view appointments assigned to them" 
  ON appointments FOR SELECT 
  USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can create appointments" 
  ON appointments FOR INSERT 
  WITH CHECK (
    auth.uid() = patient_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = doctor_id 
      AND profiles.role = 'doctor'
    )
  );

CREATE POLICY "Doctors can update appointment status" 
  ON appointments FOR UPDATE 
  USING (auth.uid() = doctor_id)
  WITH CHECK (
    -- Only allow updating the 'status' field
    (OLD.patient_id = NEW.patient_id) AND 
    (OLD.doctor_id = NEW.doctor_id) AND 
    (OLD.date = NEW.date) AND 
    (OLD.time = NEW.time) AND 
    (OLD.reason = NEW.reason)
  );

-- SOS Alerts policies
CREATE POLICY "Patients can view their own SOS alerts" 
  ON sos_alerts FOR SELECT 
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view SOS alerts assigned to them" 
  ON sos_alerts FOR SELECT 
  USING (auth.uid() = doctor_id);

CREATE POLICY "Patients can create SOS alerts" 
  ON sos_alerts FOR INSERT 
  WITH CHECK (auth.uid() = patient_id);

CREATE POLICY "Doctors can update SOS alert status" 
  ON sos_alerts FOR UPDATE 
  USING (auth.uid() = doctor_id)
  WITH CHECK (
    -- Only allow updating the 'status' field
    (OLD.patient_id = NEW.patient_id) AND 
    (OLD.doctor_id = NEW.doctor_id)
  );

-- Videos policies
CREATE POLICY "Anyone can view videos" 
  ON videos FOR SELECT 
  USING (true);

CREATE POLICY "Doctors can manage videos" 
  ON videos FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );

-- Patients table policies
CREATE POLICY "Doctors can view all patients" 
  ON patients FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );

CREATE POLICY "Patients can view their own patient record" 
  ON patients FOR SELECT 
  USING (profile_id = auth.uid());

CREATE POLICY "Doctors can create patient records" 
  ON patients FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );

-- Medical Records policies
CREATE POLICY "Doctors can view all medical records" 
  ON medical_records FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );

CREATE POLICY "Patients can view their own medical records" 
  ON medical_records FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM patients 
      WHERE patients.id = medical_records.patient_id 
      AND patients.profile_id = auth.uid()
    )
  );

CREATE POLICY "Doctors can create medical records" 
  ON medical_records FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );

-- Create function to generate patient ID
CREATE OR REPLACE FUNCTION generate_patient_id()
RETURNS TRIGGER AS $$
DECLARE
  chars TEXT := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate an 8-character random string
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  
  NEW.patient_id := result;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate patient ID for patients
CREATE TRIGGER set_patient_id
BEFORE INSERT ON profiles
FOR EACH ROW
WHEN (NEW.role = 'patient' AND NEW.patient_id IS NULL)
EXECUTE FUNCTION generate_patient_id();