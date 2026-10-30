# Sanity Workflow Plugin - Electrolux Version (for Sanity Studio v6)

> This is a **Sanity Studio v6** plugin.
> This is a forked version of Sanitys own [Sanity Workflow Plugin (v1.0.3)](https://www.npmjs.com/package/sanity-plugin-workflow/v/1.0.3)

> [!WARNING]
> Breaking changes introduced in version 5.0.0 of this plugin. Please see more information below.

## :warning: Breaking changes

### **v4 → v5**

This release drops support for **Sanity Studio v5** and moves the plugin to `@sanity/ui` v4, the
version Studio v6 ships with. Stay on v4 of this plugin while on Studio v5.

State permissions now behave the same in document actions and on the board:

- `roles` gates moving documents both into and out of a State. Document actions previously only
  checked the State a document moved into.
- `roles: []` allows nobody. The board previously treated it as unrestricted.
- Users without any Role can no longer move documents into States that set `roles`.
- `transitions: []` allows moving documents to no other State. It was previously treated as
  unrestricted; leave `transitions` out to allow every State.
- The assign menu only lists users holding a role from some State's `roles`. When the `filters`
  config returns locales, it also only lists users whose locales include the document's locale.
  Current assignees are always listed so they can be removed.
- Anyone who can open a document can change its assignees, also from the board. The board
  previously disabled assigning on cards in States where the user lacked a role.
- User search in the assign menu and the assignee filter ignores case and matches anywhere in a
  user's name or email.
- `requireAssignment` only gates moving documents into a State. The board previously also stopped
  unassigned users from dragging documents out of it.

Requirements:

| | Requirement |
| --- | --- |
| `sanity` | `^6.0.0` |
| `react` / `react-dom` | `^19.2.2` |
| `styled-components` | `^6.1.15` |
| Node.js | `>=22.12` |

### **v3 → v4**

This release adds support for **Sanity Studio v6** and drops support for Studio v4.

Requirements:

| | Requirement |
| --- | --- |
| `sanity` | `^5.0.0 \|\| ^6.0.0` |
| `react` / `react-dom` | `^19.2.2` |
| `styled-components` | `^6.1.15` (v5 is no longer supported) |
| Node.js | `>=22.12` |

### **v2 → v3**

This release upgrades the plugin’s peer dependency from **React 18** to **React 19**.  
Projects using this plugin must update to React 19 before upgrading to v3.

# Sanity Workflow Plugin

![Screenshot 2023-03-21 at 12 11 24](https://user-images.githubusercontent.com/9684022/226602179-5bd3d91a-9c27-431e-be18-3c70f06c6ccb.png)

## Features

- A unique schema to handle workflow metadata documents
- Document Actions to promote and demote documents through the workflow
- Document Badges for visual feedback about the current state of a document
- A custom Tool for drag-and-drop updating of a document's state
- Language filter to make it easier for multi-market users to find relevant information.

## Install (Sanity Studio v6)

```zsh
npm install --save @electrolux-oss/sanity-plugin-workflow
```

or

```zsh
yarn add @electrolux-oss/sanity-plugin-workflow
```

## Usage

Add it as a plugin in `sanity.config.ts` (or .js) file:

```ts
 import { createConfig } from 'sanity'
 import { workflow } from '@electrolux-oss/sanity-plugin-workflow'

 export const createConfig({
    // all other settings ...
     plugins: [
         workflow({
            // Required, list of document type names
            // schemaTypes: ['article', 'product'],
            schemaTypes: [],
            // Optional, see below
            // states: [],
         })
     ]
 })
```

## Configuring "States"

The plugin comes with a default set of "States". These are tracked by the plugin creating a separate "metadata" document for each document that has begun the Workflow.

Documents can be promoted and demoted in the Workflow with the provided Document Actions as well as a drag-and-drop custom Tool. The settings below are not enforced by the API, custom access control rules could be used to do so.

```ts
{
    // Required configuration
    id: 'inReview',
    title: 'In Review',
    // Optional settings:
    // Used for the color of the Document Badge
    color: 'success',
    // Only users with one of these Roles can move documents into or out of this State,
    // through document actions or drag-and-drop. Leave it out to allow everyone;
    // an empty array allows nobody
    roles: ['publisher', 'administrator'],
    // Requires the user to be "assigned" in order to move a document into this State
    requireAssignment: true,
    // Requires the document to be valid before being promoted out of this State
    // Warning: With many documents in the Kanban view this can negatively impact performance
    requireValidation: true,
    // Defines which States a document can be moved to from this one.
    // Leave it out to allow every State; an empty array allows none
    transitions: ['changesRequested', 'approved']
}
```

### Intended content operations with this plugin

A content creator composes a new document of one of the configured Schema types. The document is a "Draft", but not automatically added to the Workflow.

The creator clicks the "Begin Workflow" Document Action to create a new "metadata" document and add the document to the first State in the Workflow. Using the default States, the document is now "In Review".

The document is now visible in the Workflow Tool. The creator can drag and drop the document to the next State in the Workflow, "Changes Requested". Other users may be "assigned" to the document. In the default State configuration, only an assigned user can move the document into the final "Approved" state.

An administrator can move the document into Changes Requested or Approved.

With the document now Approved, a user may also return to the document and Publish it, by whatever means that make sense to your use case. Such as scheduled publishing or migrating it to a new dataset.

Once the Workflow is complete, the metadata can be removed by using the "Complete Workflow" document action.

## Develop locally

### Link the plugin to a local studio

**Step 1: Set up the plugin for local development**

In the plugin directory, run:
```zsh
npm run link-watch
```

This will:
- Build your plugin automatically whenever code changes
- Publish the package to a local yalc repository

**Step 2: Link the plugin to your studio**

In your studio project directory, run:
```zsh
npx yalc add @electrolux-oss/sanity-plugin-workflow && npm install
```

**Step 3: Verify the setup**

Check your studio's `package.json` - you should see:
```json
"@electrolux-oss/sanity-plugin-workflow": "file:.yalc/@electrolux-oss/sanity-plugin-workflow"
```

Now you can use the local version of the plugin:
```typescript
import { workflow } from '@electrolux-oss/sanity-plugin-workflow'
```

### Making changes

When you modify the plugin code:
1. The `link-watch` command will automatically rebuild
2. In your studio, run `npx yalc update` to pull the latest changes
3. Restart your dev server: `npm run dev`

### Running the checks

```zsh
npm test          # unit tests (Vitest)
npm run typecheck # tsc --noEmit
npm run lint      # ESLint
npm run build     # also fails on type errors
```

Use `npm run test:watch` while working on a change.

Tests live next to the code they cover as `*.test.ts`. They are type-checked by
`tsconfig.json` but excluded from `tsconfig.dist.json`, so they never reach the
published package.

Two areas are worth knowing about when adding tests:

- **Pure helpers** (`src/helpers/`) are tested directly — filtering and sorting of
  board items, LexoRank ordering, and whether the locale filter should gate the board.
- **The GROQ query** in `src/hooks/useWorkflowDocuments.tsx` is tested by reading the
  `QUERY` constant out of the source file and evaluating it with
  [`groq-js`](https://github.com/sanity-io/groq-js) against a small in-memory dataset.
  Reading it from source means the test cannot drift from the query that actually ships.
  This is how the draft-vs-published validation target and the locale filter are covered.

`npm run build` type-checks as it compiles, so a type error fails the build rather than
being emitted into `dist`.


## FAQ

#### Q: Why multiple `tsconfig*.json` files?

**[Plugin kit information source](https://github.com/sanity-io/plugin-kit?tab=readme-ov-file#q-why-multiple-tsconfigjson-files)**.

After running `plugin-kit init` you will get these tsconfig files:

- `tsconfig.json` used by the IDE (this typically includes test files)
- `tsconfig.dist.json` used by the build system, and ignores test files
- `tsconfig.settings.json` with shared settings between tsconfig.json and tsconfig.dist.json

This configuration allows for type-checking you scripts and tests, and not only the distribution files. When building the scripts and test files will not be included in the npm package distribution.