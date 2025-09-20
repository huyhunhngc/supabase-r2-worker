import { createClient } from '@supabase/supabase-js';
import { FileMetadata, SupabaseClient } from './types';
import { API_CONFIG } from './constants';

export class DatabaseError extends Error {
	constructor(message: string, public statusCode: number = 500) {
		super(message);
		this.name = 'DatabaseError';
	}
}

export function createSupabaseClient(url: string, jwtSecret: string): SupabaseClient {
	return createClient(url, jwtSecret);
}

export async function insertFileMetadata(
	supabase: SupabaseClient,
	metadata: FileMetadata
): Promise<FileMetadata> {
	try {
		const { data, error } = await supabase
			.from('files')
			.insert(metadata)
			.select()
			.single();

		if (error) {
			console.error('Supabase insert error:', error);
			throw new DatabaseError('Failed to store file metadata');
		}

		return data;
	} catch (error) {
		if (error instanceof DatabaseError) {
			throw error;
		}
		throw new DatabaseError('Database operation failed');
	}
}

export async function getFileMetadata(
	supabase: SupabaseClient,
	fileId: string,
	userId: string
): Promise<FileMetadata> {
	try {
		const { data, error } = await supabase
			.from('files')
			.select('*')
			.eq('id', fileId)
			.eq('user_id', userId)
			.single();

		if (error || !data) {
			throw new DatabaseError('File not found or access denied', 404);
		}

		return data;
	} catch (error) {
		if (error instanceof DatabaseError) {
			throw error;
		}
		throw new DatabaseError('Failed to fetch file metadata');
	}
}

export async function listUserFiles(
	supabase: SupabaseClient,
	userId: string,
	limit: number = API_CONFIG.DEFAULT_FILE_LIMIT,
	offset: number = 0
): Promise<{ files: FileMetadata[]; total: number }> {
	try {
		// Ensure limit doesn't exceed maximum
		const safeLimit = Math.min(limit, API_CONFIG.MAX_FILE_LIMIT);

		const { data: files, error, count } = await supabase
			.from('files')
			.select('*', { count: 'exact' })
			.eq('user_id', userId)
			.order('created_at', { ascending: false })
			.range(offset, offset + safeLimit - 1);

		if (error) {
			console.error('Supabase list error:', error);
			throw new DatabaseError('Failed to fetch files');
		}

		return {
			files: files || [],
			total: count || 0,
		};
	} catch (error) {
		if (error instanceof DatabaseError) {
			throw error;
		}
		throw new DatabaseError('Failed to list files');
	}
}

export async function deleteFileMetadata(
	supabase: SupabaseClient,
	fileId: string,
	userId: string
): Promise<void> {
	try {
		const { error } = await supabase
			.from('files')
			.delete()
			.eq('id', fileId)
			.eq('user_id', userId);

		if (error) {
			console.error('Supabase delete error:', error);
			throw new DatabaseError('Failed to delete file metadata');
		}
	} catch (error) {
		if (error instanceof DatabaseError) {
			throw error;
		}
		throw new DatabaseError('Database delete operation failed');
	}
}