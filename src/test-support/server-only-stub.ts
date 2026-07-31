// The real "server-only" package throws unconditionally outside Next.js's
// "react-server" resolve condition, which Vitest doesn't set — so any file
// with `import "server-only"` would throw the instant a test imports it.
// This no-op stub is aliased in vitest.config.mts so those files can be
// tested directly; it has no effect on the real Next.js build, which still
// resolves the real package and enforces the server-only boundary.
export {};
