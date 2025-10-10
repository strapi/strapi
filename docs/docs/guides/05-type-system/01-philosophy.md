---
title: Philosophy
tags:
  - typescript
  - type system
  - type
  - philosophy
  - principles
---

### Context

Since its release, Strapi's strength has lain in its **flexibility** and **extensibility**.

It can handle a wide array of content and customizations, from content-types to plugins and extensions, most of them are defined dynamically in user applications.

With TypeScript imposing itself as a standard in the JS ecosystem over the years, it has become critical to develop a uniform system that streamlines this heavily customized content management's developer experience.

It is in this context that a type system becomes an essential tool, as it provides a single source of truth for standardized data structures, like schema, attributes, and entities, whether they've been statically or dynamically created.

On top of this, it offers a wide range of utilities to manipulate those types, and creates a unified, typed developer experience across the whole codebase.

### Application

#### For Contributors

One of its key advantages is the plethora of utilities it provides, which simplify the manipulation of complex data structures, including content types, documents, and UIDs.

Another significant advantage is the consistency it enforces within the codebase. This is achieved by defining shared types once and reusing them throughout the codebase.

Moreover, the type system can effectively handle high levels of customization, thus allowing developers to focus their efforts on feature development rather than TypeScript headaches.

#### For Users

Although Strapi users don't often engage directly with the type system, it nonetheless profoundly influences their Strapi experience.

It ensures the provision of type-safe APIs (such as the document service), which greatly reduces runtime errors, offers a simple way of discovering APIs via autocompletion and code hinting, and makes the system more reliable overall.

Moreover, it arms users with ready-made types, which they can use to type-proof their applications or customizations.

Lastly, the type system also provides users with type-manipulation utilities.

### Challenges

The main challenge faced by the type system is being able to maintain a high-quality TypeScript developer experience for different contexts, each with their own nuances.

#### For Contributors

Contributors expect to create and/or use APIs that handle very generic data structures in the context of Strapi internals, which become context-aware and strongly typed when used by a user withing their application.

#### For Users

Users expects to have a TypeScript experience tailored around their own application, with their content-types, components, and plugins being strongly typed and recognized by the Strapi APIs.

:::warning
Creating such experiences without slowing down developers (both contributors and users) is a huge undertaking and should be considered a top priority everytime the type system is modified.
:::

### Key Principles

#### 🧩 Flexibility and Extensibility

Strapi's strength lies in its ability to handle a wide range of content and customizations, the types should reflect and adapt to that.

#### 📏 Uniformity

The goal of the type system is to provide a consistent and smooth TypeScript developer experience for both users' applications and Strapi internals.

#### 🧰 Fully-Featured

The type system exposes utilities that enable the manipulation of complex data structures, regardless of potential heavy customization involved.

#### 🪡 Tailor-made Experience

The type system should provide a TypeScript experience that is tailored to each application, while keeping a generic stance within Strapi internals.

#### 🏖️ Easy to Use

The type system should prioritize not slowing down developers, whether contributors or users. Any complexity should be handled by the type system internals.
