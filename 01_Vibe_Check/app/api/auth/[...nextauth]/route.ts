import NextAuth from 'next-auth';
import { authOptions } from '../../../../lib/auth';

/**
 * NextAuth.js API route handler
 * Handles all /api/auth/* routes for Google OAuth
 */
const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
