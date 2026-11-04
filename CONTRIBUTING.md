# Contributing

These conventions are shared by
[sanity-plugin-workflow](https://github.com/electrolux-oss/sanity-plugin-workflow) and
[sanity-plugin-media](https://github.com/electrolux-oss/sanity-plugin-media). Both repositories
have the same `CONTRIBUTING.md`; sections marked **(this plugin)** are the only ones that differ.
When you change a shared section, change it in both repositories.

## Setup

- Node.js `^22.18.0 || >=24.11.0` to build (the published plugin itself supports `>=22.12`)
- npm. pnpm is only used to publish, as a pinned devDependency; don't install with it.

```sh
npm ci
```

In VS Code, install the [Oxc extension](https://marketplace.visualstudio.com/items?itemName=oxc.oxc-vscode).
The shared `.vscode/settings.json` makes it the formatter and turns off Prettier, ESLint and
Import Sorter for this workspace.

## Local development

Link the plugin into a local Studio with [yalc](https://github.com/wclr/yalc).

1. In the Studio, install its dependencies, so the plugin's own dependencies are installed there:

   ```sh
   npm install
   ```

2. In the plugin, build on every change and push each build to linked Studios:

   ```sh
   npm run link-watch
   ```

3. In the Studio, link the plugin:

   ```sh
   npx yalc link @electrolux-oss/sanity-plugin-workflow
   ls -l node_modules/@electrolux-oss/   # sanity-plugin-workflow -> …/.yalc/@electrolux-oss/sanity-plugin-workflow
   git diff package.json                 # no change
   ```

4. Start the Studio. Reload it to pick up changes, and restart its dev server if it keeps serving
   an old build.

While linked, don't run `npm install` in the Studio: it replaces the link with the published
version. Run `npx yalc link @electrolux-oss/sanity-plugin-workflow` again if you did. To stop:

```sh
npx yalc remove @electrolux-oss/sanity-plugin-workflow && npm install
```

Don't use `yalc add`. It writes `file:.yalc/…` into the Studio's `package.json`, and with
`link-watch` every rebuild replaces the plugin with a copy that can't resolve its own
dependencies.

### Trying the data repairs (this plugin)

The board's "Data issues" menu repairs broken workflow metadata, such as orphaned metadata or
duplicate order ranks. To try it without broken data, run this in the browser console and reload:

```js
localStorage.setItem('studio.plugin.workflow.simulate-data-issues', 'true')
```

The menu then reports made-up issues on real documents, and its repairs only show what they would
have done. Remove the key to switch back.

## Checks

Run these before opening a pull request:

```sh
npm run typecheck   # tsc --noEmit
npm run lint        # oxlint: type-aware, warnings count as errors
npx oxfmt --check   # formatting
npm run build       # plugin-kit verify-package, then pkg-utils
```

`npm run build` doesn't type-check (pkg-utils generates types without checking them), so run
`typecheck` or `lint` to catch type errors. `npm run format` formats everything, and
`npm run lint:fix` applies oxlint's safe fixes.

### Tests (this plugin)

```sh
npm test              # Vitest
npm run test:watch
```

Tests live next to the code they cover as `*.test.ts`. They are type-checked by `tsconfig.json`
but excluded from `tsconfig.dist.json`, so they never reach the published package.

- **Pure helpers** (`src/helpers/`) are tested directly: filtering and sorting of board items,
  LexoRank ordering, and which locales the board queries.
- **The GROQ query** in `src/hooks/useWorkflowDocuments.tsx` is tested by reading the `QUERY`
  constant out of the source file and evaluating it with
  [groq-js](https://github.com/sanity-io/groq-js) against a small in-memory dataset, so the test
  can't drift from the query that ships.

## Code style

- Formatting is [oxfmt](https://oxc.rs/docs/guide/usage/formatter.html) with plugin-kit's preset
  and the repository's previous Prettier settings on top (`oxfmt.config.ts`). It also sorts
  imports and `package.json`.
- Linting is [oxlint](https://oxc.rs/docs/guide/usage/linter.html) with plugin-kit's shared config
  (`oxlint.config.ts`). A disable comment needs a reason:
  `// oxlint-disable-next-line <rule> -- <why>`.
- There are three TypeScript configs: `tsconfig.json` for the editor and type checks (includes
  tests and `package.config.ts`), `tsconfig.dist.json` for the build (excludes tests), and
  `tsconfig.settings.json` with the options both share.

## Branches

Branch from an up-to-date `main` and name the branch `<type>/<short-description>`, using the same
types as commits:

```sh
git fetch origin
git switch --no-track -c fix/filter-bar-scrollbar origin/main
git push -u origin fix/filter-bar-scrollbar:fix/filter-bar-scrollbar
```

`--no-track` and the explicit `branch:branch` push stop a plain `git push` from going to `main`.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/): `<type>(<scope>): <summary>`.

| Type       | For                                                      |
| ---------- | -------------------------------------------------------- |
| `feat`     | a new feature for people using the plugin                |
| `fix`      | a bug fix for people using the plugin                    |
| `refactor` | a code change that is neither a feature nor a fix        |
| `docs`     | documentation only                                       |
| `style`    | formatting only, no code change                          |
| `test`     | tests only                                               |
| `build`    | dependencies, build tooling, packaging and version bumps |
| `chore`    | anything else that doesn't touch the plugin or its build |

- Write the summary in lower case and the imperative: `fix: remove the vertical scrollbar from the filter bar`.
- `build(deps)` is for dependency updates. A scope is otherwise optional.
- Mark a breaking change with `!` (`feat!: …`) and explain it in the body.
- Write the body as `- ` bullets, one per change, after a blank line.
- Keep formatting-only changes in their own `style` commit, and add a large reformat's hash to
  `.git-blame-ignore-revs`.

## Pull requests

- One topic per pull request. Its title follows the commit format, and for a single commit it's
  the commit's subject.
- Describe it with these sections, leaving out any that don't apply:

  ```markdown
  ## Summary

  ## Why

  ## Changes

  ## Testing
  ```

- Merge with **Create a merge commit**. Squash and rebase merges change commit hashes, which
  breaks `.git-blame-ignore-revs` and loses the individual commits.

## Versioning

The plugin follows [semantic versioning](https://semver.org/). These are **major** changes:

- dropping support for a Studio version, or raising a peer dependency's minimum
- changing the module format or removing an export
- changing a default behaviour (keep the old default and make the new behaviour opt-in to avoid a
  major)

A change that doesn't affect the published package, such as editor settings or documentation
outside the README, doesn't need a release. The npm package contains only `dist`, the README, the
license and `package.json`.

## Releasing

Releases are made by maintainers with the organisation's npm credentials.

1. **Bump the version in its own pull request.** Branch `build/bump-X.Y.Z`, with one commit and
   the pull request title `build: bump version to X.Y.Z`:

   ```sh
   npm version X.Y.Z --no-git-tag-version
   ```

2. **Publish behind `next`** from an up-to-date, clean `main`:

   ```sh
   git switch main && git pull --ff-only origin main && npm ci
   npm run publish:next:dry-run
   npm run publish:next
   ```

   Always publish with these scripts. They run `pnpm publish --tag next`: pnpm applies
   `publishConfig.exports`, and npm doesn't, so a plain `npm publish` would ship a `source` export
   pointing at the unshipped `src/` and move `latest` straight away.

3. **Check the release in a Studio** installed from `next`:

   ```sh
   npm i @electrolux-oss/sanity-plugin-workflow@next
   ```

4. **Move `latest`:**

   ```sh
   npm dist-tag add @electrolux-oss/sanity-plugin-workflow@X.Y.Z latest
   ```

5. **Tag the merge commit** on `main` with an annotated tag:

   ```sh
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin vX.Y.Z
   ```

6. **Publish the GitHub release** from that tag, marked as latest, titled `vX.Y.Z: <summary>`
   (for example `v5.0.1: Filter bar scrollbar fix`). Use "Generate release notes" for the list of
   pull requests and write the rest above it:

   ```markdown
   <What changed for people using the plugin, whether anything breaks, and the supported Studio versions.>

   ## ⚠️ Breaking changes

   ## Features

   ## Fixes

   ## Maintenance

   ## Upgrading

   npm install @electrolux-oss/sanity-plugin-workflow@^X.Y.Z

   ## What's Changed

   <generated by GitHub>
   ```

   Leave out any section that's empty. A breaking change also gets an entry in the README's
   "Breaking changes" section.
