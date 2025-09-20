// API Configuration
export const API_CONFIG = {
	UPLOAD_URL_EXPIRY: 7200, // 2 hours in seconds
	DOWNLOAD_URL_EXPIRY: 86400, // 24 hours in seconds
	DEFAULT_FILE_LIMIT: 50,
	MAX_FILE_LIMIT: 100,
} as const;

// R2 Configuration
export const R2_CONFIG = {
	BUCKET_NAME: 'aio-scanner-files',
	DEFAULT_CONTENT_TYPE: 'application/octet-stream',
} as const;

// File path templates
export const FILE_PATH_TEMPLATES = {
	UPLOAD_PATH: (userId: string, date: string, fileId: string, fileName: string) =>
		`uploads/${userId}/${date}/${fileId}-${fileName}`,
} as const;

// CORS headers
export const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization',
} as const;

// HTTP Status codes
export const HTTP_STATUS = {
	OK: 200,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	INTERNAL_SERVER_ERROR: 500,
} as const;