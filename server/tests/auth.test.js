process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "test_super_secret_jwt_key_123456789";
process.env.JWT_REFRESH_SECRET = "test_super_secret_refresh_key_123456789";

const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert");
const app = require("../app");
const User = require("../models/User");
const Session = require("../models/Session");
const googleAuth = require("../utils/googleAuth");
const { mockRequest } = require("./testHelper");
const { mockDb, setupMongooseMocks } = require("./mockDb");
const {
  hashToken,
  generateRandomToken,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} = require("../utils/tokenManager");

// Install Mongoose mocks
setupMongooseMocks(User, Session);

describe("FinLab Comprehensive Authentication Test Suite", () => {
  beforeEach(() => {
    mockDb.clear();
  });

  // =========================================================================
  // 1. Health Endpoint
  // =========================================================================
  test("GET /api/health - Responds with system health status", async () => {
    const res = await mockRequest(app, {
      method: "GET",
      url: "/api/health",
    });
    assert.ok(res.status === 200 || res.status === 503);
    assert.ok(res.body.timestamp);
    assert.ok(typeof res.body.database === "string");
  });

  // =========================================================================
  // 2. Token Manager Cryptographic Utilities
  // =========================================================================
  test("TokenManager - Generates SHA-256 hashes and random tokens consistently", () => {
    const hash1 = hashToken("test_secret");
    const hash2 = hashToken("test_secret");
    const diffHash = hashToken("different_secret");
    assert.strictEqual(hash1, hash2);
    assert.notStrictEqual(hash1, diffHash);
    assert.strictEqual(hash1.length, 64);

    const rand1 = generateRandomToken(32);
    const rand2 = generateRandomToken(32);
    assert.strictEqual(rand1.length, 64);
    assert.notStrictEqual(rand1, rand2);
  });

  test("TokenManager - Issues and validates JWT access and refresh claims", () => {
    const mockUser = { _id: "60d0fe4f5311236168a109ca", email: "unit@finlab.com" };
    const access = generateAccessToken(mockUser);
    const refresh = generateRefreshToken(mockUser, "60d0fe4f5311236168a109cb");

    const decodedAccess = verifyAccessToken(access);
    assert.strictEqual(decodedAccess.id, mockUser._id);
    assert.strictEqual(decodedAccess.email, mockUser.email);
    assert.strictEqual(decodedAccess.iss, "finlab-auth");
    assert.strictEqual(decodedAccess.aud, "finlab-client");

    const decodedRefresh = verifyRefreshToken(refresh);
    assert.strictEqual(decodedRefresh.id, mockUser._id);
    assert.strictEqual(decodedRefresh.sessionId, "60d0fe4f5311236168a109cb");
  });

  // =========================================================================
  // 3. Registration Flow (Immediate Session, No Email Verification)
  // =========================================================================
  test("POST /api/auth/register - Rejects missing and weak fields", async () => {
    const res = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "J",
        lastName: "",
        email: "not-an-email",
        password: "weak",
      },
    });
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.errors);
  });

  test("POST /api/auth/register - Successfully registers, creates session & sets HttpOnly cookie", async () => {
    const res = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
        password: "Password123!",
      },
    });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.strictEqual(res.body.data.user.email, "john@example.com");
    assert.strictEqual(res.body.data.user.isActive, true);
    assert.strictEqual(res.body.data.user.onboardingCompleted, false);
    assert.strictEqual(res.body.data.user.password, undefined);

    // Verify refresh token cookie
    assert.ok(res.cookies.length > 0);
    assert.ok(res.cookies[0].includes("refreshToken="));

    // Verify session created in DB
    assert.strictEqual(mockDb.sessions.size, 1);
  });

  test("POST /api/auth/register - Rejects duplicate email registration", async () => {
    // First registration
    await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "John",
        lastName: "Doe",
        email: "dup@example.com",
        password: "Password123!",
      },
    });

    // Duplicate registration attempt
    const res = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "Johnny",
        lastName: "Doe",
        email: "dup@example.com",
        password: "Password123!",
      },
    });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert.ok(res.body.message.includes("already exists"));
  });

  // =========================================================================
  // 4. Login Flow (No Email Verification Required)
  // =========================================================================
  test("POST /api/auth/login - Rejects incorrect password", async () => {
    await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        password: "Password123!",
      },
    });

    const res = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/login",
      body: {
        email: "jane@example.com",
        password: "WrongPassword999!",
      },
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Invalid email or password.");
  });

  test("POST /api/auth/login - Rejects nonexistent email", async () => {
    const res = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/login",
      body: {
        email: "unknown@example.com",
        password: "Password123!",
      },
    });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.message, "Invalid email or password.");
  });

  test("POST /api/auth/login - Successful login issues tokens and cookie", async () => {
    await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "Bob",
        lastName: "Smith",
        email: "bob@example.com",
        password: "Password123!",
      },
    });

    const res = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/login",
      body: {
        email: "bob@example.com",
        password: "Password123!",
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.strictEqual(res.body.data.user.email, "bob@example.com");
    assert.ok(res.cookies[0].includes("refreshToken="));
  });

  // =========================================================================
  // 5. Authenticated /me and Profile Immutability
  // =========================================================================
  test("GET /api/auth/me - Authenticated profile lookup", async () => {
    const regRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "Alice",
        lastName: "Wonder",
        email: "alice@example.com",
        password: "Password123!",
      },
    });

    const token = regRes.body.data.accessToken;

    const meRes = await mockRequest(app, {
      method: "GET",
      url: "/api/auth/me",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.success, true);
    assert.strictEqual(meRes.body.data.email, "alice@example.com");
    assert.strictEqual(meRes.body.data.password, undefined);
  });

  test("PATCH /api/auth/profile - Updates preferences and ensures registered email is immutable", async () => {
    const regRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "Alice",
        lastName: "Wonder",
        email: "alice_profile@example.com",
        password: "Password123!",
      },
    });

    const token = regRes.body.data.accessToken;

    const updateRes = await mockRequest(app, {
      method: "PATCH",
      url: "/api/auth/profile",
      headers: {
        authorization: `Bearer ${token}`,
      },
      body: {
        firstName: "Alicia",
        baseCurrency: "GBP",
        theme: "dark",
        email: "hacker@example.com", // Attempt to tamper with email
      },
    });

    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.data.firstName, "Alicia");
    assert.strictEqual(updateRes.body.data.baseCurrency, "GBP");
    assert.strictEqual(updateRes.body.data.theme, "dark");
    assert.strictEqual(
      updateRes.body.data.email,
      "alice_profile@example.com",
      "Email must remain unchanged"
    );
  });

  test("POST /api/auth/onboarding/complete - Persists onboarding completion", async () => {
    const regRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "Riley",
        lastName: "Taylor",
        email: "riley_onboarding@example.com",
        password: "Password123!",
      },
    });
    const token = regRes.body.data.accessToken;

    const completeRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/onboarding/complete",
      headers: { authorization: `Bearer ${token}` },
    });

    assert.strictEqual(completeRes.status, 200);
    assert.strictEqual(completeRes.body.data.onboardingCompleted, true);
  });

  // =========================================================================
  // 6. Refresh Token Rotation & Reuse Detection
  // =========================================================================
  test("POST /api/auth/refresh - Rotates tokens and invalidates all sessions on reuse", async () => {
    const regRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "Charlie",
        lastName: "Brown",
        email: "charlie@example.com",
        password: "Password123!",
      },
    });

    const originalCookie = regRes.cookies[0].split(";")[0];

    // First rotation (Valid)
    const refreshRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/refresh",
      cookies: originalCookie,
    });

    assert.strictEqual(refreshRes.status, 200);
    assert.strictEqual(refreshRes.body.success, true);
    assert.ok(refreshRes.body.data.accessToken);

    const rotatedCookie = refreshRes.cookies[0].split(";")[0];
    assert.notStrictEqual(originalCookie, rotatedCookie, "Token must be rotated");

    // Reuse old token (Reuse Attack Simulation)
    const reuseRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/refresh",
      cookies: originalCookie,
    });

    assert.strictEqual(reuseRes.status, 403);
    assert.strictEqual(reuseRes.body.success, false);
    assert.ok(reuseRes.body.message.includes("reused"));

    // Verify all sessions were revoked
    for (const session of mockDb.sessions.values()) {
      assert.ok(session.revokedAt, "All sessions must be revoked");
    }
  });

  // =========================================================================
  // 7. Device Logout & Logout All Devices
  // =========================================================================
  test("POST /api/auth/logout - Current device logout clears cookie and revokes session", async () => {
    const regRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "Dev",
        lastName: "One",
        email: "dev@example.com",
        password: "Password123!",
      },
    });

    const cookie = regRes.cookies[0].split(";")[0];

    const logoutRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/logout",
      cookies: cookie,
    });

    assert.strictEqual(logoutRes.status, 200);
    assert.ok(logoutRes.cookies[0].includes("Max-Age=0"), "Cookie must be cleared");
  });

  test("POST /api/auth/logout-all - Invalidates all active user sessions across devices", async () => {
    const regRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "Multi",
        lastName: "Device",
        email: "multi@example.com",
        password: "Password123!",
      },
    });

    const token = regRes.body.data.accessToken;

    const logoutAllRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/logout-all",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.strictEqual(logoutAllRes.status, 200);
    assert.strictEqual(logoutAllRes.body.message, "Logged out successfully from all devices.");
  });

  // =========================================================================
  // 8. Password Reset, Expiry, and Reuse Prevention
  // =========================================================================
  test("POST /api/auth/forgot-password & reset-password - Complete flow with token expiry and reuse check", async () => {
    await mockRequest(app, {
      method: "POST",
      url: "/api/auth/register",
      body: {
        firstName: "Reset",
        lastName: "User",
        email: "reset@example.com",
        password: "OldPassword123!",
      },
    });

    // Request reset
    const forgotRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/forgot-password",
      body: {
        email: "reset@example.com",
      },
    });

    assert.strictEqual(forgotRes.status, 200);

    // Fetch user from mock DB
    let user;
    for (const u of mockDb.users.values()) {
      if (u.email === "reset@example.com") {
        user = u;
        break;
      }
    }
    assert.ok(user.passwordResetTokenHash, "Reset token hash must be generated and stored");

    // Test with known token
    const testResetToken = "valid_reset_secret_token_123456";
    user.passwordResetTokenHash = hashToken(testResetToken);
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

    // Reset password successfully
    const resetRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      body: {
        token: testResetToken,
        newPassword: "BrandNewPassword123!",
      },
    });

    assert.strictEqual(resetRes.status, 200);
    assert.strictEqual(resetRes.body.success, true);

    // Verify token reuse fails
    const reuseResetRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      body: {
        token: testResetToken,
        newPassword: "AnotherNewPassword123!",
      },
    });
    assert.strictEqual(reuseResetRes.status, 400);

    // Verify expired token fails
    user.passwordResetTokenHash = hashToken("expired_token");
    user.passwordResetExpires = new Date(Date.now() - 5000); // 5 sec expired

    const expiredResetRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/reset-password",
      body: {
        token: "expired_token",
        newPassword: "BrandNewPassword123!",
      },
    });
    assert.strictEqual(expiredResetRes.status, 400);

    // Verify login with new password succeeds
    const newLoginRes = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/login",
      body: {
        email: "reset@example.com",
        password: "BrandNewPassword123!",
      },
    });
    assert.strictEqual(newLoginRes.status, 200);
  });

  // =========================================================================
  // 9. Google Authentication Flow
  // =========================================================================
  test("POST /api/auth/google - Authenticates and provisions verified Google accounts", async () => {
    const originalVerify = googleAuth.verifyGoogleIdToken;
    googleAuth.verifyGoogleIdToken = async (idToken) => {
      if (idToken === "valid_google_token") {
        return {
          googleId: "google_sub_123456",
          email: "googleuser@example.com",
          firstName: "Google",
          lastName: "User",
          profileImage: "https://example.com/photo.jpg",
        };
      }
      throw new Error("Invalid token signature");
    };

    const res = await mockRequest(app, {
      method: "POST",
      url: "/api/auth/google",
      body: {
        idToken: "valid_google_token",
      },
    });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.ok(res.body.data.accessToken);
    assert.strictEqual(res.body.data.user.email, "googleuser@example.com");
    assert.strictEqual(res.body.data.user.authProvider, "google");
    assert.strictEqual(res.body.data.user.onboardingCompleted, false);

    googleAuth.verifyGoogleIdToken = originalVerify;
  });

  // =========================================================================
  // 10. Removed Email Verification and Email Change Endpoints (404)
  // =========================================================================
  test("Endpoints /verify-email, /resend-verification, /request-email-change, /verify-email-change return 404 Not Found", async () => {
    const endpoints = [
      { method: "POST", url: "/api/auth/verify-email" },
      { method: "POST", url: "/api/auth/resend-verification" },
      { method: "POST", url: "/api/auth/request-email-change" },
      { method: "POST", url: "/api/auth/verify-email-change" },
    ];

    for (const ep of endpoints) {
      const res = await mockRequest(app, {
        method: ep.method,
        url: ep.url,
        body: { dummy: "data" },
      });
      assert.strictEqual(res.status, 404, `Endpoint ${ep.url} must return 404 Not Found`);
    }
  });
});
