# ALZO - Supabase Integration Setup

This document provides instructions on how to set up and configure Supabase for the ALZO web application.

## Prerequisites

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new Supabase project

## Configuration Steps

### 1. Get Your Supabase Credentials

After creating your Supabase project, you'll need to get your project URL and anon key:

1. Go to your Supabase project dashboard
2. Click on the "Settings" icon in the sidebar
3. Click on "API" in the settings menu
4. Copy the "URL" and "anon" key

### 2. Update Application Files

Replace the placeholder Supabase credentials in the following files with your actual credentials:

- `login.html` (lines 85-86)
- `signup.html` (lines 86-87)
- `role.html` (lines 72-73)
- `doctor/patient-records.html` (lines 219-220)

Example:
```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_KEY = 'your-anon-key';
```

### 3. Set Up Database Tables

You need to create the following tables in your Supabase database:

#### Profiles Table

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  email TEXT UNIQUE,
  role TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Patients Table

```sql
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  date_of_birth DATE,
  profile_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### Medical Records Table

```sql
CREATE TABLE medical_records (
  id SERIAL PRIMARY KEY,
  patient_id INTEGER REFERENCES patients(id),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  date DATE NOT NULL,
  notes TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 4. Set Up Row Level Security (RLS)

To secure your data, set up Row Level Security policies:

#### Profiles Table

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for users to view and update their own profile
CREATE POLICY "Users can view their own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);
```

#### Patients Table

```sql
-- Enable RLS
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Create policy for doctors to view all patients
CREATE POLICY "Doctors can view all patients" 
  ON patients FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );
```

#### Medical Records Table

```sql
-- Enable RLS
ALTER TABLE medical_records ENABLE ROW LEVEL SECURITY;

-- Create policy for doctors to view all medical records
CREATE POLICY "Doctors can view all medical records" 
  ON medical_records FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );
```

### 5. Set Up Storage

For storing patient profile images and medical record images:

1. Go to the "Storage" section in your Supabase dashboard
2. Create two buckets:
   - `profile-images` (for patient profile pictures)
   - `medical-records` (for medical record images)
3. Set up the following bucket policies:

#### Profile Images Bucket

```sql
-- Anyone can view profile images
CREATE POLICY "Public profiles are viewable by everyone" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'profile-images');

-- Only authenticated users can upload profile images
CREATE POLICY "Users can upload profile images" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'profile-images' 
    AND auth.role() = 'authenticated'
  );
```

#### Medical Records Bucket

```sql
-- Only doctors can view medical records
CREATE POLICY "Only doctors can view medical records" 
  ON storage.objects FOR SELECT 
  USING (
    bucket_id = 'medical-records' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );

-- Only doctors can upload medical records
CREATE POLICY "Only doctors can upload medical records" 
  ON storage.objects FOR INSERT 
  WITH CHECK (
    bucket_id = 'medical-records' 
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'doctor'
    )
  );
```

## Testing the Integration

1. Start by creating a new user account through the signup page
2. Select a role (doctor, patient, or caregiver)
3. If you selected the doctor role, you should be able to:
   - Search for patients
   - View patient medical records
   - Upload new medical records

## Troubleshooting

- Check browser console for any JavaScript errors
- Verify that your Supabase URL and anon key are correct
- Ensure that all required tables and policies are set up correctly
- Check Supabase logs for any authentication or database errors