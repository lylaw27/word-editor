# Migration from Vite to Next.js + Electron

This project has been successfully migrated from Vite to Next.js with Electron integration.

## What Changed

### Dependencies
- **Removed**: `vite`, `@vitejs/plugin-react`, `vite-plugin-electron`, `vite-plugin-electron-renderer`
- **Added**: `next` (15.3.2), `electron-serve`, `electron-is-dev`
- **Updated**: `react` and `react-dom` to version 19

### Project Structure
- **Before**: Used Vite with `src/main.tsx` as entry point
- **After**: Uses Next.js App Router with `app/` directory structure

```
app/
├── layout.tsx         # Root layout with metadata
├── page.tsx          # Home page wrapping the App component
└── globals.css       # Global styles (formerly src/index.css)
```

### Configuration Files

#### New Files
- `next.config.js` - Next.js configuration with static export
- `electron/tsconfig.json` - TypeScript config for Electron main process
- `app/layout.tsx` - Next.js root layout
- `app/page.tsx` - Next.js home page

#### Modified Files
- `tsconfig.json` - Updated for Next.js with App Router
- `tailwind.config.js` - Updated content paths for Next.js
- `electron/main.ts` - Updated to use `electron-serve` and `electron-is-dev`
- `package.json` - Updated scripts and dependencies

#### Removed Files
- `vite.config.ts`
- `vite.config.web.ts`
- `src/main.tsx`
- `src/vite-env.d.ts`
- `server.ts` (web-only server)

### Scripts
- `dev` - Run Next.js dev server
- `build` - Build Next.js static export
- `start` - Start Next.js production server
- `electron:dev` - Run Electron with Next.js dev server
- `electron:build` - Build both Next.js and Electron app

## Development

### Install Dependencies
```bash
npm install --legacy-peer-deps
```

Note: The `--legacy-peer-deps` flag is required due to peer dependency conflicts with `@parallel-web/ai-sdk-tools`.

### Run Development Mode
```bash
npm run electron:dev
```

This will:
1. Start Next.js dev server on port 3000
2. Wait for the server to be ready
3. Compile Electron TypeScript files
4. Launch Electron app

### Build for Production
```bash
npm run electron:build
```

This will:
1. Build Next.js static export to `out/` directory
2. Compile Electron TypeScript to `dist-electron/`
3. Package the app with electron-builder

## Key Technical Changes

### Electron Integration
The Electron main process now uses:
- `electron-serve` to serve the Next.js static build in production
- `electron-is-dev` to detect development vs production mode
- Port 3000 for Next.js dev server (was 5173 with Vite)

### Build Output
- **Development**: Next.js runs on `http://localhost:3000`
- **Production**: Static files exported to `out/` directory (was `dist/`)

### React Components
All React components remain in `src/` directory but use `@/` path alias for imports. The main `App` component is now in `src/components/App.tsx` and is imported by `app/page.tsx`.

### TypeScript Configuration
- Main tsconfig.json configured for Next.js App Router
- Separate electron/tsconfig.json for Electron main process compilation

## Benefits of Next.js

1. **Better Performance**: Automatic code splitting and optimization
2. **Improved Developer Experience**: Fast Refresh, better error messages
3. **Future-Ready**: Easy to add SSR or API routes if needed
4. **Better TypeScript Support**: First-class TypeScript integration
5. **Larger Ecosystem**: More plugins and community support

## Troubleshooting

### Port Already in Use
If port 3000 is already in use, modify the `electron:dev` script in `package.json` to use a different port:
```json
"electron:dev": "concurrently \"next dev -p 3001\" \"wait-on http://localhost:3001 && ...\""
```
And update `electron/main.ts` accordingly.

### TypeScript Errors
Make sure all TypeScript files use the correct import paths with `@/` prefix for absolute imports from `src/` or `app/` directories.

### Build Errors
If the build fails, try:
1. Delete `node_modules`, `out/`, `.next/`, and `dist-electron/`
2. Run `npm install --legacy-peer-deps`
3. Run `npm run electron:build` again
