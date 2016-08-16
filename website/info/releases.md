# Releases

The team defines the roadmap's scope, as informed by Strapi's community. Releases happen as often as necessary and practical, but never before work is complete. Bugs are unavoidable, but pressure to ship a release will never prevail over ensuring the software is correct. The commitment to quality software is a core tenet of the Strapi project.

## Versioning

### Patches

Patch releases:

- Include bug, performance, and security fixes.
- Do not add nor change public interfaces.
- Do not alter the expected behavior of a given interface.
- Can correct behavior if it is out-of-sync with the documentation.
- Do not introduce changes which make seamless upgrades impossible .

### Minors

Minor releases:

- Include additions and/or refinements of APIs and subsystems.
- Do not generally change APIs nor introduce backwards-incompatible breaking changes, except where unavoidable.
- Are mostly additive releases.

### Majors

Major releases:

- Usually introduce backwards-incompatible, breaking changes.
- Identify the feature Strapi intends to support for the foreseeable future.
- Require conversation, care, collaboration and appropriate scoping by the team and its users.

## Scoping Features

The team can add features into Strapi when:

- The need is clear.
- The feature has known consumers.
- The module is clean, useful, and easy-to use.

If when implementing core functionality for Strapi, the team or community may identify another lower-level module which could have utility beyond Strapi. When identified, Strapi can expose it for consumers.

Alternatively, it may be that many in the community adopt a pattern to handle common needs which Strapi does not satisfy. It may be clear that Strapi should deliver, by default, a support or a feature for all Strapi consumers. Another possibility is a commonly-used compiled asset which is difficult to deliver across environments. Given this, Strapi may incorporate those changes directly.

The core team does not take the decision lightly to add a new feature to Strapi. Strapi has a strong commitment to backwards compatibility. As such, community input and conversation must occur before the team takes action. Even if a feature is otherwise suitable for addition, the team must identify potential consumers.

## Deprecation

On occasion, the team must deprecate a feature of Strapi. Before coming to any final conclusion, the team must identify the consumers of the feature and how they use it. Some questions to ask are:

- If this feature is widely used by the community, what is the need for flagging it as deprecated?
- Do we have a replacement feature, or is there a transitionary path?
- How long does the feature remain deprecated before removal?
- Does an external module exist which its consumers can easily substitute?

The team takes the same careful consideration when deprecating a Strapi feature as they do when adding another.
