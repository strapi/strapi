---
title: Blocks editor
description: The modern JSON-based rich text editor
tags:
  - content-manager
---

The blocks editor is a modern text editor based on the [Slate.js library](https://docs.slatejs.org/). It is designed as the successor to the classic markdown editor, and can only be used within the content-manager.

## Data format

### Why JSON

While the markdown editor stores content as a string, Blocks stores it as a JSON object. Since Strapi is headless, we want a format that makes it easy to map content across different platforms and offer a good experience for non-web use cases too. In the case of React frontends, JSON also means we don't need to rely on `dangerouslySetInnerHTML` to render the formatted content.

### Slate-based schema

The blocks editor schema is based on Slate.js, which allows us to design our own custom schema structure. We chose Slate in part because its JSON format remains human-readable. This was a key element to ensure the data could be rendered in any frontend where official or third-party libraries may not be available.

Our Blocks schema is made of the following elements:

- Block nodes: they're at the root of the document JSON: Paragraphs, images, headings, lists, code blocks...
- Inline nodes: they're children of block nodes, and can have children. Inline nodes include text nodes, and links.
- Text leaves: they're children of inline nodes, and contain the actual text content. One specificity of our design compared to most Slate implementations is that they must have a `"type": "text"` entry in addition to the standard `text` property.
- Modifiers: they're variations of text nodes that can be applied to text content. They include bold, italic, underline, and strikethrough. They can be combined.

With these elements combined, here's what the content for a sample Blocks attribute looks like:

```json
[
  {
    "type": "heading",
    "children": [
      {
        "type": "text",
        "text": "I am a heading"
      }
    ],
    "level": 1
  },
  {
    "type": "paragraph",
    "children": [
      {
        "type": "text",
        "text": "Nice content here. Isn't it? Some of it can be "
      },
      {
        "type": "text",
        "text": "bold",
        "bold": true
      },
      {
        "type": "text",
        "text": ", "
      },
      {
        "type": "text",
        "text": "italic",
        "italic": true
      },
      {
        "type": "text",
        "text": ", or "
      },
      {
        "type": "text",
        "text": "both",
        "bold": true,
        "italic": true
      },
      {
        "type": "text",
        "text": "."
      }
    ]
  },
  {
    "type": "list",
    "format": "unordered",
    "children": [
      {
        "type": "list-item",
        "children": [
          {
            "type": "text",
            "text": "first list item"
          }
        ]
      },
      {
        "type": "list-item",
        "children": [
          {
            "type": "text",
            "text": "sub list"
          }
        ]
      },
      {
        "type": "list",
        "format": "unordered",
        "indentLevel": 1,
        "children": [
          {
            "type": "list-item",
            "children": [
              {
                "type": "text",
                "text": "sub 1"
              }
            ]
          },
          {
            "type": "list-item",
            "children": [
              {
                "type": "text",
                "text": "sub 2"
              }
            ]
          }
        ]
      }
    ]
  }
]
```

## Components structure

<img
  src="/img/content-manager/blocks/components-structure.png"
  alt="a diagram showing how the blocks input is split into components"
/>

As shown in the diagram, the Blocks input is split into several components:

- `BlocksInput` is the input ready to be used in the content manager edit view. Besides the editor, it is responsible for rendering the label, label actions (like the i18n icon), as well as error and hint messages.
- `BlocksEditor` is the root of the Slate editor. It provides the context for all the stateful parts of the editor.
- `BlocksToolbar` is the toolbar that appears above the editor. It provides buttons for formatting the text, as well as a button to insert a new block.
- `BlocksContent` is the WYSIWYG editor that allows users to write and view their formatted content.

## Blocks and modifiers management

A key goal of the blocks implementation is that it should be driven by a declarative list of blocks and modifiers. Each block and each modifier should manage its own rendering, logic and behavior. The editor itself (whether it's the toolbar or the content) should not contain any logic targeting specific blocks or modifiers. It should remain agnostic.

This has several upsides. The logic for each block or modifier is self-contained within its own file, making it easier to grasp and edit. It keeps the editor's code lean and avoids spaghetti implementations. It lets us manage blocks from several entry points: the toolbar's dropdown, a Notion-style `/` to open a blocks popover...

And importantly, it opens the door for a [custom](https://github.com/strapi/strapi/pull/24427) [blocks](https://feedback.strapi.io/customization/p/add-ability-to-extend-strapis-rich-text-editor-with-custom-slate-elements) and custom modifiers API, letting users extend the editor with their own building blocks.

### Block registration

A block is registered in the editor as an object of always the same shape. For a single "type", there can be several variations, all of which will have their own object. For example, Heading 1 and Heading 2 both have `heading` type, but are displayed separately in the editor, and therefore are registered separately.

| Property                                                                     | Description                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **renderElement**<br />`(props: RenderElementProps) => JSX.Element`          | Displays the block inside `BlocksContent`. Make sure to spread `attributes` on the root (that's how Slate makes it editable), and to render `children` so that inline nodes and text leaves can be rendered.                                                                        |
| **icon**<br />`React.ComponentType`                                          | A visual cue to identify the block. Use icons from the design system.                                                                                                                                                                                                               |
| **label**<br />`MessageDescriptor`                                           | A translation object to display what the block is called.                                                                                                                                                                                                                           |
| **isInBlocksSelector**<br />`boolean`                                        | Whether the block should appear in the blocks selector dropdown. In almost all cases, this is `true`. The main exception is list items, as they are hidden under their list parent.                                                                                                 |
| **dragHandleTopMargin**<br />`CSSProperties['marginTop']`                    | Adjusts the vertical alignment of the grip icon used to reorder nodes.                                                                                                                                                                                                              |
| **matchNode**<br />`(node: BlocksNode) => boolean`                           | Returns a boolean that indicates whether a node is of the given block type.                                                                                                                                                                                                         |
| **handleConvert**<br />`(editor: Editor) => void`                            | Customizes the logic run when transforming the currently selected node into the given node type. It generally involves setting the `type` property and clearing unwanted properties. The `baseHandleConvert` util manages just that.                                                |
| **handleEnterKey**<br />`(editor: Editor) => void`                           | Customizes the logic ran when the user presses enter. By default, it creates a paragraph under the current node and selects it. For blocks that may have multi-line content, such as code blocks, a common pattern is to replicate this behavior when the user presses enter twice. |
| **handleBackspaceKey**<br />`(editor: Editor, event: KeyboardEvent) => void` | Customizes the logic ran when the user presses backspace. Useful for blocks that need special behavior when deleting content at the start of a block.                                                                                                                               |
| **handleTab**<br />`(editor: Editor) => void`                                | Customizes the logic ran when the user presses tab. Useful for blocks like lists that support indentation.                                                                                                                                                                          |
| **snippets**<br />`string[]`                                                 | Strings that can trigger a transformation into the given block after pressing space.                                                                                                                                                                                                |

```tsx
const headingBlocks = {
  'heading-one': {
    renderElement: (props) => <H1 {...props.attributes}>{props.children}</H1>,
    icon: HeadingOne,
    label: {
      id: 'components.Blocks.blocks.heading1',
      defaultMessage: 'Heading 1',
    },
    matchNode: (node) => node.type === 'heading' && node.level === 1,
    isInBlocksSelector: true,
    handleConvert: (editor) => baseHandleConvert(editor, { type: 'heading', level: 1 }),
    snippets: ['#'],
    dragHandleTopMargin: '14px',
  },
};
```

### Modifier registration

A modifier is registered in the editor as an object with a consistent shape.

| Property                                                               | Description                                                                                                                                    |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **renderLeaf**<br />`(children: JSX.Element \| string) => JSX.Element` | Displays the modified text inside `BlocksContent`. This wraps the children in the appropriate styled component (e.g., `<BoldText>` for bold).  |
| **icon**<br />`React.ComponentType`                                    | A visual cue to identify the modifier. Use icons from the design system.                                                                       |
| **label**<br />`MessageDescriptor`                                     | A translation object to display what the modifier is called.                                                                                   |
| **isValidEventKey**<br />`(event: KeyboardEvent) => boolean`           | Returns a boolean that indicates whether a keyboard event should trigger this modifier. Used for keyboard shortcuts (e.g., `Ctrl+B` for bold). |
| **checkIsActive**<br />`(editor: Editor) => boolean`                   | Returns a boolean that indicates whether the modifier is currently active on the selection.                                                    |
| **handleToggle**<br />`(editor: Editor) => void`                       | Customizes the logic ran when toggling the modifier on or off.                                                                                 |

```tsx
const modifiers = {
  bold: {
    renderLeaf: (children) => <BoldText>{children}</BoldText>,
    icon: Bold,
    label: {
      id: 'components.Blocks.modifiers.bold',
      defaultMessage: 'Bold',
    },
    isValidEventKey: (event) => event.key === 'b',
    checkIsActive: (editor) => Boolean(Editor.marks(editor)?.bold),
    handleToggle: (editor) => {
      if (Editor.marks(editor)?.bold) {
        Editor.removeMark(editor, 'bold');
      } else {
        Editor.addMark(editor, 'bold', true);
      }
    },
  },
};
```
