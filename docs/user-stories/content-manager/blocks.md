# Blocks Editor

> Source: `tests/e2e/tests/content-manager/blocks.spec.ts`

## User Story: Add a code block and choose its language

**As a** content editor **I want** to write text in the blocks editor, convert it into a code block, and select the programming language **so that** I can present formatted code that is highlighted correctly and persists across reloads.

### Acceptance Criteria

- **Given** I am in the Content Manager **When** I open the Homepage single type **Then** I see its blocks editor textbox.
- **Given** the blocks editor textbox **When** I click into it and type text (e.g. `const problems = 99`) **Then** that text is rendered.
- **Given** text in the current block **When** I use the blocks toolbar combobox to convert it into a "Code block" **Then** the block becomes a code block.
- **Given** the block is now a code block with the language selector initially showing "Plain text" **When** I open the language selector and choose a language (e.g. "Fortran") **Then** the selected language is shown.
- **Given** the code block **When** I press Enter twice from outside the code block **Then** a new block is created **And** the language label is no longer shown for the new block.
- **Given** my changes **When** I click "Save" **Then** the save request to the Homepage single type completes successfully **And** a "Saved document" confirmation appears.
- **Given** the change has been saved **When** I reload the page **Then** the code text is still present in the blocks editor.
- **Given** the reloaded page **When** I click back into the saved code surface **Then** the blocks toolbar language combobox is still set to the chosen language ("Fortran").
