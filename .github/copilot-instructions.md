# Gut Community - AI Coding Guidelines

## Architecture Overview
This is a Next.js 16 app using the App Router for a gut health community platform. It features recipes, forum discussions, and user profiles for conditions like IBS and Crohn's.

- **Frontend**: React 19 with TypeScript, Tailwind CSS v4 for styling
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Routing**: App Router with server components for data fetching, client components for interactivity
- **Auth**: Supabase Auth with email/password, protected routes via middleware in `proxy.ts`

Key directories:
- `app/`: Pages and layouts (App Router)
- `lib/supabase/`: Client/server Supabase setup
- `lib/ingredients/`: Recipe ingredient parsing utilities
- `components/`: Reusable UI components

## Data Model
Core Supabase tables:
- `recipes`: Recipe data with status (draft/published)
- `recipe_tags`: Tag definitions
- `recipe_tag_map`: Many-to-many recipe-tag relationships
- `recipe_favorites`: User-recipe saves
- `forum_posts`: Discussion posts
- `profiles`: User profiles with display_name and role (user/moderator/admin/doctor)

Use Supabase client/server functions from `lib/supabase/` for all database operations.

## Authentication & Authorization
- Auth handled via Supabase in `proxy.ts` middleware
- Public routes: `/login`, `/signup`, `/verify`, `/auth/callback`
- Protected routes require authenticated user with confirmed email
- User roles displayed as badges in forum (see `app/forum/page.tsx`)

## Component Patterns
- Server components for initial data loads (e.g., `app/recipes/page.tsx` fetches recipes)
- Client components for interactivity (e.g., `SaveToggle.tsx` for favorites)
- Use `createClient()` for browser operations, `createServerClient()` for SSR
- State management: React hooks, no external libraries

## Recipes Feature
- Ingredient parsing in `lib/ingredients/parse.ts` handles quantities/units
- Tag filtering via `recipe_tag_map` joins
- Favorites stored in `recipe_favorites` table
- Drafts visible only to creator

## Development Workflow
- `npm run dev`: Start dev server
- `npm run build`: Production build
- `npm run lint`: ESLint checks
- No tests currently implemented
- Environment: Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Code Style
- TypeScript strict mode
- Tailwind utility classes for styling
- Async/await for Supabase queries
- Error handling: Display user-friendly messages, log errors
- File structure: Colocate components near usage (e.g., `app/recipes/SaveToggle.tsx`)

## Common Patterns
- Fetch user: `const { data: { user } } = await supabase.auth.getUser()`
- Join profiles: `profiles!table_created_by_fkey(display_name,role)`
- Tag filtering: Query `recipe_tag_map` then filter recipes
- Redirects: Use `NextResponse.redirect()` in middleware/routes</content>
<parameter name="filePath">c:\Users\danny\gut-community\.github\copilot-instructions.md