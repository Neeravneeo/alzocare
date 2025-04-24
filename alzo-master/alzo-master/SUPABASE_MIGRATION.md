# Migrating from MongoDB to Supabase

This guide provides instructions for migrating the ALZO application from MongoDB to Supabase.

## Prerequisites

1. Create a Supabase account at [https://supabase.com](https://supabase.com)
2. Create a new Supabase project
3. Node.js and npm installed

## Migration Steps

### 1. Set Up Supabase Schema

1. Go to the SQL Editor in your Supabase dashboard
2. Copy the contents of `supabase/schema.sql` and execute it to create all necessary tables and policies

### 2. Configure Environment Variables

Create a `.env` file in the project root with the following variables:

```
# MongoDB (for migration only)
MONGO_URI=your_mongodb_connection_string

# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### 3. Install Required Packages

```bash
npm install @supabase/supabase-js dotenv
```

### 4. Run the Migration Script (Optional)

If you have existing data in MongoDB that you want to migrate to Supabase:

```bash
node supabase/migrate.js
```

This script will:
- Create users in Supabase Auth
- Create profiles in the profiles table
- Migrate medications, appointments, SOS alerts, and videos

### 5. Update Frontend Code

The frontend code has already been updated to use Supabase instead of the MongoDB backend. Make sure to:

1. Replace the placeholder Supabase credentials in all HTML files with your actual credentials:
   - `login.html`
   - `signup.html`
   - `role.html`
   - `doctor/patient-records.html`

### 6. Storage Setup

1. Go to the Storage section in your Supabase dashboard
2. Create two buckets:
   - `profile-images` (for patient profile pictures)
   - `medical-records` (for medical record images)
3. Set up appropriate bucket policies as defined in the schema.sql file

## Database Schema

### Profiles Table
Extends Supabase auth.users and stores user profile information.

| Column      | Type      | Description                                |
|-------------|-----------|--------------------------------------------|
| id          | UUID      | Primary key, references auth.users(id)     |
| name        | TEXT      | User's full name                           |
| email       | TEXT      | User's email address                       |
| role        | TEXT      | User role (patient, caregiver, doctor)     |
| patient_id  | TEXT      | Unique ID for patients                     |
| specialty   | TEXT      | Doctor's specialty                         |
| sos_number  | TEXT      | Emergency contact number                   |
| created_at  | TIMESTAMP | Record creation timestamp                  |

### Medications Table
Stores medication information prescribed by doctors to patients.

| Column      | Type      | Description                                |
|-------------|-----------|--------------------------------------------|
| id          | UUID      | Primary key                                |
| patient_id  | UUID      | References profiles(id)                    |
| doctor_id   | UUID      | References profiles(id)                    |
| name        | TEXT      | Medication name                            |
| time        | TEXT      | Time to take medication                    |
| date        | TIMESTAMP | Date prescribed                            |
| taken       | BOOLEAN   | Whether medication has been taken          |
| created_at  | TIMESTAMP | Record creation timestamp                  |

### Appointments Table
Stores appointment information between doctors and patients.

| Column      | Type      | Description                                |
|-------------|-----------|--------------------------------------------|
| id          | UUID      | Primary key                                |
| patient_id  | UUID      | References profiles(id)                    |
| doctor_id   | UUID      | References profiles(id)                    |
| date        | DATE      | Appointment date                           |
| time        | TEXT      | Appointment time                           |
| reason      | TEXT      | Reason for appointment                     |
| status      | TEXT      | Status (pending, approved, rejected)       |
| created_at  | TIMESTAMP | Record creation timestamp                  |

### SOS Alerts Table
Stores emergency alerts sent by patients to doctors.

| Column      | Type      | Description                                |
|-------------|-----------|--------------------------------------------|
| id          | UUID      | Primary key                                |
| patient_id  | UUID      | References profiles(id)                    |
| doctor_id   | UUID      | References profiles(id)                    |
| status      | TEXT      | Status (active, resolved)                  |
| created_at  | TIMESTAMP | Record creation timestamp                  |

### Videos Table
Stores educational videos for patients.

| Column      | Type      | Description                                |
|-------------|-----------|--------------------------------------------|
| id          | UUID      | Primary key                                |
| title       | TEXT      | Video title                                |
| url         | TEXT      | Video URL                                  |
| description | TEXT      | Video description                          |
| created_at  | TIMESTAMP | Record creation timestamp                  |

### Patients Table
Stores detailed patient information for medical records.

| Column        | Type      | Description                                |
|---------------|-----------|--------------------------------------------|
| id            | UUID      | Primary key                                |
| profile_id    | UUID      | References profiles(id)                    |
| name          | TEXT      | Patient's full name                        |
| date_of_birth | DATE      | Patient's date of birth                    |
| profile_image | TEXT      | URL to profile image                       |
| created_at    | TIMESTAMP | Record creation timestamp                  |

### Medical Records Table
Stores patient medical records.

| Column      | Type      | Description                                |
|-------------|-----------|--------------------------------------------|
| id          | UUID      | Primary key                                |
| patient_id  | UUID      | References patients(id)                    |
| title       | TEXT      | Record title                               |
| type        | TEXT      | Record type                                |
| date        | DATE      | Record date                                |
| notes       | TEXT      | Additional notes                           |
| image_url   | TEXT      | URL to record image                        |
| created_at  | TIMESTAMP | Record creation timestamp                  |

## Security

Supabase provides Row Level Security (RLS) policies to ensure that users can only access data they are authorized to see. The schema.sql file includes all necessary RLS policies for each table.

## Troubleshooting

- If you encounter authentication issues, check that your Supabase URL and anon key are correctly set in all HTML files.
- For migration issues, ensure your MongoDB connection string and Supabase service role key are correct in the .env file.
- Check the browser console for any JavaScript errors during authentication or data operations.
- Verify that all required tables and policies are set up correctly in Supabase.