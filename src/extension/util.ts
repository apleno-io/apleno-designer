import * as crypto from 'crypto';

export function getNonce() {
	return crypto.randomBytes(16).toString('hex');
}