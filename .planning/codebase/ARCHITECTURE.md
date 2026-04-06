# Architecture

**Analysis Date:** 2026-04-06

## Pattern Overview

**Overall:** Next.js App Router with React Server Components (RSC)

**Key Characteristics:**
- File-based routing using Next.js 16 App Router convention
- TypeScript-first development with strict type checking
- Component-driven architecture with React 19
- Server-side rendering by default (RSC) with client-side hydration
- Tailwind CSS for styling with responsive design
- No external API layer currently implemented (Supabase SDK installed but unused)

## Layers

**Layout & Pages (App Router):**
- Purpose: Define page structure and navigation hierarchy using Next.js file-based routing
- Location: `src/app/`
- Contains: Root layout component, page components, CSS globals
- Depends on: React, Next.js framework utilities (Image, Metadata, fonts)
- Used by: Browser/client (all public routes)

**UI Components:**
- Purpose: Reusable React components for rendering UI
- Location: `src/app/` (currently co-located with pages)
- Contains: Layout, page root components
- Depends on: React, Tailwind CSS classes
- Used by: Page components

**Styling:**
- Purpose: Global styles and design system
- Location: `src/app/globals.css`
- Contains: CSS variables, Tailwind theme customization, color scheme definitions
- Depends on: Tailwind CSS framework
- Used by: All pages and components via className attributes

## Data Flow

**Current State:**
- Application is in bootstrap phase with no active data flow
- No database queries or API calls currently implemented
- Supabase SDK (`@supabase/supabase-js`, `@supabase/ssr`) installed but not integrated

**Page Rendering Flow:**

1. Browser requests `/` (root path)
2. Next.js routes to `src/app/page.tsx` (default export as Home component)
3. Root layout (`src/app/layout.tsx`) wraps the page component
4. React Server Components evaluate on server
5. HTML + React hydration script sent to browser
6. Client-side interactivity activated

**State Management:**
- Currently minimal - no state management library in use
- State would be component-local using React hooks if needed
- No global state context visible in codebase

## Key Abstractions

**Next.js App Router:**
- Purpose: File-based routing and page structure
- Examples: `src/app/page.tsx` (home route), `src/app/layout.tsx` (root layout)
- Pattern: File system becomes URL structure; default exports are route handlers

**Layout Component Hierarchy:**
- Purpose: Shared structure across pages
- Examples: `RootLayout` in `src/app/layout.tsx`
- Pattern: Exported layout components wrap `children` prop for nested route segments

**Font Management:**
- Purpose: Optimize and load Google Fonts
- Examples: Geist, Geist_Mono from `next/font/google`
- Pattern: Instantiate fonts with subsets, attach CSS variables to html element

## Entry Points

**Root Page:**
- Location: `src/app/page.tsx`
- Triggers: HTTP GET to `/`
- Responsibilities: Renders home page with instructional content and links; exports default `Home` function

**Root Layout:**
- Location: `src/app/layout.tsx`
- Triggers: Wraps all routes in the application
- Responsibilities: Sets document metadata (title, description); configures fonts; wraps children with html/body tags; applies global CSS classes

## Error Handling

**Strategy:** Not explicitly defined; relies on Next.js defaults

**Patterns:**
- No custom error boundaries visible
- No error.tsx or not-found.tsx error handling routes
- Unhandled errors will show Next.js default error page in development or generic 500 in production

## Cross-Cutting Concerns

**Logging:** Not implemented - no logging framework in use

**Validation:** Not implemented - no validation library in use

**Authentication:** Not implemented - no auth setup despite Supabase SDK presence

---

*Architecture analysis: 2026-04-06*
