import { S3Client } from '@aws-sdk/client-s3';
import { Env, DownloadResponse, SupabaseClient } from '../types';
import { generateDownloadUrl } from '../storage';
import { getFileMetadata } from '../database';
import { validateQueryParam, createSuccessResponse } from '../utils';
import { HTTP_STATUS } from '../constants';

export async function handleDownload(
	request: Request,
	env: Env,
	userId: string,
	supabase: SupabaseClient,
	s3Client: S3Client
): Promise<Response> {
	const url = new URL(request.url);

	// Validate required parameters
	const fileId = validateQueryParam(url, 'file_id', true)!;

	// Get file metadata and verify ownership
	const fileMetadata = await getFileMetadata(supabase, fileId, userId);

	// Generate signed download URL
	const downloadUrl = await generateDownloadUrl(s3Client, fileMetadata.file_path);

	const response: DownloadResponse = {
		success: true,
		download_url: downloadUrl,
		file_metadata: fileMetadata,
	};

	return createSuccessResponse(response, HTTP_STATUS.OK);
}