# Coding Conventions

**Analysis Date:** 2026-04-06

## Naming Patterns

**Files:**
- TSX components use PascalCase: `layout.tsx`, `page.tsx`
- Lowercase filenames for page and layout files in Next.js app directory (e.g., `page.tsx`, `layout.tsx`)

**Functions:**
- Exported React components use PascalCase: `RootLayout`, `Home`
- Function declarations use camelCase for internal functions
- Arrow functions used for component definition: `export default function RootLayout(...) {}`

**Variables:**
- camelCase for local variables and constants: `geistSans`, `geistMono`, `children`
- Type imports use `type` keyword explicitly: `import type { Metadata } from "next"`

**Types:**
- TypeScript strict mode enabled
- Readonly types used for immutable props: `Readonly<{ children: React.ReactNode }>`
- Explicit type annotations on exported metadata: `export const metadata: Metadata`

## Code Style

**Formatting:**
- ESLint 9.x with flat config system (eslint.config.mjs)
- No Prettier configuration detected - relies on ESLint for code formatting
- Indentation: 2 spaces (standard for JavaScript/TypeScript)

**Linting:**
- ESLint config uses Next.js presets: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Global ignores configured in `eslint.config.mjs`: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Location: `eslint.config.mjs`

## Import Organization

**Order:**
1. Next.js framework imports: `import type { Metadata } from "next"`, `import { Geist } from "next/font/google"`
2. Other React/library imports: `import Image from "next/image"`
3. Local/CSS imports: `import "./globals.css"`
4. Type imports use `type` keyword to ensure they are removed at runtime

**Path Aliases:**
- `@/*` maps to `./src/*` (configured in `tsconfig.json` paths)
- Used for clean imports of source code throughout the app

## Error Handling

**Patterns:**
- Limited error handling patterns visible in current codebase (only basic application setup)
- No explicit error boundary components detected
- No try-catch blocks in visible source files

## Logging

**Framework:** Not configured in current codebase

**Patterns:**
- No logging framework currently in use
- Standard `console` methods would be available if needed

## Comments

**When to Comment:**
- No JSDoc/TSDoc comments in current implementation
- Code is self-documenting through clear naming and type annotations

**JSDoc/TSDoc:**
- Not observed in current codebase
- TypeScript type system provides documentation through type signatures

## Function Design

**Size:** Functions are concise and focused
- `RootLayout` wraps children with HTML structure and font configuration
- `Home` component renders full page layout

**Parameters:** 
- Destructured props with TypeScript types
- Props are immediately available at function scope
- Example: `{ children }` destructured from props in `RootLayout`

**Return Values:**
- All components return JSX elements
- No explicit return type annotations (inferred from React component context)

## Module Design

**Exports:**
- Default exports for page/layout components: `export default function RootLayout(...) {}`
- Named exports for configuration: `export const metadata: Metadata`
- Components structured around Next.js App Router conventions

**Barrel Files:**
- Not observed in current project structure
- Project uses Next.js app directory routing (pages are co-located with layout.tsx)

## Component Patterns

**React/Next.js:**
- Server Components used by default (no `use client` directive in visible files)
- Static metadata export pattern: `export const metadata: Metadata = { ... }`
- Next.js Image component used: `<Image>` with required props (src, alt, width, height)
- Type-safe children prop: `Readonly<{ children: React.ReactNode }>`

**Styling:**
- Tailwind CSS v4 with PostCSS integration
- Utility-first className approach: `className="flex flex-col items-center ..."`
- CSS custom properties defined in `globals.css` for theme variables
- Dark mode support via media query: `@media (prefers-color-scheme: dark)`

---

*Convention analysis: 2026-04-06*
