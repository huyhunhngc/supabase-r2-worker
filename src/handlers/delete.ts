import { Env, DeleteResponse, SupabaseClient } from '../types';
import { deleteFileFromStorage } from '../storage';
import { getFileMetadata, deleteFileMetadata } from '../database';
import { createSuccessResponse } from '../utils';
import { HTTP_STATUS } from '../constants';

export async function handleDeleteFile(
	request: Request,
	env: Env,
	userId: string,
	supabase: SupabaseClient
): Promise<Response> {
	const url = new URL(request.url);
	const pathParts = url.pathname.split('/');
	const fileId = pathParts[pathParts.length - 1];

	if (!fileId) {
		throw new Error('file_id is required');
	}

	// Get file metadata first to verify ownership and get file path
	const fileMetadata = await getFileMetadata(supabase, fileId, userId);

	// Delete from R2 storage
	try {
		await deleteFileFromStorage(env.STORAGE_BUCKET, fileMetadata.file_path);
	} catch (storageError) {
		console.error('R2 delete error:', storageError);
		// Continue with database deletion even if storage deletion fails
		// This prevents orphaned metadata if the file was already deleted from storage
	}

	// Delete metadata from database
	await deleteFileMetadata(supabase, fileId, userId);

	const response: DeleteResponse = {
		success: true,
		message: 'File deleted successfully',
	};

	return createSuccessResponse(response, HTTP_STATUS.OK);
}