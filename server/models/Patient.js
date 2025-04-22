/**
 * Patient Model
 * 
 * Extends the User model with patient-specific fields.
 */

const mongoose = require('mongoose');
const User = require('./User');

const PatientSchema = new mongoose.Schema({
  dob: {
    type: Date,
    required: [true, 'Date of birth is required']
  },
  gender: {
    type: String,
    enum: ['Male', 'Female', 'Other', 'Prefer not to say'],
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  insurance: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    expirationDate: Date
  },
  medicalHistory: {
    allergies: [String],
    chronicConditions: [String],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      startDate: Date,
      endDate: Date
    }],
    surgeries: [{
      procedure: String,
      date: Date,
      notes: String
    }]
  },
  doctors: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  consentForms: [{
    formType: String,
    signedDate: Date,
    expirationDate: Date,
    documentPath: String
  }]
}, {
  timestamps: true
});

// Create a compound index for efficient patient searches
PatientSchema.index({ 'name': 'text', 'email': 'text' });
PatientSchema.index({ dob: 1 });

// Virtual for age calculation
PatientSchema.virtual('age').get(function() {
  if (!this.dob) return null;
  
  const today = new Date();
  const birthDate = new Date(this.dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Method to check if a doctor has access to this patient
PatientSchema.methods.isDoctorAuthorized = function(doctorId) {
  return this.doctors.includes(doctorId);
};

// Method to add a doctor to this patient
PatientSchema.methods.addDoctor = async function(doctorId) {
  if (!this.doctors.includes(doctorId)) {
    this.doctors.push(doctorId);
    await this.save();
    return true;
  }
  return false;
};

// Method to remove a doctor from this patient
PatientSchema.methods.removeDoctor = async function(doctorId) {
  if (this.doctors.includes(doctorId)) {
    this.doctors = this.doctors.filter(id => id.toString() !== doctorId.toString());
    await this.save();
    return true;
  }
  return false;
};

// Create the Patient model as a discriminator of User
const Patient = User.discriminator('Patient', PatientSchema);

module.exports = Patient;