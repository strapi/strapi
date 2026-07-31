/* eslint-disable check-file/filename-naming-convention */
import * as React from 'react';

import { act, render, screen } from '@tests/utils';
import { type Descendant, type Editor, createEditor, Transforms } from 'slate';
import { ReactEditor } from 'slate-react';

import { BlocksEditor } from '../BlocksEditor';
import { defaultBlocksStore } from '../DefaultBlocksStore';

jest.mock('slate', () => {
  const actual = jest.requireActual('slate');

  return {
    ...actual,
    createEditor: jest.fn(),
  };
});

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
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
  useIsMobile: jest.fn().mockReturnValue(false),
}));

const { createEditor: actualCreateEditor } = jest.requireActual('slate');

const styledValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [
      { type: 'text', text: 'answer ' },
      { type: 'text', text: 'answer ', bold: true },
      { type: 'text', text: 'answer ', italic: true },
      { type: 'text', text: 'answer', underline: true },
    ],
  },
];

const collapsedValue: Descendant[] = [
  {
    type: 'paragraph',
    children: [{ type: 'text', text: '' }],
  },
];

let baseEditor: Editor;

const ControlledEditor = () => {
  const [value, setValue] = React.useState(styledValue);

  return (
    <>
      <button type="button" onClick={() => setValue(collapsedValue)}>
        collapse
      </button>
      <BlocksEditor
        name="content"
        // @ts-expect-error the styled test value is close enough to a BlocksValue for the editor
        value={value}
        onChange={jest.fn()}
        ariaLabelId="label"
      />
    </>
  );
};

const setup = () => {
  baseEditor = actualCreateEditor();
  (createEditor as jest.Mock).mockReturnValue(baseEditor);

  return render(<ControlledEditor />);
};

describe('BlocksEditor', () => {
  beforeAll(() => {
    Range.prototype.getBoundingClientRect = () => ({}) as DOMRect;
    Range.prototype.getClientRects = () =>
      ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as DOMRectList;
  });

  beforeEach(() => {
    jest.spyOn(ReactEditor, 'isFocused').mockReturnValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not crash when the value collapses to a shorter tree while a stale selection points past it', async () => {
    const { user } = setup();

    await act(async () => {
      Transforms.select(baseEditor, { path: [0, 3], offset: 0 });
    });
    expect(baseEditor.selection).not.toBeNull();

    await user.click(screen.getByRole('button', { name: 'collapse' }));

    expect(baseEditor.selection).toBeNull();
    expect(screen.getByRole('button', { name: 'collapse' })).toBeInTheDocument();
  });
});
