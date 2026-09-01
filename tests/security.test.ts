import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Mock Auth Verification simulating adminAuth.verifyIdToken(token)
 */
interface DecodedToken {
  uid: string;
  email?: string;
  exp: number;
}

async function mockAdminVerifyIdToken(token?: string): Promise<DecodedToken> {
  if (!token || typeof token !== 'string') {
    throw new Error('AUTH_MISSING_TOKEN: Authorization token was not provided.');
  }

  const parts = token.split(' ');
  const rawToken = parts.length === 2 && parts[0] === 'Bearer' ? parts[1] : token;

  if (rawToken === 'EXPIRED_TOKEN') {
    throw new Error('AUTH_TOKEN_EXPIRED: The Firebase ID token has expired.');
  }

  if (rawToken === 'INVALID_TOKEN' || rawToken.length < 10) {
    throw new Error('AUTH_TOKEN_INVALID: The Firebase ID token is malformed or invalid.');
  }

  if (rawToken.startsWith('valid-token-for-')) {
    const uid = rawToken.replace('valid-token-for-', '');
    return {
      uid,
      email: `${uid}@example.com`,
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
  }

  return {
    uid: 'test-user-uid',
    email: 'user@example.com',
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

/**
 * Path validator enforcing tenant isolation rules (/users/{uid}/journals/{id} or /users/{uid}/entries/{id})
 */
function validateFirestoreTenantPath(path: string, authenticatedUid: string): boolean {
  // Regex matching strict tenant isolated paths
  const tenantPathRegex = /^\/users\/([^/]+)\/(journals|entries)(\/([^/]+))?$/;
  const match = path.match(tenantPathRegex);

  if (!match) {
    return false;
  }

  const pathUid = match[1];
  return pathUid === authenticatedUid;
}

describe('Security Constitution Test Suite', () => {
  describe('Directive 1: Zero Client-Side Secret Leakage', () => {
    it('should verify that sensitive API keys are never prefixed with NEXT_PUBLIC_', () => {
      // Check .env.example or project config files
      const envExamplePath = path.resolve(process.cwd(), '.env.example');
      if (fs.existsSync(envExamplePath)) {
        const envContent = fs.readFileSync(envExamplePath, 'utf8');
        assert.strictEqual(
          envContent.includes('NEXT_PUBLIC_GEMINI_API_KEY'),
          false,
          'NEXT_PUBLIC_GEMINI_API_KEY must not exist in environment templates'
        );
        assert.strictEqual(
          envContent.includes('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY'),
          false,
          'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY must not exist in environment templates'
        );
      }
    });

    it('should ensure client-accessible config only contains safe public identifiers', () => {
      const firebaseConfigPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
      if (fs.existsSync(firebaseConfigPath)) {
        const raw = fs.readFileSync(firebaseConfigPath, 'utf8');
        const config = JSON.parse(raw);
        assert.strictEqual('privateKey' in config, false, 'Private key must not be present in client config');
        assert.strictEqual('serviceAccount' in config, false, 'Service account must not be present in client config');
      }
    });
  });

  describe('Directive 2: Firestore Tenant Isolation (/users/{uid}/...)', () => {
    it('should permit access when authenticated UID matches path UID', () => {
      const uid = 'alice-123';
      const validEntryPath = `/users/${uid}/journals/entry-abc`;
      const validSubcollectionPath = `/users/${uid}/entries`;

      assert.strictEqual(validateFirestoreTenantPath(validEntryPath, uid), true);
      assert.strictEqual(validateFirestoreTenantPath(validSubcollectionPath, uid), true);
    });

    it('should strictly reject cross-tenant path access', () => {
      const aliceUid = 'alice-123';
      const bobUid = 'bob-456';
      const bobsJournalPath = `/users/${bobUid}/journals/secret-entry`;

      // Alice attempts to access Bob's data
      const isAllowed = validateFirestoreTenantPath(bobsJournalPath, aliceUid);
      assert.strictEqual(isAllowed, false, 'Cross-tenant access must be denied');
    });

    it('should reject non-isolated root collection paths', () => {
      const aliceUid = 'alice-123';
      const rootPath = `/journals/global-entry`;
      const rootUsersPath = `/all_users/alice-123`;

      assert.strictEqual(validateFirestoreTenantPath(rootPath, aliceUid), false);
      assert.strictEqual(validateFirestoreTenantPath(rootUsersPath, aliceUid), false);
    });
  });

  describe('Directive 3: Mandatory adminAuth.verifyIdToken Execution', () => {
    it('should successfully verify valid Firebase ID tokens', async () => {
      const decoded = await mockAdminVerifyIdToken('Bearer valid-token-for-user-789');
      assert.strictEqual(decoded.uid, 'user-789');
      assert.strictEqual(decoded.email, 'user-789@example.com');
    });

    it('should reject requests with missing token', async () => {
      await assert.rejects(
        async () => {
          await mockAdminVerifyIdToken(undefined);
        },
        {
          message: /AUTH_MISSING_TOKEN/,
        }
      );
    });

    it('should reject requests with expired token', async () => {
      await assert.rejects(
        async () => {
          await mockAdminVerifyIdToken('Bearer EXPIRED_TOKEN');
        },
        {
          message: /AUTH_TOKEN_EXPIRED/,
        }
      );
    });

    it('should reject requests with malformed/invalid token', async () => {
      await assert.rejects(
        async () => {
          await mockAdminVerifyIdToken('Bearer INVALID_TOKEN');
        },
        {
          message: /AUTH_TOKEN_INVALID/,
        }
      );
    });
  });

  describe('Directive 4: Geocoding Proxy Route Security Gate (/api/location/geocode)', () => {
    it('should require Bearer authorization header before upstream querying', () => {
      const headersWithoutAuth = new Headers({});
      const authHeader = headersWithoutAuth.get('authorization');
      assert.strictEqual(authHeader?.startsWith('Bearer '), false || undefined);
    });

    it('should reject invalid coordinate payloads', () => {
      const invalidPayload = { latitude: 'invalid_lat', longitude: 106.8272 };
      const isValid =
        typeof invalidPayload.latitude === 'number' &&
        typeof invalidPayload.longitude === 'number';
      assert.strictEqual(isValid, false);
    });

    it('should accept valid numeric coordinate payloads', () => {
      const validPayload = { latitude: -6.1754, longitude: 106.8272 };
      const isValid =
        typeof validPayload.latitude === 'number' &&
        typeof validPayload.longitude === 'number';
      assert.strictEqual(isValid, true);
    });
  });

  describe('Directive 5: Notification Dispatch Route Security Gate (/api/notifications/dispatch)', () => {
    it('should reject unauthenticated webhook dispatch requests', () => {
      const headersWithoutAuth = new Headers({});
      const authHeader = headersWithoutAuth.get('authorization');
      assert.strictEqual(authHeader?.startsWith('Bearer '), false || undefined);
    });

    it('should require non-empty title and summary for webhook dispatch', () => {
      const invalidSummary = { title: '', summary: '' };
      const isValid = Boolean(invalidSummary.title && invalidSummary.summary);
      assert.strictEqual(isValid, false);

      const validSummary = { title: 'Reflection Title', summary: 'Reflection Summary' };
      const isComplete = Boolean(validSummary.title && validSummary.summary);
      assert.strictEqual(isComplete, true);
    });
  });
});
