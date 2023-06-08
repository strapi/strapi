---
title: Transfer Engine
description: Conceptual guide to the data transfer engine
tags:
  - data-transfer
  - experimental
---

The transfer engine manages the data transfer process by facilitating communication between a source provider and a destination provider.

## Code location

`packages/core/data-transfer/src/engine/index.ts`

## Setting up a transfer

### Excluding data

### Transforms

## Running a transfer

Note: The transfer engine (and the providers) current only support a single `engine.transfer()` and must be re-instantiated if intended to run multiple times. In the future it is expected to allow them to be used for multiple transfers in a row, but that usage is untested and will result in unpredictable behavior.
