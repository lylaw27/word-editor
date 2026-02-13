/**
 * Standalone API server entry point for web mode.
 * Run with: npx tsx server.ts
 */
import { createAPIServer } from './electron/api-server';

const port = parseInt(process.env.API_PORT || '3001', 10);
createAPIServer(port);
