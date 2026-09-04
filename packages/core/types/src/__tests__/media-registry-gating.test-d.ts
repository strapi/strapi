/**
 * Compile-time regression test for the *gating formula* used by
 * `MediaAttributeValue` (`packages/core/types/src/schema/attribute/definitions/media.ts`):
 *
 *   And<IsContentTypeRegistryExtended, IsMediaTargetRegistered>
 *
 * where `IsMediaTargetRegistered = Extends<MediaTargetUID, UID.ContentType>`.
 *
 * Why this doesn't import the real exported symbols directly: `IsContentTypeRegistryExtended`
 * and `UID.ContentType` are derived from the *actual* global `Public.ContentTypeSchemas`
 * registry, which is extended exactly once, globally, for the whole `tsc` invocation via
 * declaration merging (see `media-attribute-value.test-d.ts`, which registers a fully generated
 * project's content types, `plugin::upload.file` included, to cover the "normal registry"
 * scenario end-to-end). A single compilation can't hold two different registry states at once,
 * so the "registry not extended at all", "component-only extended", and "selective content
 * registry that omits the upload target" scenarios can't be reproduced against the real global
 * types in the same run.
 *
 * Instead, this file reproduces the exact same composition (`NotStrictEqual` + `Extends` + `And`)
 * against synthetic stand-ins for the internal/public UID unions, to prove the boolean algebra
 * itself resolves correctly for all four cases the review flagged:
 *   1. Registries not extended at all.
 *   2. Component registry extended, content-type registry not (component-only augmentation).
 *   3. Content-type registry extended, but the upload target isn't part of it (selective/partial
 *      registry).
 *   4. Content-type registry extended and the upload target is registered (normal project).
 */
import type { And, Extends, NotStrictEqual } from '../utils';

type MediaTargetUID = 'plugin::upload.file';

// Stand-in for `Internal.UID.ContentType` (always the generic, unregistered pattern), compared
// against a per-scenario stand-in for `UID.ContentType` (the public, potentially-extended union)
// to reproduce `Constants.IsContentTypeRegistryExtended`.
type InternalContentTypeUID = `${string}::${string}.${string}`;

type AssertGate<TPublicContentTypeUID extends string, TExpectedGate extends boolean> =
  And<
    NotStrictEqual<InternalContentTypeUID, TPublicContentTypeUID>,
    Extends<MediaTargetUID, TPublicContentTypeUID>
  > extends (TExpectedGate extends true ? true : false)
    ? true
    : ['gate mismatch', TPublicContentTypeUID, 'expected', TExpectedGate];

declare const assertGate: <T extends true>() => T;

// 1. Registries not extended at all: public union === internal (generic) union.
assertGate<AssertGate<InternalContentTypeUID, false>>();

// 2. Component-only augmentation: content-type registry is untouched, so this is
// indistinguishable, from the content-type registry's point of view, from "not extended".
assertGate<AssertGate<InternalContentTypeUID, false>>();

// 3. Content-type registry extended, but selectively - `plugin::upload.file` isn't part of it.
assertGate<AssertGate<'api::article.article' | 'api::author.author', false>>();

// 4. Normal, fully generated project: content-type registry extended and the upload target is
// part of it.
assertGate<AssertGate<'api::article.article' | MediaTargetUID, true>>();
