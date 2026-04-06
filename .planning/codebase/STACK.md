# Technology Stack

**Analysis Date:** 2026-04-06

## Languages

**Primary:**
- TypeScript 5 - Frontend and application code
- JavaScript (ES2017 target) - Build configuration and runtime

**Secondary:**
- CSS (Tailwind CSS) - Styling

## Runtime

**Environment:**
- Node.js 25.8.1

**Package Manager:**
- npm 11.11.0
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.2.2 - Full-stack React framework with app router
- React 19.2.4 - UI component library
- React DOM 19.2.4 - DOM rendering

**Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- @tailwindcss/postcss 4 - PostCSS plugin for Tailwind

**Build/Dev:**
- PostCSS - CSS transformation (via postcss.config.mjs)
- ESLint 9 - Code linting
- eslint-config-next 16.2.2 - Next.js ESLint config

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.101.1 - Supabase client SDK for database and auth
- @supabase/ssr 0.10.0 - Server-side rendering support for Supabase

**Type Definitions:**
- @types/node 20 - Node.js type definitions
- @types/react 19 - React type definitions
- @types/react-dom 19 - React DOM type definitions

## Configuration

**Environment:**
- `.env.local` - Local environment configuration
- Required vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser

**Build:**
- `next.config.ts` - Next.js build configuration (currently empty)
- `tsconfig.json` - TypeScript compiler options
  - Target: ES2017
  - Path alias: `@/*` → `./src/*`
  - JSX: react-jsx
- `postcss.config.mjs` - PostCSS configuration
- `eslint.config.mjs` - ESLint flat config with Next.js core web vitals and TypeScript support

## Platform Requirements

**Development:**
- Node.js 25.x (or compatible)
- npm 11.x

**Production:**
- Compatible with Vercel deployment (references in boilerplate suggest Vercel as target)
- Next.js 16+ compatible Node.js runtime

---

*Stack analysis: 2026-04-06*
