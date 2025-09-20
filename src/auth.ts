import jwt from 'jsonwebtoken';
import { JWTPayload } from './types';

export class AuthError extends Error {
	constructor(message: string, public statusCode: number = 401) {
		super(message);
		this.name = 'AuthError';
	}
}

export function extractTokenFromHeader(authHeader: string | null): string {
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		throw new AuthError('Missing or invalid authorization header');
	}
	return authHeader.substring(7);
}

export function verifyJWTToken(token: string, secret: string): JWTPayload {
	try {
		const payload = jwt.verify(token, secret) as JWTPayload;
		return payload;
	} catch (error) {
		if (error instanceof jwt.JsonWebTokenError) {
			throw new AuthError('Invalid or expired token');
		}
		throw new AuthError('Token verification failed');
	}
}

export function extractUserIdFromToken(token: string, secret: string): string {
	const payload = verifyJWTToken(token, secret);
	return payload.sub;
}

export function authenticateRequest(request: Request, jwtSecret: string): string {
	const authHeader = request.headers.get('Authorization');
	const token = extractTokenFromHeader(authHeader);
	return extractUserIdFromToken(token, jwtSecret);
}