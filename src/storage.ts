import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Env } from './types';
import { API_CONFIG, R2_CONFIG } from './constants';

export class StorageError extends Error {
	constructor(message: string, public statusCode: number = 500) {
		super(message);
		this.name = 'StorageError';
	}
}

export function createS3Client(env: Env): S3Client {
	return new S3Client({
		region: env.R2_REGION,
		endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
		credentials: {
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY,
		},
	});
}

export async function generateUploadUrl(
	s3Client: S3Client,
	filePath: string,
	mimeType?: string
): Promise<string> {
	try {
		const putCommand = new PutObjectCommand({
			Bucket: R2_CONFIG.BUCKET_NAME,
			Key: filePath,
			ContentType: mimeType || R2_CONFIG.DEFAULT_CONTENT_TYPE,
		});

		return await getSignedUrl(s3Client, putCommand, {
			expiresIn: API_CONFIG.UPLOAD_URL_EXPIRY,
		});
	} catch (error) {
		throw new StorageError('Failed to generate upload URL');
	}
}

export async function generateDownloadUrl(
	s3Client: S3Client,
	filePath: string
): Promise<string> {
	try {
		const getCommand = new GetObjectCommand({
			Bucket: R2_CONFIG.BUCKET_NAME,
			Key: filePath,
		});

		return await getSignedUrl(s3Client, getCommand, {
			expiresIn: API_CONFIG.DOWNLOAD_URL_EXPIRY,
		});
	} catch (error) {
		throw new StorageError('Failed to generate download URL');
	}
}

export async function deleteFileFromStorage(
	bucket: R2Bucket,
	filePath: string
): Promise<void> {
	try {
		await bucket.delete(filePath);
	} catch (error) {
		throw new StorageError('Failed to delete file from storage');
	}
}

export function generateFilePath(
	userId: string,
	fileName: string,
	fileId?: string
): string {
	const id = fileId || crypto.randomUUID();
	const timestamp = new Date().toISOString().split('T')[0];
	return `uploads/${userId}/${timestamp}/${id}-${fileName}`;
}