# Codebase Structure

**Analysis Date:** 2026-04-06

## Directory Layout

```
tennicircle/
├── .git/                    # Git repository metadata
├── .next/                   # Next.js build output (generated)
├── .planning/               # GSD planning documents
│   └── codebase/            # Codebase analysis documents
├── .vercel/                 # Vercel deployment configuration
├── archive - DONT USE/      # Deprecated code (do not use)
├── node_modules/            # npm dependencies
├── public/                  # Static assets
│   ├── file.svg
│   ├── globe.svg
│   ├── next.svg
│   ├── vercel.svg
│   └── window.svg
├── src/                     # Source code
│   └── app/                 # Next.js App Router directory
│       ├── favicon.ico      # Favicon file
│       ├── globals.css      # Global styles
│       ├── layout.tsx       # Root layout component
│       └── page.tsx         # Home page component
├── .env.local               # Local environment variables (not committed)
├── .gitignore               # Git ignore rules
├── eslint.config.mjs        # ESLint configuration
├── next.config.ts           # Next.js configuration
├── package.json             # npm dependencies and scripts
├── package-lock.json        # npm lock file
├── postcss.config.mjs        # PostCSS configuration
├── README.md                # Project documentation
└── tsconfig.json            # TypeScript configuration
```

## Directory Purposes

**src/:**
- Purpose: All source code for the application
- Contains: Next.js App Router pages, layouts, components, and styles
- Key files: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**src/app/:**
- Purpose: Next.js App Router directory - file-based routing
- Contains: Route handlers (pages), layout wrappers, global styles
- Key files: `layout.tsx` (root layout), `page.tsx` (home page)

**public/:**
- Purpose: Static assets served directly to browser at root path
- Contains: SVG logos, images, favicons
- Key files: `next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`

**.next/:**
- Purpose: Build output from Next.js compilation
- Generated: Yes (created by `npm run build`)
- Committed: No (in .gitignore)

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: No (manually written)
- Committed: Yes (part of project repository)

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Home page component; default export rendered at `/` route
- `src/app/layout.tsx`: Root layout wrapper for all pages; sets metadata and global structure

**Configuration:**
- `tsconfig.json`: TypeScript compiler options; includes path alias `@/*` → `./src/*`
- `next.config.ts`: Next.js framework configuration (minimal, placeholder comments only)
- `eslint.config.mjs`: ESLint linting rules (Next.js core web vitals and TypeScript)
- `postcss.config.mjs`: PostCSS plugins for Tailwind CSS processing

**Core Logic:**
- `src/app/page.tsx`: Rendering logic for home page
- `src/app/layout.tsx`: Root document structure and metadata

**Styling:**
- `src/app/globals.css`: Global CSS variables, Tailwind imports, dark mode support
- Tailwind CSS configured in `postcss.config.mjs` and applied via className attributes

## Naming Conventions

**Files:**
- Layout files: `layout.tsx` (Next.js convention for layout wrapper components)
- Page files: `page.tsx` (Next.js convention for route page components)
- Error/special pages: `error.tsx`, `not-found.tsx`, `loading.tsx` (Next.js special file names)
- CSS: `globals.css` (global styles), `[name].module.css` (scoped module styles - not currently used)

**Directories:**
- App Router segments: lowercase, kebab-case (e.g., `app/about/page.tsx` for `/about`)
- Feature directories: not yet established (no multi-feature structure)

**Components:**
- React components: PascalCase (e.g., `Home`, `RootLayout`)
- Functions: camelCase (e.g., `geistSans`, `geistMono`)

**Variables & Types:**
- Type imports: `import type { Metadata } from "next"`
- CSS variables: kebab-case with `--` prefix (e.g., `--font-geist-sans`)

## Where to Add New Code

**New Page Route:**
- Create file: `src/app/[route-name]/page.tsx` (exports default React component)
- Layout wrapper: Add `src/app/[route-name]/layout.tsx` if segment-specific layout needed
- Example: `/about` route → `src/app/about/page.tsx`

**New Component/Module:**
- Recommended location: `src/components/` (currently non-existent, create if needed)
- Alternative: Co-locate with pages in `src/app/` if single-use
- Pattern: Export as named export; import in pages using path alias `@/components/...`

**Utilities/Helpers:**
- Location: `src/lib/` or `src/utils/` (create as needed)
- Usage: Import with path alias `@/lib/...` or `@/utils/...`
- Pattern: Export named functions; group by concern (e.g., `validation.ts`, `formatting.ts`)

**Global Styles/Theme:**
- Location: `src/app/globals.css`
- Approach: CSS variables at `:root`; use Tailwind `@theme` blocks

**API Routes (if needed):**
- Location: `src/app/api/[route]/route.ts`
- Pattern: Export HTTP method handlers (`GET`, `POST`, etc.) as named exports

## Special Directories

**archive - DONT USE/:**
- Purpose: Deprecated code - intentionally marked for non-use
- Generated: No
- Committed: Yes (preserved for historical reference)
- Action: Ignore this directory; do not reference or copy code from here

**.next/:**
- Purpose: Next.js build artifacts (compiled pages, static files)
- Generated: Yes (by `npm run build` and dev server)
- Committed: No (in .gitignore)
- Action: Do not modify; regenerated on build

**.vercel/:**
- Purpose: Vercel platform deployment configuration
- Generated: Yes (by Vercel CLI or platform)
- Committed: Yes
- Action: Update if changing deployment configuration

## Path Aliases

TypeScript path alias defined in `tsconfig.json`:
- `@/*` → `./src/*`

Usage:
```typescript
// Instead of: import { Component } from '../../../components/Button'
// Use: import { Component } from '@/components/Button'
```

## Suggested Structure for Growth

When adding features, establish this structure:

```
src/
├── app/                     # Next.js routes
├── components/              # Reusable UI components
│   ├── Layout.tsx
│   └── Footer.tsx
├── lib/                     # Utilities and helpers
│   ├── db.ts               # Database connection (if needed)
│   ├── auth.ts             # Authentication helpers
│   └── validators.ts       # Input validation
├── types/                   # TypeScript type definitions
│   └── index.ts
└── styles/                  # Additional stylesheets (if not in app/)
```

---

*Structure analysis: 2026-04-06*
