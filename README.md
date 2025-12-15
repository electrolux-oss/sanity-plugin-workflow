# Sanity Workflow Plugin - Electrolux Version (for Sanity Studio v4)

> This is a **Sanity Studio v4** plugin.
> This is a forked version of Sanitys own [Sanity Workflow Plugin (v1.0.3)](https://www.npmjs.com/package/sanity-plugin-workflow/v/1.0.3)

> [!WARNING]
> Breaking changes introduced in verion 3.0.0 of this plugin. Please see more information below.

## :warning: Breaking changes - (v2.0.0 &rarr; v3.0.0)
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

## Install (Sanity Studio v4)

```zsh
npm install --save sanity-plugin-workflow
```

or

```zsh
yarn add sanity-plugin-workflow
```

## Usage

Add it as a plugin in `sanity.config.ts` (or .js) file:

```ts
 import { createConfig } from 'sanity'
 import { workflow } from 'sanity-plugin-workflow'

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
    // Will limit document actions and drag-and-drop for only users with these Role
    roles: ['publisher', 'administrator'],
    // Requires the user to be "assigned" in order to update to this State
    requireAssignment: true,
    // Requires the document to be valid before being promoted out of this State
    // Warning: With many documents in the Kanban view this can negatively impact performance
    requireValidation: true,
    // Defines which States a document can be moved to from this one
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

### Test your plugin locally

In the plugin directory run this command:
```zsh
npm run link-watch
```

This will set up your plugin to build whenever the code changes, and publish the package to a local yalc repository.

Run the command in the studio project directory:

```zsh
npx yalc add @electrolux-oss/sanity-plugin-workflow && npx yalc link @electrolux-oss/sanity-plugin-workflow && npm install
```

You should see something like this in the `package.json` file:

```
"@electrolux-oss/sanity-plugin-workflow": "file:.yalc/@electrolux-oss/sanity-plugin-workflow",
```

Which means you can safely use the local version of the plugin with this import:

```
import { workflow } from '@electrolux-oss/sanity-plugin-workflow'
```
