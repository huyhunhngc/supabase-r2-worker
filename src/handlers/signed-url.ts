import { Env, SupabaseClient, SignedUrlResponse } from '../types';
import { getFileMetadata } from '../database';
import { generateDownloadUrl, createS3Client } from '../storage';
import { createSuccessResponse } from '../utils';
import { HTTP_STATUS } from '../constants';

export async function handleGetSignedUrl(
	request: Request,
	env: Env,
	userId: string,
	supabase: SupabaseClient
): Promise<Response> {
	const url = new URL(request.url);
	const pathParts = url.pathname.split('/');
	const fileId = pathParts[pathParts.length - 2]; // /files/{fileId}/signed-url

	if (!fileId) {
		throw new Error('file_id is required');
	}

	// Get file metadata and verify ownership
	const fileMetadata = await getFileMetadata(supabase, fileId, userId);

	// Generate signed URL with 60 minutes expiration
	const s3Client = createS3Client(env);
	const signedUrl = await generateDownloadUrl(s3Client, fileMetadata.file_path, 60); // 60 minutes
	
	// Calculate expiration time
	const expirationTime = new Date(Date.now() + 60 * 60 * 1000); // 60 minutes from now
	
	const response: SignedUrlResponse = {
		success: true,
		file_id: fileId,
		file_sign_url: signedUrl,
		file_sign_url_expire: expirationTime.toISOString(),
	};

	return createSuccessResponse(response, HTTP_STATUS.OK);
}