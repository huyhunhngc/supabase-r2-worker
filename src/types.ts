export interface Env {
	STORAGE_BUCKET: R2Bucket;
	SUPABASE_URL: string;
	SUPABASE_KEY: string;
	SUPABASE_JWT_SECRET: string;
	R2_ACCOUNT_ID: string;
	R2_ACCESS_KEY_ID: string;
	R2_SECRET_ACCESS_KEY: string;
	R2_REGION: string;
}

export interface JWTPayload {
	sub: string;
	email?: string;
	exp: number;
	iat: number;
}

export interface FileMetadata {
	id?: string;
	user_id: string;
	file_path: string;
	file_name: string;
	mime_type?: string;
	file_size?: number;
	created_at?: string;
}

export interface UploadResponse {
	success: boolean;
	file_id?: string;
	upload_url?: string;
	file_path?: string;
	error?: string;
}

export interface DownloadResponse {
	success: boolean;
	download_url?: string;
	file_metadata?: FileMetadata;
	error?: string;
}

export interface ListFilesResponse {
	success: boolean;
	files?: FileMetadata[];
	total?: number;
	limit?: number;
	offset?: number;
	error?: string;
}

export interface DeleteResponse {
	success: boolean;
	message?: string;
	error?: string;
}

export interface ErrorResponse {
	success: false;
	error: string;
}

export interface SupabaseClient {
	from(table: string): any;
}