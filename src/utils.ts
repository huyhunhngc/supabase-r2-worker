import { CORS_HEADERS, HTTP_STATUS } from './constants';
import { ErrorResponse } from './types';
import { AuthError } from './auth';
import { StorageError } from './storage';
import { DatabaseError } from './database';

export function createCorsResponse(
	body?: any,
	status: number = HTTP_STATUS.OK,
	additionalHeaders: Record<string, string> = {}
): Response {
	const headers = {
		'Content-Type': 'application/json',
		...CORS_HEADERS,
		...additionalHeaders,
	};

	return new Response(body ? JSON.stringify(body) : null, {
		status,
		headers,
	});
}

export function createErrorResponse(
	error: string,
	status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR
): Response {
	const errorBody: ErrorResponse = {
		success: false,
		error,
	};
	return createCorsResponse(errorBody, status);
}

export function createSuccessResponse(data: any, status: number = HTTP_STATUS.OK): Response {
	return createCorsResponse(data, status);
}

export function handlePreflight(): Response {
	return createCorsResponse(null, HTTP_STATUS.OK);
}

export function handleError(error: unknown): Response {
	console.error('Worker error:', error);

	if (error instanceof AuthError) {
		return createErrorResponse(error.message, error.statusCode);
	}

	if (error instanceof StorageError) {
		return createErrorResponse(error.message, error.statusCode);
	}

	if (error instanceof DatabaseError) {
		return createErrorResponse(error.message, error.statusCode);
	}

	return createErrorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
}

export function validateFormField(
	formData: FormData,
	fieldName: string,
	required: boolean = true
): string | null {
	const value = formData.get(fieldName) as string;

	if (required && !value) {
		throw new Error(`${fieldName} is required`);
	}

	return value;
}

export function validateQueryParam(
	url: URL,
	paramName: string,
	required: boolean = true
): string | null {
	const value = url.searchParams.get(paramName);

	if (required && !value) {
		throw new Error(`${paramName} parameter is required`);
	}

	return value;
}

export function parseIntParam(value: string | null, defaultValue: number): number {
	if (!value) return defaultValue;
	const parsed = parseInt(value, 10);
	return isNaN(parsed) ? defaultValue : parsed;
}

export function isValidHttpMethod(method: string, allowedMethods: string[]): boolean {
	return allowedMethods.includes(method.toUpperCase());
}