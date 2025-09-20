import { Env } from './types';
import { authenticateRequest } from './auth/index';
import { createS3Client } from './storage/index';
import { createSupabaseClient } from './database/index';
import { handlePreflight, handleError } from './utils/index';

// Import handlers
import { handleUpload } from './handlers/upload';
import { handleDownload } from './handlers/download';
import { handleListFiles } from './handlers/list';
import { handleDeleteFile } from './handlers/delete';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		try {
			// Handle preflight requests
			if (request.method === 'OPTIONS') {
				return handlePreflight();
			}

			// Parse URL
			const url = new URL(request.url);
			const pathname = url.pathname;
			const method = request.method;

			// Authenticate request and get user ID (parse JWT locally - no API call!)
			const userId = await authenticateRequest(request, env.SUPABASE_JWT_SECRET);

			// Initialize clients
			const supabase = createSupabaseClient(env.SUPABASE_URL, env.SUPABASE_KEY);
			const s3Client = createS3Client(env);

			// Route to appropriate handler
			if (pathname === '/upload' && method === 'POST') {
				return await handleUpload(request, env, userId, supabase, s3Client);
			}

			if (pathname === '/download' && method === 'GET') {
				return await handleDownload(request, env, userId, supabase, s3Client);
			}

			if (pathname === '/files' && method === 'GET') {
				return await handleListFiles(request, env, userId, supabase);
			}

			if (pathname.startsWith('/files/') && method === 'DELETE') {
				return await handleDeleteFile(request, env, userId, supabase);
			}

			// Route not found
			return new Response(JSON.stringify({ error: 'Not found' }), {
				status: 404,
				headers: { 'Content-Type': 'application/json' },
			});

		} catch (error) {
			return handleError(error);
		}
	},
} satisfies ExportedHandler<Env>;
