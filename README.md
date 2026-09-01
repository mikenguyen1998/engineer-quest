# Engineer Quest

An engineering-practice app that turns challenge work into visible evidence. It supports frontend, backend, full-stack, and quality-engineering paths, with Supabase-backed evidence and progression.

## Portfolio walkthrough

The public home page presents **Web Foundations**, a six-lesson beginner course covering semantic HTML, responsive CSS, accessible forms, JavaScript events, DOM updates, and a small project. Visitors can enter the workspace and try the first exercise without an account. Browser self-checks give clear, deterministic feedback before a learner completes an exercise.

For authenticated users, magic-link sign-in persists challenges and evidence securely through Supabase. The existing engineering tracks remain available as an Advanced Practice library.

## Run locally

```bash
pnpm install
pnpm dev
```

## Supabase setup

1. Create a Supabase project and enable Email (magic-link) authentication.
2. Copy `.env.example` to `.env.local`, then add your project URL and publishable key.
3. In the Supabase SQL Editor, run every SQL file in `supabase/migrations/` in filename order.
4. Add `http://localhost:3000/auth/callback` and your deployed `/auth/callback` URL to the Supabase Auth redirect allow list.

The migrations create protected profile/progress tables, seed 25 missions, and expose transactional completion RPCs. Run the Web Foundations migration after the existing migrations. The latest migrations add saved HTML, CSS, and JavaScript evidence for the in-app code editor plus separate Frontend, Backend, Full-stack, and Tester XP totals. Never add a Supabase service-role key to the browser or `.env.local`.

## Current scope

The app includes passwordless email accounts, cross-device evidence and XP persistence, career ranks, prerequisites, self-reflection, an optional one-time import of legacy browser progress, and AI-review prompt export. It deliberately has no server-side code execution; code previews run inside a sandboxed iframe.

See [`docs/product-brief.md`](docs/product-brief.md) for the product boundaries.
