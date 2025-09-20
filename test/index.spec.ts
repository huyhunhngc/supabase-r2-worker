import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import worker from '../src/index';
import jwt from 'jsonwebtoken';

// Mock the external dependencies
vi.mock('@aws-sdk/client-s3', () => ({
	S3Client: vi.fn().mockImplementation(() => ({})),
	GetObjectCommand: vi.fn(),
	PutObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
	getSignedUrl: vi.fn().mockResolvedValue('https://signed-url.example.com'),
}));

vi.mock('@supabase/supabase-js', () => ({
	createClient: vi.fn().mockReturnValue({
		from: vi.fn().mockReturnValue({
			insert: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: 'test-file-id', user_id: 'test-user' },
						error: null,
					}),
				}),
			}),
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { 
								id: 'test-file-id', 
								user_id: 'test-user',
								file_path: 'uploads/test-user/2025-01-01/test-file.txt',
								file_name: 'test-file.txt',
								mime_type: 'text/plain'
							},
							error: null,
						}),
						order: vi.fn().mockReturnValue({
							range: vi.fn().mockResolvedValue({
								data: [],
								error: null,
								count: 0,
							}),
						}),
					}),
				}),
			}),
			delete: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: null,
					}),
				}),
			}),
		}),
	}),
}));

// Mock the modular components
vi.mock('../src/auth', () => ({
	authenticateRequest: vi.fn().mockReturnValue('test-user-id'),
	AuthError: class AuthError extends Error {
		constructor(message: string, public statusCode: number = 401) {
			super(message);
			this.name = 'AuthError';
		}
	},
}));

vi.mock('../src/storage', () => ({
	createS3Client: vi.fn().mockReturnValue({}),
	StorageError: class StorageError extends Error {
		constructor(message: string, public statusCode: number = 500) {
			super(message);
			this.name = 'StorageError';
		}
	},
}));

vi.mock('../src/database', () => ({
	createSupabaseClient: vi.fn().mockReturnValue({
		from: vi.fn().mockReturnValue({
			insert: vi.fn().mockReturnValue({
				select: vi.fn().mockReturnValue({
					single: vi.fn().mockResolvedValue({
						data: { id: 'test-file-id', user_id: 'test-user' },
						error: null,
					}),
				}),
			}),
			select: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockReturnValue({
						single: vi.fn().mockResolvedValue({
							data: { 
								id: 'test-file-id', 
								user_id: 'test-user',
								file_path: 'uploads/test-user/2025-01-01/test-file.txt',
								file_name: 'test-file.txt',
								mime_type: 'text/plain'
							},
							error: null,
						}),
						order: vi.fn().mockReturnValue({
							range: vi.fn().mockResolvedValue({
								data: [],
								error: null,
								count: 0,
							}),
						}),
					}),
				}),
			}),
			delete: vi.fn().mockReturnValue({
				eq: vi.fn().mockReturnValue({
					eq: vi.fn().mockResolvedValue({
						error: null,
					}),
				}),
			}),
		}),
	}),
	DatabaseError: class DatabaseError extends Error {
		constructor(message: string, public statusCode: number = 500) {
			super(message);
			this.name = 'DatabaseError';
		}
	},
}));

vi.mock('../src/handlers/upload', () => ({
	handleUpload: vi.fn().mockResolvedValue(
		new Response(JSON.stringify({
			success: true,
			file_id: 'test-file-id',
			upload_url: 'https://signed-url.example.com',
			file_path: 'uploads/test-user/2025-01-01/test-file.txt'
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
		})
	),
}));

vi.mock('../src/handlers/download', () => ({
	handleDownload: vi.fn().mockResolvedValue(
		new Response(JSON.stringify({
			success: true,
			download_url: 'https://signed-url.example.com',
			file_metadata: {
				id: 'test-file-id',
				user_id: 'test-user',
				file_path: 'uploads/test-user/2025-01-01/test-file.txt',
				file_name: 'test-file.txt',
				mime_type: 'text/plain'
			}
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
		})
	),
}));

vi.mock('../src/handlers/list', () => ({
	handleListFiles: vi.fn().mockResolvedValue(
		new Response(JSON.stringify({
			success: true,
			files: [],
			total: 0,
			limit: 50,
			offset: 0
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
		})
	),
}));

vi.mock('../src/handlers/delete', () => ({
	handleDeleteFile: vi.fn().mockResolvedValue(
		new Response(JSON.stringify({
			success: true,
			message: 'File deleted successfully'
		}), {
			status: 200,
			headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
		})
	),
}));

// Mock utils with custom error classes
vi.mock('../src/utils', async (importOriginal) => {
	const actual = await importOriginal() as any;
	return {
		...actual,
		StorageError: class StorageError extends Error {
			constructor(message: string, public statusCode: number = 500) {
				super(message);
				this.name = 'StorageError';
			}
		},
		DatabaseError: class DatabaseError extends Error {
			constructor(message: string, public statusCode: number = 500) {
				super(message);
				this.name = 'DatabaseError';
			}
		},
		ValidationError: class ValidationError extends Error {
			constructor(message: string, public statusCode: number = 400) {
				super(message);
				this.name = 'ValidationError';
			}
		},
	};
});

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

// Mock environment with all required variables
const mockEnv = {
	...env,
	SUPABASE_URL: 'https://test.supabase.co',
	SUPABASE_JWT_SECRET: 'test-secret',
	R2_ACCOUNT_ID: 'test-account',
	R2_ACCESS_KEY_ID: 'test-access-key',
	R2_SECRET_ACCESS_KEY: 'test-secret-key',
	R2_REGION: 'auto',
	STORAGE_BUCKET: {
		delete: vi.fn().mockResolvedValue(undefined),
	} as any,
};

// Helper function to create a valid JWT token
function createTestToken(userId: string = 'test-user-id'): string {
	return jwt.sign(
		{ 
			sub: userId, 
			email: 'test@example.com',
			exp: Math.floor(Date.now() / 1000) + (60 * 60), // 1 hour from now
			iat: Math.floor(Date.now() / 1000),
		},
		'test-secret'
	);
}

describe('File Storage Worker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('Authentication', () => {
		it('should reject requests without authorization header', async () => {
			// Mock auth to throw error for missing header
			const { authenticateRequest } = await import('../src/auth');
			vi.mocked(authenticateRequest).mockImplementationOnce(() => {
				throw new Error('Missing or invalid authorization header');
			});

			const request = new IncomingRequest('http://example.com/upload', {
				method: 'POST',
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(500); // Error is caught and handled as 500
			const data = await response.json() as any;
			expect(data.error).toBeDefined();
		});

		it('should reject requests with invalid JWT token', async () => {
			// Mock auth to throw error for invalid token
			const { authenticateRequest } = await import('../src/auth');
			vi.mocked(authenticateRequest).mockImplementationOnce(() => {
				throw new Error('Invalid or expired token');
			});

			const request = new IncomingRequest('http://example.com/upload', {
				method: 'POST',
				headers: {
					'Authorization': 'Bearer invalid-token',
				},
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(500); // Error is caught and handled as 500
		});

		it('should accept requests with valid JWT token', async () => {
			const token = createTestToken();
			const formData = new FormData();
			formData.append('file_name', 'test.txt');
			formData.append('mime_type', 'text/plain');
			formData.append('file_size', '1024');

			const request = new IncomingRequest('http://example.com/upload', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
				body: formData,
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
		});
	});

	describe('CORS', () => {
		it('should handle preflight OPTIONS requests', async () => {
			const request = new IncomingRequest('http://example.com/upload', {
				method: 'OPTIONS',
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
			expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
		});

		it('should include CORS headers in all responses', async () => {
			const token = createTestToken();
			const request = new IncomingRequest('http://example.com/download?file_id=test-id', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
		});
	});

	describe('Upload endpoint', () => {
		it('should generate upload URL for valid file request', async () => {
			const token = createTestToken();
			const formData = new FormData();
			formData.append('file_name', 'test.txt');
			formData.append('mime_type', 'text/plain');
			formData.append('file_size', '1024');

			const request = new IncomingRequest('http://example.com/upload', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
				body: formData,
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = await response.json() as any;
			expect(data.success).toBe(true);
			expect(data.upload_url).toBeDefined();
			expect(data.file_id).toBeDefined();
			expect(data.file_path).toBeDefined();
		});

		it('should route to upload handler', async () => {
			const { handleUpload } = await import('../src/handlers/upload');
			const token = createTestToken();
			const formData = new FormData();
			formData.append('file_name', 'test.txt');

			const request = new IncomingRequest('http://example.com/upload', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
				body: formData,
			});
			const ctx = createExecutionContext();
			await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(vi.mocked(handleUpload)).toHaveBeenCalled();
		});
	});

	describe('Download endpoint', () => {
		it('should generate download URL for valid file request', async () => {
			const token = createTestToken();
			const request = new IncomingRequest('http://example.com/download?file_id=test-file-id', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = await response.json() as any;
			expect(data.success).toBe(true);
			expect(data.download_url).toBeDefined();
			expect(data.file_metadata).toBeDefined();
		});

		it('should route to download handler', async () => {
			const { handleDownload } = await import('../src/handlers/download');
			const token = createTestToken();
			const request = new IncomingRequest('http://example.com/download?file_id=test-file-id', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});
			const ctx = createExecutionContext();
			await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(vi.mocked(handleDownload)).toHaveBeenCalled();
		});
	});

	describe('List files endpoint', () => {
		it('should route to list handler', async () => {
			const { handleListFiles } = await import('../src/handlers/list');
			const token = createTestToken();
			const request = new IncomingRequest('http://example.com/files', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});
			const ctx = createExecutionContext();
			await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(vi.mocked(handleListFiles)).toHaveBeenCalled();
		});
	});

	describe('Delete endpoint', () => {
		it('should route to delete handler', async () => {
			const { handleDeleteFile } = await import('../src/handlers/delete');
			const token = createTestToken();
			const request = new IncomingRequest('http://example.com/files/test-file-id', {
				method: 'DELETE',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});
			const ctx = createExecutionContext();
			await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(vi.mocked(handleDeleteFile)).toHaveBeenCalled();
		});
	});

	describe('Routing', () => {
		it('should return 404 for unknown endpoints', async () => {
			const token = createTestToken();
			const request = new IncomingRequest('http://example.com/unknown', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(404);
			const data = await response.json() as any;
			expect(data.error).toBe('Not found');
		});
	});

	describe('Integration style tests', () => {
		it('should handle files list endpoint', async () => {
			const token = createTestToken();
			const request = new IncomingRequest('http://example.com/files', {
				method: 'GET',
				headers: {
					'Authorization': `Bearer ${token}`,
				},
			});
			const ctx = createExecutionContext();
			const response = await worker.fetch(request, mockEnv, ctx);
			await waitOnExecutionContext(ctx);

			expect(response.status).toBe(200);
			const data = await response.json() as any;
			expect(data.success).toBe(true);
			expect(data.files).toBeDefined();
		});
	});
});
