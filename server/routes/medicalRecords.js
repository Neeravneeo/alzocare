/**
 * Medical Records API Routes
 * 
 * Handles all endpoints related to patient medical records upload, retrieval, and management.
 * Implements HIPAA-compliant security measures for handling sensitive medical data.
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const AccessLog = require('../models/AccessLog');

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    // Create patient-specific directory if it doesn't exist
    const patientDir = path.join(__dirname, '../uploads/medical-records', req.user.id);
    if (!fs.existsSync(patientDir)) {
      fs.mkdirSync(patientDir, { recursive: true });
    }
    cb(null, patientDir);
  },
  filename: function(req, file, cb) {
    // Generate unique filename with timestamp and random string
    const uniqueSuffix = Date.now() + '-' + crypto.randomBytes(8).toString('hex');
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

// File filter to only allow image files
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG and PNG images are allowed.'), false);
  }
};

// Configure upload middleware
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB max file size
  },
  fileFilter: fileFilter
});

/**
 * @route   POST /api/patient/medical-records
 * @desc    Upload a new medical record
 * @access  Private (Patient only)
 */
router.post('/patient/medical-records', 
  authenticateToken, 
  authorizeRole('patient'), 
  upload.single('file'), 
  async (req, res) => {
    try {
      const { documentType, documentDate, notes } = req.body;
      
      if (!req.file || !documentType || !documentDate) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      
      // Generate thumbnail
      const thumbnailPath = await generateThumbnail(req.file.path);
      
      // Encrypt the file
      const encryptedFilePath = await encryptFile(req.file.path);
      
      // Create record in database
      const newRecord = new MedicalRecord({
        patientId: req.user.id,
        fileName: req.file.originalname,
        fileType: req.file.mimetype,
        fileSize: req.file.size,
        filePath: encryptedFilePath,
        thumbnailPath: thumbnailPath,
        documentType,
        documentDate,
        notes,
        uploadDate: new Date()
      });
      
      await newRecord.save();
      
      res.status(201).json({
        message: 'Medical record uploaded successfully',
        record: {
          id: newRecord._id,
          fileName: newRecord.fileName,
          documentType: newRecord.documentType,
          documentDate: newRecord.documentDate,
          uploadDate: newRecord.uploadDate
        }
      });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ message: 'Server error during upload' });
    }
  }
);

/**
 * @route   GET /api/patient/medical-records
 * @desc    Get all medical records for the authenticated patient
 * @access  Private (Patient only)
 */
router.get('/patient/medical-records', 
  authenticateToken, 
  authorizeRole('patient'), 
  async (req, res) => {
    try {
      const records = await MedicalRecord.find({ patientId: req.user.id })
        .sort({ documentDate: -1 })
        .select('-filePath -__v');
      
      // Transform records to include URLs
      const recordsWithUrls = records.map(record => ({
        ...record.toObject(),
        thumbnailUrl: `/api/patient/medical-records/${record._id}/thumbnail`,
        fileUrl: `/api/patient/medical-records/${record._id}/file`
      }));
      
      res.json(recordsWithUrls);
    } catch (error) {
      console.error('Fetch records error:', error);
      res.status(500).json({ message: 'Server error while fetching records' });
    }
  }
);

/**
 * @route   GET /api/patient/medical-records/:id/thumbnail
 * @desc    Get thumbnail for a specific medical record
 * @access  Private (Patient only)
 */
router.get('/patient/medical-records/:id/thumbnail', 
  authenticateToken, 
  authorizeRole('patient'), 
  async (req, res) => {
    try {
      const record = await MedicalRecord.findOne({ 
        _id: req.params.id,
        patientId: req.user.id
      });
      
      if (!record) {
        return res.status(404).json({ message: 'Record not found' });
      }
      
      res.sendFile(record.thumbnailPath);
    } catch (error) {
      console.error('Thumbnail fetch error:', error);
      res.status(500).json({ message: 'Server error while fetching thumbnail' });
    }
  }
);

/**
 * @route   GET /api/patient/medical-records/:id/file
 * @desc    Get the full image file for a specific medical record
 * @access  Private (Patient only)
 */
router.get('/patient/medical-records/:id/file', 
  authenticateToken, 
  authorizeRole('patient'), 
  async (req, res) => {
    try {
      const record = await MedicalRecord.findOne({ 
        _id: req.params.id,
        patientId: req.user.id
      });
      
      if (!record) {
        return res.status(404).json({ message: 'Record not found' });
      }
      
      // Decrypt file before sending
      const decryptedPath = await decryptFile(record.filePath);
      
      res.sendFile(decryptedPath);
      
      // Clean up decrypted file after sending
      setTimeout(() => {
        fs.unlinkSync(decryptedPath);
      }, 5000);
    } catch (error) {
      console.error('File fetch error:', error);
      res.status(500).json({ message: 'Server error while fetching file' });
    }
  }
);

/**
 * @route   DELETE /api/patient/medical-records/:id
 * @desc    Delete a specific medical record
 * @access  Private (Patient only)
 */
router.delete('/patient/medical-records/:id', 
  authenticateToken, 
  authorizeRole('patient'), 
  async (req, res) => {
    try {
      const record = await MedicalRecord.findOne({ 
        _id: req.params.id,
        patientId: req.user.id
      });
      
      if (!record) {
        return res.status(404).json({ message: 'Record not found' });
      }
      
      // Delete files
      if (fs.existsSync(record.filePath)) {
        fs.unlinkSync(record.filePath);
      }
      
      if (fs.existsSync(record.thumbnailPath)) {
        fs.unlinkSync(record.thumbnailPath);
      }
      
      // Delete record from database
      await MedicalRecord.deleteOne({ _id: req.params.id });
      
      res.json({ message: 'Record deleted successfully' });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(500).json({ message: 'Server error while deleting record' });
    }
  }
);

/**
 * @route   GET /api/doctor/patients
 * @desc    Search for patients
 * @access  Private (Doctor only)
 */
router.get('/doctor/patients', 
  authenticateToken, 
  authorizeRole('doctor'), 
  async (req, res) => {
    try {
      const { type, query } = req.query;
      
      if (!type || !query) {
        return res.status(400).json({ message: 'Search type and query are required' });
      }
      
      let searchQuery = {};
      
      switch (type) {
        case 'id':
          searchQuery = { _id: query };
          break;
        case 'name':
          searchQuery = { name: { $regex: query, $options: 'i' } };
          break;
        case 'dob':
          searchQuery = { dob: new Date(query) };
          break;
        default:
          return res.status(400).json({ message: 'Invalid search type' });
      }
      
      const patients = await Patient.find(searchQuery)
        .select('_id name dob gender email phone')
        .limit(10);
      
      res.json(patients);
    } catch (error) {
      console.error('Patient search error:', error);
      res.status(500).json({ message: 'Server error during patient search' });
    }
  }
);

/**
 * @route   GET /api/doctor/patients/:patientId/medical-records
 * @desc    Get all medical records for a specific patient
 * @access  Private (Doctor only)
 */
router.get('/doctor/patients/:patientId/medical-records', 
  authenticateToken, 
  authorizeRole('doctor'), 
  async (req, res) => {
    try {
      const { patientId } = req.params;
      
      // Log access
      const accessLog = new AccessLog({
        doctorId: req.user.id,
        patientId,
        action: 'view_records',
        timestamp: new Date()
      });
      await accessLog.save();
      
      const records = await MedicalRecord.find({ patientId })
        .sort({ documentDate: -1 })
        .select('-filePath -__v');
      
      // Transform records to include URLs
      const recordsWithUrls = records.map(record => ({
        ...record.toObject(),
        thumbnailUrl: `/api/doctor/medical-records/${record._id}/thumbnail`,
        fileUrl: `/api/doctor/medical-records/${record._id}/file`
      }));
      
      res.json(recordsWithUrls);
    } catch (error) {
      console.error('Fetch patient records error:', error);
      res.status(500).json({ message: 'Server error while fetching patient records' });
    }
  }
);

/**
 * @route   GET /api/doctor/medical-records/:id/thumbnail
 * @desc    Get thumbnail for a specific medical record (doctor access)
 * @access  Private (Doctor only)
 */
router.get('/doctor/medical-records/:id/thumbnail', 
  authenticateToken, 
  authorizeRole('doctor'), 
  async (req, res) => {
    try {
      const record = await MedicalRecord.findById(req.params.id);
      
      if (!record) {
        return res.status(404).json({ message: 'Record not found' });
      }
      
      // Log access
      const accessLog = new AccessLog({
        doctorId: req.user.id,
        patientId: record.patientId,
        recordId: record._id,
        action: 'view_thumbnail',
        timestamp: new Date()
      });
      await accessLog.save();
      
      res.sendFile(record.thumbnailPath);
    } catch (error) {
      console.error('Thumbnail fetch error:', error);
      res.status(500).json({ message: 'Server error while fetching thumbnail' });
    }
  }
);

/**
 * @route   GET /api/doctor/medical-records/:id/file
 * @desc    Get the full image file for a specific medical record (doctor access)
 * @access  Private (Doctor only)
 */
router.get('/doctor/medical-records/:id/file', 
  authenticateToken, 
  authorizeRole('doctor'), 
  async (req, res) => {
    try {
      const record = await MedicalRecord.findById(req.params.id);
      
      if (!record) {
        return res.status(404).json({ message: 'Record not found' });
      }
      
      // Log access
      const accessLog = new AccessLog({
        doctorId: req.user.id,
        patientId: record.patientId,
        recordId: record._id,
        action: 'view_file',
        timestamp: new Date()
      });
      await accessLog.save();
      
      // Decrypt file before sending
      const decryptedPath = await decryptFile(record.filePath);
      
      res.sendFile(decryptedPath);
      
      // Clean up decrypted file after sending
      setTimeout(() => {
        fs.unlinkSync(decryptedPath);
      }, 5000);
    } catch (error) {
      console.error('File fetch error:', error);
      res.status(500).json({ message: 'Server error while fetching file' });
    }
  }
);

/**
 * @route   POST /api/doctor/access-logs
 * @desc    Log access to patient records
 * @access  Private (Doctor only)
 */
router.post('/doctor/access-logs', 
  authenticateToken, 
  authorizeRole('doctor'), 
  async (req, res) => {
    try {
      const { patientId, recordId, action, timestamp } = req.body;
      
      if (!patientId || !action) {
        return res.status(400).json({ message: 'Patient ID and action are required' });
      }
      
      const accessLog = new AccessLog({
        doctorId: req.user.id,
        patientId,
        recordId: recordId || null,
        action,
        timestamp: timestamp || new Date()
      });
      
      await accessLog.save();
      
      res.status(201).json({ message: 'Access logged successfully' });
    } catch (error) {
      console.error('Access log error:', error);
      res.status(500).json({ message: 'Server error while logging access' });
    }
  }
);

/**
 * Generate a thumbnail from the original image
 * @param {string} filePath - Path to the original file
 * @returns {string} - Path to the generated thumbnail
 */
async function generateThumbnail(filePath) {
  try {
    const sharp = require('sharp');
    const thumbnailPath = filePath.replace(/\.\w+$/, '-thumb$&');
    
    await sharp(filePath)
      .resize(150, 150, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .toFile(thumbnailPath);
    
    return thumbnailPath;
  } catch (error) {
    console.error('Thumbnail generation error:', error);
    // Return original file path if thumbnail generation fails
    return filePath;
  }
}

/**
 * Encrypt a file using AES-256-CBC
 * @param {string} filePath - Path to the file to encrypt
 * @returns {string} - Path to the encrypted file
 */
async function encryptFile(filePath) {
  try {
    const encryptedPath = filePath + '.enc';
    
    // Get encryption key from environment variable or use a default for development
    const encryptionKey = process.env.FILE_ENCRYPTION_KEY || 'a_very_secret_key_that_is_32_bytes';
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    const input = fs.createReadStream(filePath);
    const output = fs.createWriteStream(encryptedPath);
    
    // Write the IV at the beginning of the encrypted file
    output.write(iv);
    
    input.pipe(cipher).pipe(output);
    
    return new Promise((resolve, reject) => {
      output.on('finish', () => {
        // Delete the original file after encryption
        fs.unlinkSync(filePath);
        resolve(encryptedPath);
      });
      
      output.on('error', reject);
    });
  } catch (error) {
    console.error('File encryption error:', error);
    // Return original file path if encryption fails
    return filePath;
  }
}

/**
 * Decrypt a file encrypted with AES-256-CBC
 * @param {string} encryptedPath - Path to the encrypted file
 * @returns {string} - Path to the decrypted file
 */
async function decryptFile(encryptedPath) {
  try {
    const decryptedPath = encryptedPath.replace('.enc', '.dec');
    
    // Get encryption key from environment variable or use a default for development
    const encryptionKey = process.env.FILE_ENCRYPTION_KEY || 'a_very_secret_key_that_is_32_bytes';
    
    // Read the encrypted file
    const data = fs.readFileSync(encryptedPath);
    
    // Extract the IV from the beginning of the file
    const iv = data.slice(0, 16);
    const encryptedData = data.slice(16);
    
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryptionKey), iv);
    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    
    fs.writeFileSync(decryptedPath, decrypted);
    
    return decryptedPath;
  } catch (error) {
    console.error('File decryption error:', error);
    throw new Error('Failed to decrypt file');
  }
}

module.exports = router;