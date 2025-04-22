# ALZO Medical Records API Documentation

This document provides detailed information about the ALZO Medical Records API endpoints, request/response formats, and authentication requirements.

## Base URL

All API endpoints are relative to the base URL:

```
https://api.alzo.com/api
```

For local development:

```
http://localhost:5000/api
```

## Authentication

All API endpoints require authentication using JSON Web Tokens (JWT).

### Headers

Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Obtaining a Token

To obtain a token, use the login endpoint:

```
POST /auth/login
```

Request body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "60d21b4667d0d8992e610c85",
    "name": "John Doe",
    "email": "user@example.com",
    "role": "patient"
  }
}
```

## Patient Endpoints

### Upload Medical Record

```
POST /patient/medical-records
```

**Authentication Required**: Yes (Patient role)

**Request**:
- Content-Type: multipart/form-data
- Body:
  - file: Image file (JPG or PNG, max 10MB)
  - documentType: Type of document (lab_report, prescription, imaging, discharge, other)
  - documentDate: Date of the document (YYYY-MM-DD)
  - notes: Optional notes about the document

**Response**:
```json
{
  "message": "Medical record uploaded successfully",
  "record": {
    "id": "60d21b4667d0d8992e610c85",
    "fileName": "blood_test.jpg",
    "documentType": "lab_report",
    "documentDate": "2023-04-15T00:00:00.000Z",
    "uploadDate": "2023-04-16T10:30:00.000Z"
  }
}
```

### Get Patient Medical Records

```
GET /patient/medical-records
```

**Authentication Required**: Yes (Patient role)

**Response**:
```json
[
  {
    "_id": "60d21b4667d0d8992e610c85",
    "fileName": "blood_test.jpg",
    "documentType": "lab_report",
    "documentDate": "2023-04-15T00:00:00.000Z",
    "uploadDate": "2023-04-16T10:30:00.000Z",
    "notes": "Annual blood work results",
    "fileSize": 2516582,
    "thumbnailUrl": "/api/patient/medical-records/60d21b4667d0d8992e610c85/thumbnail",
    "fileUrl": "/api/patient/medical-records/60d21b4667d0d8992e610c85/file"
  },
  {
    "_id": "60d21b4667d0d8992e610c86",
    "fileName": "prescription.jpg",
    "documentType": "prescription",
    "documentDate": "2023-03-22T00:00:00.000Z",
    "uploadDate": "2023-03-22T15:45:00.000Z",
    "notes": "Prescription for sinus infection",
    "fileSize": 1887436,
    "thumbnailUrl": "/api/patient/medical-records/60d21b4667d0d8992e610c86/thumbnail",
    "fileUrl": "/api/patient/medical-records/60d21b4667d0d8992e610c86/file"
  }
]
```

### Get Medical Record Thumbnail

```
GET /patient/medical-records/:id/thumbnail
```

**Authentication Required**: Yes (Patient role)

**Parameters**:
- id: Medical record ID

**Response**:
- Content-Type: image/jpeg or image/png
- Body: Thumbnail image data

### Get Medical Record File

```
GET /patient/medical-records/:id/file
```

**Authentication Required**: Yes (Patient role)

**Parameters**:
- id: Medical record ID

**Response**:
- Content-Type: image/jpeg or image/png
- Body: Full-size image data

### Delete Medical Record

```
DELETE /patient/medical-records/:id
```

**Authentication Required**: Yes (Patient role)

**Parameters**:
- id: Medical record ID

**Response**:
```json
{
  "message": "Record deleted successfully"
}
```

## Doctor Endpoints

### Search Patients

```
GET /doctor/patients?type=<search_type>&query=<search_query>
```

**Authentication Required**: Yes (Doctor role)

**Query Parameters**:
- type: Search type (id, name, dob)
- query: Search query

**Response**:
```json
[
  {
    "_id": "P12345",
    "name": "John Smith",
    "dob": "1975-08-22T00:00:00.000Z",
    "gender": "Male",
    "email": "john.smith@example.com",
    "phone": "(555) 123-4567"
  },
  {
    "_id": "P23456",
    "name": "Sarah Johnson",
    "dob": "1982-04-15T00:00:00.000Z",
    "gender": "Female",
    "email": "sarah.j@example.com",
    "phone": "(555) 234-5678"
  }
]
```

### Get Patient Medical Records

```
GET /doctor/patients/:patientId/medical-records
```

**Authentication Required**: Yes (Doctor role)

**Parameters**:
- patientId: Patient ID

**Response**:
```json
[
  {
    "_id": "60d21b4667d0d8992e610c85",
    "fileName": "blood_test.jpg",
    "documentType": "lab_report",
    "documentDate": "2023-04-15T00:00:00.000Z",
    "uploadDate": "2023-04-16T10:30:00.000Z",
    "notes": "Annual blood work results",
    "fileSize": 2516582,
    "thumbnailUrl": "/api/doctor/medical-records/60d21b4667d0d8992e610c85/thumbnail",
    "fileUrl": "/api/doctor/medical-records/60d21b4667d0d8992e610c85/file"
  },
  {
    "_id": "60d21b4667d0d8992e610c86",
    "fileName": "prescription.jpg",
    "documentType": "prescription",
    "documentDate": "2023-03-22T00:00:00.000Z",
    "uploadDate": "2023-03-22T15:45:00.000Z",
    "notes": "Prescription for sinus infection",
    "fileSize": 1887436,
    "thumbnailUrl": "/api/doctor/medical-records/60d21b4667d0d8992e610c86/thumbnail",
    "fileUrl": "/api/doctor/medical-records/60d21b4667d0d8992e610c86/file"
  }
]
```

### Get Medical Record Thumbnail (Doctor Access)

```
GET /doctor/medical-records/:id/thumbnail
```

**Authentication Required**: Yes (Doctor role)

**Parameters**:
- id: Medical record ID

**Response**:
- Content-Type: image/jpeg or image/png
- Body: Thumbnail image data

### Get Medical Record File (Doctor Access)

```
GET /doctor/medical-records/:id/file
```

**Authentication Required**: Yes (Doctor role)

**Parameters**:
- id: Medical record ID

**Response**:
- Content-Type: image/jpeg or image/png
- Body: Full-size image data

### Log Record Access

```
POST /doctor/access-logs
```

**Authentication Required**: Yes (Doctor role)

**Request**:
```json
{
  "patientId": "60d21b4667d0d8992e610c85",
  "recordId": "60d21b4667d0d8992e610c86",
  "action": "view_file",
  "timestamp": "2023-04-16T10:30:00.000Z"
}
```

**Response**:
```json
{
  "message": "Access logged successfully"
}
```

## Error Responses

### Authentication Error

```json
{
  "message": "Authentication required"
}
```

### Authorization Error

```json
{
  "message": "Access denied. You do not have permission to access this resource."
}
```

### Resource Not Found

```json
{
  "message": "Record not found"
}
```

### Validation Error

```json
{
  "message": "Missing required fields"
}
```

### File Size Error

```json
{
  "message": "File too large. Maximum size is 10MB."
}
```

### Server Error

```json
{
  "message": "Server error"
}
```

## Rate Limiting

API requests are rate-limited to prevent abuse. The current limits are:

- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

If you exceed these limits, you will receive a 429 Too Many Requests response.

## HIPAA Compliance

This API is designed to be HIPAA compliant. All data is encrypted in transit using HTTPS and at rest using AES-256 encryption. Access to patient data is strictly controlled and all access is logged for audit purposes.

## Support

For API support, please contact:

- Email: api-support@alzo.com
- Phone: (555) 123-4567