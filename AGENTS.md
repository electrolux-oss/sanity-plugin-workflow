# AGENTS.md

Instructions for AI coding agents working in this repository.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before creating a branch, writing a commit message or
pull request description, changing the version, or setting up local development. It holds the
conventions for all of these.

## Rules

- Install with `npm` only. pnpm is used solely by the `publish:next` scripts.
- Before finishing a change, run `npm run typecheck`, `npm run lint`, `npx oxfmt --check`,
  `npm test` and `npm run build`.
- Don't commit or push unless asked. Never push to `main`: create branches from `origin/main`
  with `--no-track`, and push with an explicit `branch:branch` refspec.
- Never publish to npm, change npm dist-tags, push git tags or create GitHub releases. Maintainers
  do those steps.
