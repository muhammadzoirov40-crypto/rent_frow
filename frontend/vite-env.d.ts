/// <reference types="vite/client" />

// Injected at build time by vite.config.ts — one id per build, matched
// against version.json so an open tab can tell a newer build went live.
declare const __BUILD_ID__: string;
