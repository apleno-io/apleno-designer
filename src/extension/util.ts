export function getNonce() {
	return require('crypto').randomBytes(16).toString('hex');
}