import { Env, ListFilesResponse, SupabaseClient } from '../types';
import { listUserFiles } from '../database';
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

	const response: ListFilesResponse = {
		success: true,
		files,
		total,
		limit,
		offset,
	};

	return createSuccessResponse(response, HTTP_STATUS.OK);
}