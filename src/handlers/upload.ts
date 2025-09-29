import { S3Client } from '@aws-sdk/client-s3';
import { Env, UploadResponse, FileMetadata, SupabaseClient } from '../types';
import { generateFilePath, generateUploadUrl } from '../storage';
import { insertFileMetadata } from '../database';
import { validateFormField, createSuccessResponse, parseIntParam } from '../utils';
import { HTTP_STATUS } from '../constants';

interface UploadRequest {
  file_name: string;
  mime_type?: string;
  file_size?: number;
}

export async function handleUpload(
	request: Request,
	env: Env,
	userId: string,
	supabase: SupabaseClient,
	s3Client: S3Client
): Promise<Response> {
	const body: UploadRequest = await request.json();

	// Validate required fields
	const fileName = validateFormField(body, 'file_name', true)!;
	const mimeType = validateFormField(body, 'mime_type', false);
	const fileSizeStr = validateFormField(body, 'file_size', false);
	const fileSize = fileSizeStr ? parseIntParam(fileSizeStr, 0) : undefined;

	// Generate unique file path and ID
	const fileId = crypto.randomUUID();
	const filePath = generateFilePath(userId, fileName, fileId);

	// Generate signed upload URL
	const uploadUrl = await generateUploadUrl(s3Client, filePath, mimeType || undefined);

	// Create file metadata
	const metadata: FileMetadata = {
		id: fileId,
		user_id: userId,
		file_path: filePath,
		file_name: fileName,
		mime_type: mimeType || undefined,
		file_size: fileSize,
	};

	// Store metadata in database
	const savedMetadata = await insertFileMetadata(supabase, metadata);

	const response: UploadResponse = {
		success: true,
		file_id: fileId,
		upload_url: uploadUrl,
		file_path: filePath,
	};

	return createSuccessResponse(response, HTTP_STATUS.OK);
}