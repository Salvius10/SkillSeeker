# Graph Report - .  (2026-06-26)

## Corpus Check
- Corpus is ~11,903 words - fits in a single context window. You may not need a graph.

## Summary
- 228 nodes · 307 edges · 11 communities
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Frontend API & Navigation|Frontend API & Navigation]]
- [[_COMMUNITY_Admin Dashboard Pages|Admin Dashboard Pages]]
- [[_COMMUNITY_Backend Dependencies & Config|Backend Dependencies & Config]]
- [[_COMMUNITY_Backend Routes & Middleware|Backend Routes & Middleware]]
- [[_COMMUNITY_Frontend Types & Data Layer|Frontend Types & Data Layer]]
- [[_COMMUNITY_Platform Architecture Docs|Platform Architecture Docs]]
- [[_COMMUNITY_Frontend Dependencies & Config|Frontend Dependencies & Config]]
- [[_COMMUNITY_Frontend TypeScript Config|Frontend TypeScript Config]]
- [[_COMMUNITY_Backend TypeScript Config|Backend TypeScript Config]]
- [[_COMMUNITY_Challenge Browse & Submit|Challenge Browse & Submit]]
- [[_COMMUNITY_Backend Type Definitions|Backend Type Definitions]]

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 14 edges
2. `Skill Seeker Platform` - 13 edges
3. `compilerOptions` - 11 edges
4. `useAuth()` - 11 edges
5. `supabase` - 9 edges
6. `requireAuth()` - 9 edges
7. `scripts` - 4 edges
8. `requireAdmin()` - 4 edges
9. `scripts` - 4 edges
10. `Submission Approval Flow` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Social and UI Icon Sprite Sheet` --semantically_similar_to--> `Inline React Styling System`  [INFERRED] [semantically similar]
  frontend/public/icons.svg → CLAUDE.md
- `Skill Seeker Brand Logo` --references--> `Skill Seeker Platform`  [INFERRED]
  frontend/public/favicon.svg → CLAUDE.md
- `Frontend HTML Entry Point` --references--> `Skill Seeker Brand Logo`  [EXTRACTED]
  frontend/index.html → frontend/public/favicon.svg
- `App()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/App.tsx → frontend/src/context/AuthContext.tsx
- `TopNav()` --calls--> `useAuth()`  [EXTRACTED]
  frontend/src/components/TopNav.tsx → frontend/src/context/AuthContext.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Submission Approval Multi-Step Transaction** — skillseeker_claude_submissions_route, skillseeker_claude_increment_points_rpc, skillseeker_claude_news_route, skillseeker_claude_notifications_route [EXTRACTED 1.00]
- **Authentication System** — skillseeker_claude_jwt_authentication, skillseeker_claude_authcontext, skillseeker_claude_auth_route [INFERRED 0.95]
- **Frontend Static Assets and Entry Point** — frontend_index_html, public_favicon_svg, public_icons_svg [INFERRED 0.85]

## Communities (11 total, 0 thin omitted)

### Community 0 - "Frontend API & Navigation"
Cohesion: 0.07
Nodes (29): getMe(), getNews(), login(), reactToPost(), register(), navBtn(), Page, Props (+21 more)

### Community 1 - "Admin Dashboard Pages"
Cohesion: 0.08
Nodes (17): STATUS_STYLE, inp, lbl, Props, sel, Props, api, createChallenge() (+9 more)

### Community 2 - "Backend Dependencies & Config"
Cohesion: 0.07
Nodes (26): author, dependencies, bcryptjs, cors, dotenv, express, jsonwebtoken, @supabase/supabase-js (+18 more)

### Community 3 - "Backend Routes & Middleware"
Cohesion: 0.23
Nodes (12): requireAdmin(), requireAuth(), router, router, router, router, router, router (+4 more)

### Community 4 - "Frontend Types & Data Layer"
Cohesion: 0.11
Nodes (14): getLeaderboard(), getProfile(), Challenge, NewsPost, Notification, Submission, User, PODIUM_STYLES (+6 more)

### Community 5 - "Platform Architecture Docs"
Cohesion: 0.13
Nodes (19): Frontend HTML Entry Point, Skill Seeker Brand Logo, Social and UI Icon Sprite Sheet, analytics.ts Express Route (/analytics), auth.ts Express Route (/auth), AuthContext State Manager, challenges.ts Express Route (/challenges), increment_points Supabase RPC (+11 more)

### Community 6 - "Frontend Dependencies & Config"
Cohesion: 0.11
Nodes (18): dependencies, axios, lucide-react, react, react-dom, devDependencies, @types/react, @types/react-dom (+10 more)

### Community 7 - "Frontend TypeScript Config"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, jsx, lib, module, moduleDetection, moduleResolution, noEmit (+7 more)

### Community 8 - "Backend TypeScript Config"
Cohesion: 0.14
Nodes (13): compilerOptions, esModuleInterop, forceConsistentCasingInFileNames, lib, module, outDir, resolveJsonModule, rootDir (+5 more)

### Community 9 - "Challenge Browse & Submit"
Cohesion: 0.25
Nodes (5): submitChallenge(), Challenges(), filterBtn(), Props, TAG_STYLE

### Community 10 - "Backend Type Definitions"
Cohesion: 0.25
Nodes (7): Challenge, NewsPost, Notification, Submission, User, JwtPayload, Request

## Knowledge Gaps
- **114 isolated node(s):** `name`, `version`, `main`, `dev`, `build` (+109 more)
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Are the 4 inferred relationships involving `Skill Seeker Platform` (e.g. with `Skill Seeker Brand Logo` and `Inline React Styling System`) actually correct?**
  _`Skill Seeker Platform` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `main` to the rest of the system?**
  _114 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend API & Navigation` be split into smaller, more focused modules?**
  _Cohesion score 0.06829268292682927 - nodes in this community are weakly interconnected._
- **Should `Admin Dashboard Pages` be split into smaller, more focused modules?**
  _Cohesion score 0.07956989247311828 - nodes in this community are weakly interconnected._
- **Should `Backend Dependencies & Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Frontend Types & Data Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._
- **Should `Platform Architecture Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.1286549707602339 - nodes in this community are weakly interconnected._