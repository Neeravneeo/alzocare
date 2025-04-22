/**
 * Access Log Model
 * 
 * Tracks all access to patient medical records by doctors.
 * Used for audit trails and HIPAA compliance.
 */

const mongoose = require('mongoose');

const AccessLogSchema = new mongoose.Schema({
  doctorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  recordId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MedicalRecord',
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'view_records',     // Viewed list of patient records
      'view_thumbnail',   // Viewed record thumbnail
      'view_file',        // Viewed full-size record
      'download',         // Downloaded record
      'search_patient'    // Searched for patient
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  ipAddress: {
    type: String
  },
  userAgent: {
    type: String
  }
}, {
  timestamps: true
});

// Create compound indices for efficient querying
AccessLogSchema.index({ doctorId: 1, timestamp: -1 });
AccessLogSchema.index({ patientId: 1, timestamp: -1 });
AccessLogSchema.index({ recordId: 1, timestamp: -1 });

// Static method to get recent access logs for a patient
AccessLogSchema.statics.getRecentAccessForPatient = async function(patientId, limit = 10) {
  return this.find({ patientId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('doctorId', 'name')
    .lean();
};

// Static method to get recent access logs by a doctor
AccessLogSchema.statics.getRecentAccessByDoctor = async function(doctorId, limit = 10) {
  return this.find({ doctorId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('patientId', 'name')
    .populate('recordId', 'fileName documentType')
    .lean();
};

module.exports = mongoose.model('AccessLog', AccessLogSchema);