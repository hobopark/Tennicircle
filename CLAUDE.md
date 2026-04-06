@AGENTS.md

<!-- GSD:project-start source:PROJECT.md -->
## Project

**TenniCircle**

TenniCircle is a tennis community management platform that replaces the fragmented spreadsheet-and-group-chat workflow used by tennis coaches and community organisers. It provides integrated session booking, player management, and community event organisation in one place. The first customer is Jaden, a head coach running a Sydney-based tennis community, with co-founder Joon Park building the product.

**Core Value:** Coaches can schedule sessions and members can RSVP — replacing spreadsheets entirely. If Jaden stops needing his spreadsheet, it's working.

### Constraints

- **Tech stack**: Next.js App Router + Supabase + Vercel — decided, non-negotiable
- **Architecture**: Must keep API layer clean for future React Native frontend; prefer client-side auth flows
- **Multi-tenancy**: Data model must support multiple communities from the start
- **Mobile**: Web-first, mobile-responsive from day one; no native app for MVP
- **Payments**: No payment processing in MVP
<!-- GSD:project-end -->

<!-- GSD:stack-start source:codebase/STACK.md -->
## Technology Stack

## Languages
- TypeScript 5 - Frontend and application code
- JavaScript (ES2017 target) - Build configuration and runtime
- CSS (Tailwind CSS) - Styling
## Runtime
- Node.js 25.8.1
- npm 11.11.0
- Lockfile: `package-lock.json` (present)
## Frameworks
- Next.js 16.2.2 - Full-stack React framework with app router
- React 19.2.4 - UI component library
- React DOM 19.2.4 - DOM rendering
- Tailwind CSS 4 - Utility-first CSS framework
- @tailwindcss/postcss 4 - PostCSS plugin for Tailwind
- PostCSS - CSS transformation (via postcss.config.mjs)
- ESLint 9 - Code linting
- eslint-config-next 16.2.2 - Next.js ESLint config
## Key Dependencies
- @supabase/supabase-js 2.101.1 - Supabase client SDK for database and auth
- @supabase/ssr 0.10.0 - Server-side rendering support for Supabase
- @types/node 20 - Node.js type definitions
- @types/react 19 - React type definitions
- @types/react-dom 19 - React DOM type definitions
## Configuration
- `.env.local` - Local environment configuration
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- `next.config.ts` - Next.js build configuration (currently empty)
- `tsconfig.json` - TypeScript compiler options
- `postcss.config.mjs` - PostCSS configuration
- `eslint.config.mjs` - ESLint flat config with Next.js core web vitals and TypeScript support
## Platform Requirements
- Node.js 25.x (or compatible)
- npm 11.x
- Compatible with Vercel deployment (references in boilerplate suggest Vercel as target)
- Next.js 16+ compatible Node.js runtime
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

## Naming Patterns
- TSX components use PascalCase: `layout.tsx`, `page.tsx`
- Lowercase filenames for page and layout files in Next.js app directory (e.g., `page.tsx`, `layout.tsx`)
- Exported React components use PascalCase: `RootLayout`, `Home`
- Function declarations use camelCase for internal functions
- Arrow functions used for component definition: `export default function RootLayout(...) {}`
- camelCase for local variables and constants: `geistSans`, `geistMono`, `children`
- Type imports use `type` keyword explicitly: `import type { Metadata } from "next"`
- TypeScript strict mode enabled
- Readonly types used for immutable props: `Readonly<{ children: React.ReactNode }>`
- Explicit type annotations on exported metadata: `export const metadata: Metadata`
## Code Style
- ESLint 9.x with flat config system (eslint.config.mjs)
- No Prettier configuration detected - relies on ESLint for code formatting
- Indentation: 2 spaces (standard for JavaScript/TypeScript)
- ESLint config uses Next.js presets: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Global ignores configured in `eslint.config.mjs`: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Location: `eslint.config.mjs`
## Import Organization
- `@/*` maps to `./src/*` (configured in `tsconfig.json` paths)
- Used for clean imports of source code throughout the app
## Error Handling
- Limited error handling patterns visible in current codebase (only basic application setup)
- No explicit error boundary components detected
- No try-catch blocks in visible source files
## Logging
- No logging framework currently in use
- Standard `console` methods would be available if needed
## Comments
- No JSDoc/TSDoc comments in current implementation
- Code is self-documenting through clear naming and type annotations
- Not observed in current codebase
- TypeScript type system provides documentation through type signatures
## Function Design
- `RootLayout` wraps children with HTML structure and font configuration
- `Home` component renders full page layout
- Destructured props with TypeScript types
- Props are immediately available at function scope
- Example: `{ children }` destructured from props in `RootLayout`
- All components return JSX elements
- No explicit return type annotations (inferred from React component context)
## Module Design
- Default exports for page/layout components: `export default function RootLayout(...) {}`
- Named exports for configuration: `export const metadata: Metadata`
- Components structured around Next.js App Router conventions
- Not observed in current project structure
- Project uses Next.js app directory routing (pages are co-located with layout.tsx)
## Component Patterns
- Server Components used by default (no `use client` directive in visible files)
- Static metadata export pattern: `export const metadata: Metadata = { ... }`
- Next.js Image component used: `<Image>` with required props (src, alt, width, height)
- Type-safe children prop: `Readonly<{ children: React.ReactNode }>`
- Tailwind CSS v4 with PostCSS integration
- Utility-first className approach: `className="flex flex-col items-center ..."`
- CSS custom properties defined in `globals.css` for theme variables
- Dark mode support via media query: `@media (prefers-color-scheme: dark)`
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

## Pattern Overview
- File-based routing using Next.js 16 App Router convention
- TypeScript-first development with strict type checking
- Component-driven architecture with React 19
- Server-side rendering by default (RSC) with client-side hydration
- Tailwind CSS for styling with responsive design
- No external API layer currently implemented (Supabase SDK installed but unused)
## Layers
- Purpose: Define page structure and navigation hierarchy using Next.js file-based routing
- Location: `src/app/`
- Contains: Root layout component, page components, CSS globals
- Depends on: React, Next.js framework utilities (Image, Metadata, fonts)
- Used by: Browser/client (all public routes)
- Purpose: Reusable React components for rendering UI
- Location: `src/app/` (currently co-located with pages)
- Contains: Layout, page root components
- Depends on: React, Tailwind CSS classes
- Used by: Page components
- Purpose: Global styles and design system
- Location: `src/app/globals.css`
- Contains: CSS variables, Tailwind theme customization, color scheme definitions
- Depends on: Tailwind CSS framework
- Used by: All pages and components via className attributes
## Data Flow
- Application is in bootstrap phase with no active data flow
- No database queries or API calls currently implemented
- Supabase SDK (`@supabase/supabase-js`, `@supabase/ssr`) installed but not integrated
- Currently minimal - no state management library in use
- State would be component-local using React hooks if needed
- No global state context visible in codebase
## Key Abstractions
- Purpose: File-based routing and page structure
- Examples: `src/app/page.tsx` (home route), `src/app/layout.tsx` (root layout)
- Pattern: File system becomes URL structure; default exports are route handlers
- Purpose: Shared structure across pages
- Examples: `RootLayout` in `src/app/layout.tsx`
- Pattern: Exported layout components wrap `children` prop for nested route segments
- Purpose: Optimize and load Google Fonts
- Examples: Geist, Geist_Mono from `next/font/google`
- Pattern: Instantiate fonts with subsets, attach CSS variables to html element
## Entry Points
- Location: `src/app/page.tsx`
- Triggers: HTTP GET to `/`
- Responsibilities: Renders home page with instructional content and links; exports default `Home` function
- Location: `src/app/layout.tsx`
- Triggers: Wraps all routes in the application
- Responsibilities: Sets document metadata (title, description); configures fonts; wraps children with html/body tags; applies global CSS classes
## Error Handling
- No custom error boundaries visible
- No error.tsx or not-found.tsx error handling routes
- Unhandled errors will show Next.js default error page in development or generic 500 in production
## Cross-Cutting Concerns
<!-- GSD:architecture-end -->

<!-- GSD:skills-start source:skills/ -->
## Project Skills

No project skills found. Add skills to any of: `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, or `.github/skills/` with a `SKILL.md` index file.
<!-- GSD:skills-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
