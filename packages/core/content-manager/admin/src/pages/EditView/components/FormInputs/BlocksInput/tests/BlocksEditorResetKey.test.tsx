/* eslint-disable testing-library/no-node-access */
/* eslint-disable check-file/filename-naming-convention */

import * as React from 'react';

import { act, render, screen } from '@tests/utils';
import { type Editor, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';

import { BlocksEditor } from '../BlocksEditor';
import { defaultBlocksStore } from '../DefaultBlocksStore';

import type { Schema } from '@strapi/types';

// Capture the editor instances created by BlocksEditor so tests can inspect and drive them
const createdEditors: Editor[] = [];

jest.mock('slate', () => {
  const actual = jest.requireActual('slate');
  return {
    ...actual,
    createEditor: () => {
      const editor = actual.createEditor();
      createdEditors.push(editor);
      return editor;
    },
  };
});

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useElementOnScreen: jest.fn(() => ({ current: null })),
  useIsMobile: jest.fn().mockReturnValue(false),
  useStrapiApp: jest
    .fn()
    .mockImplementation((_name: string, selector: (state: unknown) => unknown) =>
      selector({
        plugins: {
          'content-manager': {
            apis: { getRichTextBlocks: () => ({ ...defaultBlocksStore }) },
          },
        },
      })
    ),
}));

const paragraph = (text: string): Schema.Attribute.BlocksValue => [
  {
    type: 'paragraph',
    children: [{ type: 'text', text }],
  },
];

const setup = (value: Schema.Attribute.BlocksValue) => {
  const onChange = jest.fn();

  const result = render(
    <BlocksEditor
      name="blocks-editor"
      value={value}
      onChange={onChange}
      error={undefined}
      ariaLabelId="blocks-editor-label"
    />
  );

  return { ...result, onChange, editor: createdEditors[createdEditors.length - 1] };
};

describe('BlocksEditor value reset', () => {
  beforeAll(() => {
    // jsdom's Range lacks getBoundingClientRect, which the editor's scroll-into-view code needs
    Range.prototype.getBoundingClientRect = jest.fn(() => ({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: 0,
      height: 0,
      toJSON: jest.fn(),
    }));
  });

  beforeEach(() => {
    createdEditors.length = 0;
  });

  it('does not remount the editor when the value prop is a new reference with equal content', async () => {
    const { rerender, onChange } = setup(paragraph('Some content'));

    const editable = await screen.findByRole('textbox');

    // Same content, new identity — like the form echoing the editor's own state back
    rerender(
      <BlocksEditor
        name="blocks-editor"
        value={paragraph('Some content')}
        onChange={onChange}
        error={undefined}
        ariaLabelId="blocks-editor-label"
      />
    );

    // The Slate subtree must not have been remounted, otherwise pending input and
    // the DOM under the user's caret would be wiped
    expect(screen.getByRole('textbox')).toBe(editable);
    expect(screen.getByText('Some content')).toBeInTheDocument();
  });

  it('drops a stale selection when an external value change forces a remount', async () => {
    const initialText = 'A line of text long enough';
    const { rerender, onChange, editor } = setup(paragraph(initialText));

    await screen.findByRole('textbox');

    // Focus and place the selection at the end of the current content, like a user typing.
    // Focus matters: the "sync after discard" effect already deselects a blurred editor, so
    // the crash only reproduces while the editor is focused.
    act(() => {
      ReactEditor.focus(editor);
      Transforms.select(editor, { path: [0, 0], offset: initialText.length });
    });

    // External update with shorter content (e.g. discard, fill from another locale).
    // Without deselecting first, the surviving selection points past the new content
    // and slate-react crashes with "Cannot resolve a DOM point from Slate point".
    rerender(
      <BlocksEditor
        name="blocks-editor"
        value={paragraph('Hi')}
        onChange={onChange}
        error={undefined}
        ariaLabelId="blocks-editor-label"
      />
    );

    expect(editor.selection).toBeNull();
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });
});
