/**
 * Medical Record Model
 * 
 * Stores metadata about uploaded medical record files.
 * The actual files are stored on the filesystem with encryption.
 */

const mongoose = require('mongoose');

const MedicalRecordSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  fileName: {
    type: String,
    required: true
  },
  fileType: {
    type: String,
    required: true,
    enum: ['image/jpeg', 'image/png']
  },
  fileSize: {
    type: Number,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  thumbnailPath: {
    type: String,
    required: true
  },
  documentType: {
    type: String,
    required: true,
    enum: ['lab_report', 'prescription', 'imaging', 'discharge', 'other'],
    index: true
  },
  documentDate: {
    type: Date,
    required: true,
    index: true
  },
  uploadDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Create compound index for efficient queries
MedicalRecordSchema.index({ patientId: 1, documentType: 1, documentDate: -1 });

// Virtual for creating public URLs (not stored in DB)
MedicalRecordSchema.virtual('thumbnailUrl').get(function() {
  return `/api/patient/medical-records/${this._id}/thumbnail`;
});

MedicalRecordSchema.virtual('fileUrl').get(function() {
  return `/api/patient/medical-records/${this._id}/file`;
});

// Add method to check if a doctor has access to this record
MedicalRecordSchema.methods.isAccessibleByDoctor = async function(doctorId) {
  const Patient = mongoose.model('Patient');
  const patient = await Patient.findById(this.patientId);
  
  if (!patient) {
    return false;
  }
  
  return patient.doctors.includes(doctorId);
};

module.exports = mongoose.model('MedicalRecord', MedicalRecordSchema);