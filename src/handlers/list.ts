import { Env, ListFilesResponse, SupabaseClient } from '../types';
import { listUserFiles } from '../database';
import { generateDownloadUrl, createS3Client } from '../storage';
import { validateQueryParam, createSuccessResponse, parseIntParam } from '../utils';
import { HTTP_STATUS, API_CONFIG } from '../constants';

export async function handleListFiles(
	request: Request,
	env: Env,
	userId: string,
	supabase: SupabaseClient
): Promise<Response> {
	const url = new URL(request.url);

	// Parse pagination parameters
	const limitStr = validateQueryParam(url, 'limit', false);
	const offsetStr = validateQueryParam(url, 'offset', false);

	const limit = parseIntParam(limitStr, API_CONFIG.DEFAULT_FILE_LIMIT);
	const offset = parseIntParam(offsetStr, 0);

	// Get user's files
	const { files, total } = await listUserFiles(supabase, userId, limit, offset);

	// Generate signed URLs for each file (60 minutes expiration)
	const s3Client = createS3Client(env);
	const expirationTime = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes from now
	
	const filesWithSignedUrls = await Promise.all(
		files.map(async (file) => {
			try {
				const signedUrl = await generateDownloadUrl(s3Client, file.file_path, 60); // 60 minutes
				return {
					...file,
					file_sign_url: signedUrl,
					file_sign_url_expire: expirationTime.toISOString(),
				};
			} catch (error) {
				console.error(`Failed to generate signed URL for file ${file.id}:`, error);
				// Return file without signed URL if generation fails
				return file;
			}
		})
	);

	const response: ListFilesResponse = {
		success: true,
		files: filesWithSignedUrls,
		total,
		limit,
		offset,
	};

	return createSuccessResponse(response, HTTP_STATUS.OK);
}