Simple Cloudflare Worker for secure file storage using R2 and Supabase.

## Features

- Supabase Auth integration
- R2 file storage with signed URLs
- File metadata in PostgreSQL

## API Endpoints

### POST `/upload`
- **Auth**: Bearer token from Supabase
- **Body**: FormData with `file_name`, `mime_type`, `file_size`
- **Returns**: Signed upload URL

### GET `/download?file_id=<id>`
- **Auth**: Bearer token from Supabase
- **Returns**: Signed download URL

### GET `/files?limit=50&offset=0`
- **Auth**: Bearer token from Supabase
- **Returns**: User's files list

### DELETE `/files/<file_id>`
- **Auth**: Bearer token from Supabase
- **Returns**: Success confirmation

## Setup

### 1. Create R2 Bucket
- Create bucket in Cloudflare dashboard

### 2. Database Setup
```sql
CREATE TABLE files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own files" ON files FOR ALL USING (auth.uid() = user_id);
```

### 3. Development
Create `.dev.vars` file and put all secrets
```bash
npx wrangler dev
```

### 4. Set Secrets
```bash
# Use Cloudflare integration to auto-set SUPABASE_URL and SUPABASE_KEY
# Or manually set:
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_KEY  # anon or service_role key

# R2 credentials:
wrangler secret put R2_ACCOUNT_ID
wrangler secret put R2_ACCESS_KEY_ID
wrangler secret put R2_SECRET_ACCESS_KEY
```

### 4. Deploy
```bash
npx wrangler deploy
```

## Modern Supabase Integration
See: https://supabase.com/partners/integrations/cloudflare-workers
