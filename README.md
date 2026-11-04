# Sanity Workflow Plugin - Electrolux Version (for Sanity Studio v6)

> This plugin supports **Sanity Studio v6.20 and newer**.
> Originally based on Sanity's [sanity-io/sanity-plugin-workflow](https://github.com/sanity-io/sanity-plugin-workflow) (v1.0.3, MIT).

> [!WARNING]
> Breaking changes introduced in version 5.0.0 of this plugin. See [Breaking changes](#breaking-changes).

![Workflow board](/docs/screenshots/1-workflow-board.png)

## Features

- A metadata document for each document in the Workflow, tracking its State, assignees, order and
  locale
- Document Actions to begin the Workflow, assign users, move a document between States and
  complete the Workflow
- Document Badges showing a document's State and assignees
- A "Workflow" Tool with a drag-and-drop board of documents by State
- Assignee and language filters on the board, so multi-market users can find what is relevant to
  them
- A "Data issues" menu that finds and repairs broken workflow metadata

## Install (Sanity Studio v6.20+)

| Package / Runtime     | Requirement |
| --------------------- | ----------- |
| `sanity`              | `^6.20.0`   |
| `react` / `react-dom` | `^19.2.2`   |
| `styled-components`   | `^6.1.15`   |
| Node.js               | `>=22.12`   |

Run

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
import { workflow } from '@electrolux-oss/sanity-plugin-workflow'
import { defineConfig } from 'sanity'

export default defineConfig({
  // all other settings ...
  plugins: [
    workflow({
      // Required, list of document type names
      schemaTypes: ['article', 'product'],
      // Optional, see "Configuring States"
      // states: [],
      // Optional, see "Filtering by language"
      filters: user => ({ locales: ['sv-SE', 'de-CH'] }),
      languages: [{ id: 'de-CH', title: 'German (Switzerland)' }],
      // Optional, roles that see the "Data issues" menu; leave out to show it to everyone
      dataIssueRoles: ['administrator']
    })
  ]
})
```

## Filtering by language

Workflow documents store the `locale` of the document they track. To let users filter the board
by language, return the locales each user works in from `filters`. With no languages selected,
the board shows every locale the user works in.

`languages` sets the names shown in the language filter, in the same `{ id, title }` shape as
`supportedLanguages` in `@sanity/document-internationalization`, so the same list can be passed to
both. Locales without an entry fall back to their English name, such as "Swedish (Sweden)".

![Language filter dropdown](/docs/screenshots/2-filter-languages.png)

## Assigning users

Users are assigned to a document with the "Assign" document action or the Assign button on its
card on the board. The menu lists users holding a role from some State's `roles`. When `filters`
returns locales, it only lists users whose locales include the document's locale. Only users
holding a role for the State the document is in can change its assignees.

![User assign popover menu](/docs/screenshots/3-assign-users.png)

The board's Assignees filter lists everyone assigned to a document on the board, and "Filter mine"
shows the documents assigned to you.

![User filter dropdown](/docs/screenshots/3-filter-assignees.png)

## Data issues

The "Data issues" menu at the right of the board's filter bar finds broken workflow metadata and
shows how many documents it affects. It is disabled when there is nothing to fix. Set
`dataIssueRoles` to limit who sees it.

![Data issues button](/docs/screenshots/4-data-issues.png)

It offers a repair for each kind of issue:

- **Correct Document State** - moves documents whose State no longer exists in the config into the
  first State.
- **Remove Invalid Users** - removes assignees who are no longer in the project, or who only
  hold the Viewer role.
- **Fix Order** - gives every document in the affected States a new order rank, keeping their
  current order. It asks before running.
- **Clean Up Orphaned Metadata** - deletes workflow metadata whose document no longer exists. It
  asks before running, and cannot be undone.

![Data issues dropdown](/docs/screenshots/4-data-issues-dropdown.png)

See [Trying the data repairs](#trying-the-data-repairs) to try the menu without broken data.

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

Wrap the list in `defineStates` from the plugin to have TypeScript check that every `transitions`
entry is the `id` of a State in the list.

### Intended content operations with this plugin

A content creator composes a new document of one of the configured Schema types. The document is a "Draft", but not automatically added to the Workflow.

The creator clicks the "Begin Workflow" Document Action to create a new "metadata" document and add the document to the first State in the Workflow. Using the default States, the document is now "In Review".

The document is now visible in the Workflow Tool. An editor or administrator can drag and drop the document to the next State in the Workflow, "Changes Requested". Other users may be "assigned" to the document. In the default State configuration, only an administrator who is assigned to the document can move it into the final "Approved" State, and only an administrator can move it out again.

With the document now Approved, a user may also return to the document and Publish it, by whatever means that make sense to your use case. Such as scheduled publishing or migrating it to a new dataset.

Once the document is in the last State, the "Complete Workflow" document action ends the Workflow by deleting its metadata. The document itself is kept.

## Contributing

See [CONTRIBUTING.md](https://github.com/electrolux-oss/sanity-plugin-workflow/blob/main/CONTRIBUTING.md) for local development, the checks, and the conventions for branches, commits, pull requests and releases.

## Breaking changes

### **v4 → v5**

This release requires **Sanity Studio v6.20 or newer**, the first Studio release on `@sanity/ui`
^4.4.9. Support for Studio v5 and Studio v6 before 6.20 has been dropped; stay on v4 of this
plugin for older Studios.

State permissions now behave the same in document actions and on the board:

- `roles` gates moving documents both into and out of a State. Document actions previously only
  checked the State a document moved into.
- `roles: []` allows nobody. The board previously treated it as unrestricted.
- Users without any Role can no longer move documents into States that set `roles`.
- `transitions: []` allows moving documents to no other State. It was previously treated as
  unrestricted; leave `transitions` out to allow every State.
- With no languages selected, the board shows documents in every language the user works in
  instead of none, so it can be filtered by assignee alone. The board no longer preselects the
  first language.
- The assign menu only lists users holding a role from some State's `roles`. When the `filters`
  config returns locales, it also only lists users whose locales include the document's locale.
  Current assignees are always listed so they can be removed.
- Only users holding a role for the State a document is in can change its assignees, through the
  "Assign" document action or on the board. The document action previously allowed everyone.
- User search in the assign menu and the assignee filter ignores case and matches anywhere in a
  user's name or email.
- `requireAssignment` only gates moving documents into a State. The board previously also stopped
  unassigned users from dragging documents out of it.

New in v5:

- A "Data issues" menu at the right of the board's filter bar replaces the floating repair panel.
  It lists repairs for broken workflow metadata, asks before fixing order or deleting orphaned
  metadata, and is disabled when there is nothing to fix. The new `dataIssueRoles` option limits
  who sees it.
- The new `languages` option sets the names shown in the language filter, in the same
  `{ id, title }` shape as `supportedLanguages` in `@sanity/document-internationalization`.
- The language and assignee filters are searchable dropdowns that stay open while picking several
  options.
- The assign menu marks assigned users with a checkmark, shows changes immediately and has
  "Assign myself" and "Clear assignees" actions. The "Assign" document action opens it in a dialog.
- Disabled filters and Assign buttons explain why in a tooltip.

Requirements:

| Package / Runtime     | Requirement |
| --------------------- | ----------- |
| `sanity`              | `^6.20.0`   |
| `react` / `react-dom` | `^19.2.2`   |
| `styled-components`   | `^6.1.15`   |
| Node.js               | `>=22.12`   |

### **v3 → v4**

This release adds support for **Sanity Studio v6** and drops support for Studio v4.

Requirements:

| Package / Runtime     | Requirement                           |
| --------------------- | ------------------------------------- |
| `sanity`              | `^5.0.0 \|\| ^6.0.0`                  |
| `react` / `react-dom` | `^19.2.2`                             |
| `styled-components`   | `^6.1.15` (v5 is no longer supported) |
| Node.js               | `>=22.12`                             |

### **v2 → v3**

This release upgrades the plugin’s peer dependency from **React 18** to **React 19**.  
Projects using this plugin must update to React 19 before upgrading to v3.
