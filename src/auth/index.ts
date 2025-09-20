import jwt from 'jsonwebtoken';

export class AuthError extends Error {
	constructor(message: string, public statusCode: number = 401) {
		super(message);
		this.name = 'AuthError';
	}
}

interface JWTPayload {
	sub: string;  // user ID
	email?: string;
	iat: number;
	exp: number;
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

export function authenticateRequest(request: Request, jwtSecret: string): string {
	const authHeader = request.headers.get('Authorization');
	const token = extractTokenFromHeader(authHeader);
	const payload = verifyJWTToken(token, jwtSecret);
	console.log('Authenticated user ID:', payload.sub);
	console.log('Token payload:', payload);

	return payload.sub; // Return user ID directly
}