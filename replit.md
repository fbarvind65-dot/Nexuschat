# NexusChat

A mobile-friendly messaging web app with Firebase Authentication and Firestore-backed conversations.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- NexusChat uses the Firebase web configuration in `artifacts/nexuschat/src/firebase.ts`.
- The separate API and Drizzle workspace scaffolding is not used by the chat client; configure `DATABASE_URL` only when intentionally running the PostgreSQL API/database tasks.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/nexuschat/src/App.tsx` — main chat, authentication, contacts, updates, and group UI.
- `artifacts/nexuschat/src/firebase.ts` — Firebase app, Auth, and Firestore initialization.
- `artifacts/nexuschat/src/Settings.tsx` — settings screen.
- `artifacts/nexuschat/src/artifacts/nexuschat/src/callService.ts` — WebRTC call signaling helpers.
- `artifacts/mockup-sandbox` — isolated component-preview sandbox; its sample conversations are not live app data.

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

NexusChat currently provides email/password account access, registered-contact discovery, personal Firestore conversations, owner-managed groups, and a basic updates feed. Calling, communities, broadcast lists, and several Settings categories still need implementation.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
