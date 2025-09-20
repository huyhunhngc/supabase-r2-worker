# AIO Scanner Storage

A secure, cost-effective file storage system built with Cloudflare Workers, Cloudflare R2, and Supabase. This Worker provides a complete alternative to Supabase Storage by leveraging R2's free egress and low storage costs while maintaining full user authentication and metadata management through Supabase.

## Features

- **JWT Authentication**: Secure file access using Supabase JWT tokens
- **Signed URLs**: Pre-signed URLs for secure file uploads and downloads
- **Metadata Storage**: File metadata stored in Supabase PostgreSQL with Row Level Security (RLS)
- **CORS Support**: Full CORS support for web applications
- **Cost Effective**: Leverage R2's free egress and low storage costs
- **Secure**: End-to-end encryption and access control

## Architecture

- **Cloudflare Worker**: Handles authentication, generates signed URLs, and manages API endpoints
- **Cloudflare R2**: Stores actual file data with S3-compatible API
- **Supabase**: Manages user authentication and file metadata storage
- **PostgreSQL**: Stores file metadata with RLS policies for security

## API Endpoints

### POST `/upload`

Generate a signed URL for file upload.

**Headers:**
- `Authorization: Bearer <jwt_token>`
- `Content-Type: multipart/form-data`

**Body (Form Data):**
- `file_name` (required): Name of the file
- `mime_type` (optional): MIME type of the file
- `file_size` (optional): Size of the file in bytes

**Response:**
```json
{
  "success": true,
  "file_id": "uuid",
  "upload_url": "https://signed-upload-url",
  "file_path": "uploads/user-id/date/file-path"
}
```

### GET `/download?file_id=<file_id>`

Generate a signed URL for file download.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Query Parameters:**
- `file_id` (required): ID of the file to download

**Response:**
```json
{
  "success": true,
  "download_url": "https://signed-download-url",
  "file_metadata": {
    "id": "uuid",
    "user_id": "uuid",
    "file_path": "uploads/user-id/date/file-path",
    "file_name": "example.pdf",
    "mime_type": "application/pdf",
    "file_size": 1024,
    "created_at": "2025-01-01T00:00:00Z"
  }
}
```

### GET `/files`

List user's files with pagination.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Query Parameters:**
- `limit` (optional): Number of files to return (default: 50, max: 100)
- `offset` (optional): Number of files to skip (default: 0)

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "file_path": "uploads/user-id/date/file-path",
      "file_name": "example.pdf",
      "mime_type": "application/pdf",
      "file_size": 1024,
      "created_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 10,
  "limit": 50,
  "offset": 0
}
```

### DELETE `/files/<file_id>`

Delete a file and its metadata.

**Headers:**
- `Authorization: Bearer <jwt_token>`

**Response:**
```json
{
  "success": true,
  "message": "File deleted successfully"
}
```

## Setup

### Prerequisites

1. **Cloudflare Account** with R2 enabled
2. **Supabase Project** with authentication configured
3. **Node.js** 18+ and npm

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd aio-scanner-storage
npm install
```

### 2. Configure R2 Bucket

1. Create an R2 bucket in your Cloudflare dashboard
2. Note your Account ID, Access Key, and Secret Key
3. Update the bucket name in `wrangler.jsonc`

### 3. Setup Supabase Database

Create the files table in your Supabase database:

```sql
-- Create files table
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own files" ON files
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own files" ON files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own files" ON files
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own files" ON files
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_created_at ON files(created_at DESC);
```

### 4. Configure Environment Variables

Update `wrangler.jsonc` with your configuration:

```jsonc
{
  "vars": {
    "SUPABASE_URL": "your-supabase-url",
    "R2_ACCOUNT_ID": "your-r2-account-id",
    "R2_ACCESS_KEY_ID": "your-r2-access-key",
    "R2_SECRET_ACCESS_KEY": "your-r2-secret-key",
    "R2_REGION": "auto"
  }
}
```

### 5. Set Secrets

Set sensitive data using Wrangler secrets:

```bash
# Set Supabase JWT secret
wrangler secret put SUPABASE_JWT_SECRET

# Optionally move sensitive vars to secrets
wrangler secret put SUPABASE_URL
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

### 6. Deploy

```bash
# Deploy to Cloudflare Workers
npm run deploy

# Or run locally for development
npm run dev
```

## Development

### Local Development

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Generate TypeScript types
npm run cf-typegen
```

### Testing

The project includes comprehensive tests covering:
- JWT authentication
- CORS handling
- File upload/download flows
- Error handling
- API endpoints

Run tests with:
```bash
npm run test
```

## Security

### Authentication

- All endpoints require valid Supabase JWT tokens
- JWTs are verified using the Supabase JWT secret
- User ID is extracted from JWT for authorization

### File Access

- Files are organized by user ID in R2
- Supabase RLS policies ensure users can only access their own files
- Signed URLs have expiration times (2 hours for upload, 24 hours for download)

### Data Protection

- All file metadata is stored in Supabase with RLS enabled
- File paths include user ID to prevent unauthorized access
- HTTPS enforced for all API communications

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Your Supabase project URL | Yes |
| `SUPABASE_JWT_SECRET` | Supabase JWT secret | Yes |
| `R2_ACCOUNT_ID` | Cloudflare R2 Account ID | Yes |
| `R2_ACCESS_KEY_ID` | R2 Access Key | Yes |
| `R2_SECRET_ACCESS_KEY` | R2 Secret Key | Yes |
| `R2_REGION` | R2 Region (usually "auto") | Yes |

### R2 Bucket Configuration

- **Bucket Name**: `aio-scanner-files` (configurable in `wrangler.jsonc`)
- **Access**: Private bucket with signed URLs for access
- **CORS**: Configured to allow uploads from your domain

## File Upload Flow

1. Client requests upload URL with file metadata
2. Worker validates JWT and creates file record in Supabase
3. Worker generates signed upload URL for R2
4. Client uploads file directly to R2 using signed URL
5. File is accessible via download endpoint

## File Download Flow

1. Client requests download URL with file ID
2. Worker validates JWT and checks file ownership
3. Worker generates signed download URL for R2
4. Client downloads file directly from R2

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check JWT token validity and Supabase configuration
2. **403 Forbidden**: Verify RLS policies and user permissions
3. **500 Server Error**: Check R2 credentials and Supabase connection
4. **CORS Errors**: Ensure CORS headers are properly configured

### Debugging

Enable debug logging by adding console.log statements in the Worker code. Logs are available in the Cloudflare Workers dashboard.

## Cost Optimization

### Cloudflare R2

- **Storage**: $0.015/GB/month
- **Class A Operations**: $4.50/million (uploads)
- **Class B Operations**: $0.36/million (downloads)
- **Egress**: Free

### Compared to Supabase Storage

R2 provides significant cost savings, especially for egress-heavy workloads:
- No egress charges vs. Supabase's $0.09/GB
- Lower storage costs
- Pay-per-use model

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review Cloudflare Workers documentation
3. Check Supabase documentation
4. Open an issue in the repository