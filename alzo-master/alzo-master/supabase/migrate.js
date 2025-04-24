/**
 * MongoDB to Supabase Migration Script
 * 
 * This script migrates data from MongoDB to Supabase.
 * 
 * Prerequisites:
 * 1. Install required packages: npm install @supabase/supabase-js dotenv mongoose
 * 2. Set up environment variables in .env file:
 *    - MONGO_URI: MongoDB connection string
 *    - SUPABASE_URL: Supabase project URL
 *    - SUPABASE_KEY: Supabase service role key (not anon key)
 * 
 * Usage: node migrate.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const { createClient } = require('@supabase/supabase-js');

// MongoDB models
const User = require('../backend/models/User');
const Medication = require('../backend/models/Medication');
const Appointment = require('../backend/models/Appointment');
const SosAlert = require('../backend/models/SosAlert');
const Video = require('../backend/models/Video');

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Map to store MongoDB ObjectId to Supabase UUID mapping
const userIdMap = new Map();

async function migrateUsers() {
  console.log('Migrating users...');
  
  try {
    const users = await User.find({});
    console.log(`Found ${users.length} users to migrate`);
    
    for (const user of users) {
      // Create user in Supabase Auth
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password, // Note: This assumes passwords are stored in plain text in MongoDB
        email_confirm: true,
        user_metadata: {
          full_name: user.name
        }
      });
      
      if (authError) {
        console.error(`Error creating auth user for ${user.email}:`, authError);
        continue;
      }
      
      // Store the mapping between MongoDB ObjectId and Supabase UUID
      userIdMap.set(user._id.toString(), authUser.user.id);
      
      // Create profile in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: authUser.user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          patient_id: user.patientId,
          specialty: user.specialty
        });
      
      if (profileError) {
        console.error(`Error creating profile for ${user.email}:`, profileError);
        continue;
      }
      
      console.log(`Migrated user: ${user.email}`);
    }
    
    console.log('User migration completed');
  } catch (error) {
    console.error('Error migrating users:', error);
  }
}

async function migrateMedications() {
  console.log('Migrating medications...');
  
  try {
    const medications = await Medication.find({});
    console.log(`Found ${medications.length} medications to migrate`);
    
    for (const medication of medications) {
      const patientId = userIdMap.get(medication.patientId.toString());
      const doctorId = userIdMap.get(medication.doctorId.toString());
      
      if (!patientId || !doctorId) {
        console.error(`Missing user mapping for medication: ${medication._id}`);
        continue;
      }
      
      const { error } = await supabase
        .from('medications')
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          name: medication.name,
          time: medication.time,
          date: medication.date,
          taken: medication.taken
        });
      
      if (error) {
        console.error(`Error migrating medication ${medication._id}:`, error);
        continue;
      }
      
      console.log(`Migrated medication: ${medication._id}`);
    }
    
    console.log('Medication migration completed');
  } catch (error) {
    console.error('Error migrating medications:', error);
  }
}

async function migrateAppointments() {
  console.log('Migrating appointments...');
  
  try {
    const appointments = await Appointment.find({});
    console.log(`Found ${appointments.length} appointments to migrate`);
    
    for (const appointment of appointments) {
      const patientId = userIdMap.get(appointment.patientId.toString());
      const doctorId = userIdMap.get(appointment.doctorId.toString());
      
      if (!patientId || !doctorId) {
        console.error(`Missing user mapping for appointment: ${appointment._id}`);
        continue;
      }
      
      const { error } = await supabase
        .from('appointments')
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          date: appointment.date,
          time: appointment.time,
          reason: appointment.reason,
          status: appointment.status,
          created_at: appointment.createdAt
        });
      
      if (error) {
        console.error(`Error migrating appointment ${appointment._id}:`, error);
        continue;
      }
      
      console.log(`Migrated appointment: ${appointment._id}`);
    }
    
    console.log('Appointment migration completed');
  } catch (error) {
    console.error('Error migrating appointments:', error);
  }
}

async function migrateSosAlerts() {
  console.log('Migrating SOS alerts...');
  
  try {
    const alerts = await SosAlert.find({});
    console.log(`Found ${alerts.length} SOS alerts to migrate`);
    
    for (const alert of alerts) {
      const patientId = userIdMap.get(alert.patientId.toString());
      const doctorId = userIdMap.get(alert.doctorId.toString());
      
      if (!patientId || !doctorId) {
        console.error(`Missing user mapping for SOS alert: ${alert._id}`);
        continue;
      }
      
      const { error } = await supabase
        .from('sos_alerts')
        .insert({
          patient_id: patientId,
          doctor_id: doctorId,
          status: alert.status,
          created_at: alert.createdAt
        });
      
      if (error) {
        console.error(`Error migrating SOS alert ${alert._id}:`, error);
        continue;
      }
      
      console.log(`Migrated SOS alert: ${alert._id}`);
    }
    
    console.log('SOS alert migration completed');
  } catch (error) {
    console.error('Error migrating SOS alerts:', error);
  }
}

async function migrateVideos() {
  console.log('Migrating videos...');
  
  try {
    const videos = await Video.find({});
    console.log(`Found ${videos.length} videos to migrate`);
    
    for (const video of videos) {
      const { error } = await supabase
        .from('videos')
        .insert({
          title: video.title,
          url: video.url,
          description: video.description,
          created_at: video.createdAt
        });
      
      if (error) {
        console.error(`Error migrating video ${video._id}:`, error);
        continue;
      }
      
      console.log(`Migrated video: ${video._id}`);
    }
    
    console.log('Video migration completed');
  } catch (error) {
    console.error('Error migrating videos:', error);
  }
}

async function migrateData() {
  try {
    console.log('Starting migration from MongoDB to Supabase...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
    
    // Migrate data in sequence
    await migrateUsers();
    await migrateMedications();
    await migrateAppointments();
    await migrateSosAlerts();
    await migrateVideos();
    
    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    // Close MongoDB connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
migrateData();