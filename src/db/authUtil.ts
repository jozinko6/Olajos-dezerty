/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';

/**
 * SHA256 password hashing helper for robust platform portability
 */
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Super simple JWT-like representation for safe session tokens
 */
export function generateToken(payload: { userId: string; email: string; roles: string[] }): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const serializedPayload = Buffer.from(JSON.stringify({ 
    ...payload, 
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  })).toString('base64url');
  
  // Robust dummy signature on secret
  const secret = process.env.JWT_SECRET || 'olajos_sweet_secret_key_2026';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${serializedPayload}`)
    .digest('base64url');
    
  return `${header}.${serializedPayload}.${signature}`;
}

/**
 * Verify JWT token securely
 */
export function verifyToken(token: string): { userId: string; email: string; roles: string[] } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [header, serializedPayload, signature] = parts;
    const secret = process.env.JWT_SECRET || 'olajos_sweet_secret_key_2026';
    
    // Validate signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${header}.${serializedPayload}`)
      .digest('base64url');
      
    if (signature !== expectedSignature) return null;
    
    const decodedPayload = JSON.parse(Buffer.from(serializedPayload, 'base64url').toString('utf-8'));
    
    // Check expiration
    if (decodedPayload.exp && decodedPayload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Token expired
    }
    
    return {
      userId: decodedPayload.userId,
      email: decodedPayload.email,
      roles: decodedPayload.roles
    };
  } catch (e) {
    return null;
  }
}
