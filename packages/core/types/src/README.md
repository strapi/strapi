# Strapi Types Documentation

### @strapi/types/core

This package encapsulates core Strapi types. The types within are foundational elements of Strapi's server-side functionalities. They majorly represent services, middlewares, main objects and core application operational entities.

### @strapi/types/modules

The 'modules' package signifies Strapi's modular design principle. It contains types that characterize the Strapi's modules, maintaining separation of concerns and promoting modularity. As these modules tend to be functional components, their types often dictate structure and behavior.

### @strapi/types/utils

The 'utils' package is a utility belt for types in Strapi. The types in this package aid in bolstering type safety, code readability and functional expressiveness of the codebase. They don't necessarily map directly to business entities but serve to supplement them.

### @strapi/types/schema

The 'schema' package contains types associated with data schema definitions. They define the structure of data and relationships between different data entities. The focus here is to keep track of data modeling and its influences on data flow.

### @strapi/types/data

This package targets primary data entities and their components. The types in this package model data and its organizational structure within Strapi. They indicate how data is shaped when interfacing with databases or external services.

### @strapi/types/plugin

This package is purposed to house types related to the plugins in Strapi. These types define the structure and functionalities of plugins, enabling extensibility of the core Strapi framework. This grouping allows for a simplified development and management of plugins, contributing to the overall modular architecture of Strapi.

### @strapi/types/internal

The 'internal' package contains types specific to Strapi's internal workings. Their exposure to end-users is limited, focusing mainly on type safety within Strapi's own codebase. The package effectively decouples framework's internal operational types from the ones user interacts with.

### @strapi/types/public

The 'public' package houses types that represent public interfaces Strapi exposes. Catering to developers extending Strapi, these types aid in configuring Strapi applications or utilizing Strapi's services and functionalities effectively.

### @strapi/types

The 'types' package is a root package encompassing all types within Strapi. It provides a central access point for Strapi's type system, allowing easier import of types while interacting with multiple facets of Strapi's code.
