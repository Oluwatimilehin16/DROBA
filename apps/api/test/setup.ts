// Runs before each test file's imports, so env.ts sees these values.
process.env.NODE_ENV = "test";
process.env.EMAIL_PROVIDER = "console";
process.env.RATE_LIMIT_DISABLED ??= "true";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-that-is-at-least-32-chars";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-that-is-at-least-32-chars";
process.env.DATABASE_URL ??= "postgresql://droba:droba@localhost:5432/droba_test?schema=public";
process.env.REDIS_URL ??= "redis://localhost:6379/1";
