/* Local development: read the repo-root .env (real environment variables always win). */
if (process.env.NODE_ENV !== "production") {
  for (const file of [".env", "../../.env"]) {
    try {
      process.loadEnvFile(file);
      break;
    } catch {
      /* not there */
    }
  }
}
export {};
