# ALZO - Alzheimer's Care Platform

ALZO is a web application designed to help manage Alzheimer's care through technology and support. The platform connects patients, caregivers, and doctors to provide comprehensive care management.

## Features

- User authentication with role-based access (patient, caregiver, doctor)
- Patient medical records management
- Appointment scheduling
- Medication tracking
- SOS alerts for emergency situations
- Educational videos

## Technology Stack

- Frontend: HTML, CSS (Tailwind CSS), JavaScript
- Backend: Supabase (Authentication, Database, Storage)

## Getting Started

### Prerequisites

- [Supabase](https://supabase.com) account
- Node.js and npm (for migration script, if needed)

### Setup Instructions

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/alzo.git
cd alzo
```

2. **Set up Supabase**

- Create a new Supabase project
- Execute the SQL in `supabase/schema.sql` to create all necessary tables and policies
- Set up storage buckets for profile images and medical records

3. **Configure environment variables**

- Copy `.env.example` to `.env`
- Update the Supabase URL and keys in the `.env` file

4. **Update Supabase credentials in HTML files**

Replace the placeholder Supabase credentials in the following files:
- `login.html`
- `signup.html`
- `role.html`
- `doctor/patient-records.html`

Example:
```javascript
const SUPABASE_URL = 'https://your-project-id.supabase.co';
const SUPABASE_KEY = 'your-supabase-anon-key';
```

5. **Migrate data (optional)**

If you have existing data in MongoDB that you want to migrate to Supabase:

```bash
npm install @supabase/supabase-js dotenv mongoose
node supabase/migrate.js
```

6. **Run the application**

You can use any web server to serve the HTML files. For development, you can use the Live Server extension in VS Code or a simple HTTP server:

```bash
npx http-server
```

## Documentation

- [User Guide](USER_GUIDE.md) - Instructions for patients and doctors on how to use the ALZO Medical Records feature
- [Supabase Migration](SUPABASE_MIGRATION.md) - Guide for migrating from MongoDB to Supabase
- [Supabase Setup](SUPABASE_SETUP.md) - Detailed instructions for setting up Supabase

## Database Schema

The application uses the following main tables in Supabase:

- **profiles** - User profile information
- **medications** - Medication tracking
- **appointments** - Doctor appointments
- **sos_alerts** - Emergency alerts
- **videos** - Educational videos
- **patients** - Detailed patient information
- **medical_records** - Patient medical documents

For a complete schema description, see [SUPABASE_MIGRATION.md](SUPABASE_MIGRATION.md).

## Security

- Authentication is handled by Supabase Auth
- Row Level Security (RLS) policies ensure users can only access data they are authorized to see
- All sensitive data is encrypted at rest and in transit

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- [Tailwind CSS](https://tailwindcss.com/)
- [Supabase](https://supabase.com/)
- [Remix Icon](https://remixicon.com/)