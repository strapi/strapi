---
sidebar_position: 1
sidebar_label: Introduction
---

# Strapi contributor documentation

Welcome to the Strapi Contributor documentation.

:::caution
No single squad “owns” the contributor documentation, it's a collective effort.
:::

This documentation site is a constant WIP so please, continue to add and improve these docs. These are not “user” docs,
they're related directly to the codebase for both internal and external engineers written with that in mind they explain
technical concepts but also hold documentation for hooks, utils etc.

## Structure

The general layout focusses on 4 key areas:

### Guides

This is where you'll probably want to start off. We have our contributing guides & code of conduct which are very important to read. There are also useful guides on common situations whilst developing such as ["Working with the Design System"](/guides/working-with-the-design-system) and higher-level guides such as best practices for frontend development (coming soon).

### Docs

Within the docs section we have a multitude of both technical and conceptual documentation diving deep into particular parts of the Strapi monorepo that may not make as much sense as just reading the code, like ["Relations reordering in the database"](/docs/core/database/relations/reordering). There's also usage documentation for various pieces of code such as the [useDragAndDrop](/docs/core/content-manager/hooks/use-drag-and-drop) hook.

### API Reference

An advanced deep dive into some of the core driving classes of Strapi with explanations on the methods & parameters available on commonly exposed classes as well as examples to compliment them for easier understanding.

### RFCs

A growing section we intend to populate over time with public-facing RFCs once approved to maintain as a record. These assist in understanding the design direction of features and code to understand the contextual "whys" that may not be apparent.

## When should you add content?

Content should be added typically when you add any new feature – especially enterprise e.g.
`Review Workflows` and also when you add new code other engineers may find another use for e.g. a
new hook. There's no guidelines on what to add vs what not to add, as defined above we add a variety
of material to help onboard contributers.
