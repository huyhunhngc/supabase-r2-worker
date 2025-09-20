**Project Overview
This project is a file storage system using Cloudflare Worker, Cloudflare R2 for file storage, and Supabase for user authentication and metadata storage. The Worker authenticates users via Supabase JWT, generates signed URLs for uploading/downloading files to/from R2, and stores file metadata in a Supabase PostgreSQL database. The goal is to provide a secure, cost-effective alternative to Supabase Storage by leveraging R2's free egress and low storage costs.
**Folder Structure
/src: Contains the Cloudflare Worker source code.
index.ts: Main Worker script handling /upload and /download endpoints.
/: Root directory contains configuration files.
wrangler.jsonc: Cloudflare Worker configuration with R2 bindings and environment variables.
package.json: Node.js dependencies for the Worker.

**Libraries and Frameworks
Cloudflare Worker: Uses @aws-sdk/client-s3 and @aws-sdk/s3-request-presigner (v3.600.0) for R2 signed URLs, jsonwebtoken (v9.0.0) for Supabase JWT verification.
Supabase: Uses @supabase/supabase-js for client-side authentication and database queries.
Node.js: For Worker runtime and dependency management.
Supabase PostgreSQL: Stores file metadata with Row Level Security (RLS).
**Coding Standards
Use TypeScript (ES modules) for Worker and client-side code.
Follow async/await for asynchronous operations (e.g., fetch, S3Client).
Use single quotes for strings.
Only use English for code comments and documentation.
Name variables and functions descriptively (e.g., uploadFile, signedUrl).
Return JSON responses with HTTP status codes (e.g., 200, 401, 403, 500).
Use environment variables for sensitive data (e.g., API keys, secrets).
Handle errors explicitly with meaningful messages.
**Database Guidelines
Supabase table files:
Columns: id (UUID, primary key), user_id (UUID, references auth.users), file_path (TEXT, not null), file_name (TEXT, not null), mime_type (TEXT), created_at (TIMESTAMPTZ).
RLS policies: Allow select and insert only for authenticated users where auth.uid() = user_id.
Store only metadata in Supabase; files are stored in R2.
**Security Guidelines
Always verify Supabase JWT in Worker using jsonwebtoken.verify.
Generate short-lived signed URLs (2 hours for upload, 1 day for download).
Use HTTPS for all API calls.
Do not hardcode sensitive keys; use environment variables in wrangler.jsonc.
Ensure Supabase RLS policies restrict access to user-owned data.
**Additional Instructions
Verify output, run tests, build locally before committing.
Only README.md documentation is allowed; no additional docs.