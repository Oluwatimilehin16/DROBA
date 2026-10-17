/* Must be the first import: scrypt password hashing runs on libuv's thread pool, which is sized on first use. */
process.env.UV_THREADPOOL_SIZE ??= "16";
export {};
