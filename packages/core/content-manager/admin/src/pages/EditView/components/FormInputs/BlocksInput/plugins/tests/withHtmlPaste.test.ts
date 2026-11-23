import { createEditor, Editor, Node, Transforms } from 'slate';
import { withHistory } from 'slate-history';
import { withReact } from 'slate-react';

import { defaultBlocksStore } from '../../DefaultBlocksStore';
import { withHtmlPaste } from '../withHtmlPaste';
import { withStrapiSchema } from '../withStrapiSchema';

const clipboard = (data: Record<string, string>) =>
  ({
    types: Object.keys(data),
    getData: (type: string) => data[type] ?? '',
  }) as unknown as DataTransfer;

const setup = (
  children: Editor['children'],
  blocks: typeof defaultBlocksStore = defaultBlocksStore
) => {
  const editor = withHtmlPaste(blocks)(withReact(withStrapiSchema(withHistory(createEditor()))));
  editor.children = children;

  return editor;
};

describe('withHtmlPaste', () => {
  it('inserts a single pasted paragraph at the caret, without creating a block', () => {
    const editor = setup([
      { type: 'paragraph', children: [{ type: 'text', text: 'Hello world' }] },
    ]);
    Transforms.select(editor, { path: [0, 0], offset: 6 });

    editor.insertData(clipboard({ 'text/html': '<p><b>big</b> </p>', 'text/plain': 'big ' }));

    expect(editor.children).toEqual([
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: 'Hello ' },
          { type: 'text', text: 'big', bold: true },
          { type: 'text', text: 'world' },
        ],
      },
    ]);
  });

  it('splits the current paragraph around several pasted blocks', () => {
    const editor = setup([{ type: 'paragraph', children: [{ type: 'text', text: 'Startend' }] }]);
    Transforms.select(editor, { path: [0, 0], offset: 5 });

    editor.insertData(
      clipboard({
        'text/html': '<p>one</p><h2>two</h2><p>three</p>',
        'text/plain': 'one\ntwo\nthree',
      })
    );

    expect(editor.children).toEqual([
      { type: 'paragraph', children: [{ type: 'text', text: 'Start' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'one' }] },
      { type: 'heading', level: 2, children: [{ type: 'text', text: 'two' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'three' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'end' }] },
    ]);
    expect(editor.selection?.anchor).toEqual({ path: [3, 0], offset: 5 });
  });

  it.each([
    ['start', 0, ['pasted', 'Text']],
    ['end', 4, ['Text', 'pasted']],
  ])(
    'inserts the blocks without an empty block when the caret is at the %s',
    (_, offset, order) => {
      const editor = setup([{ type: 'paragraph', children: [{ type: 'text', text: 'Text' }] }]);
      Transforms.select(editor, { path: [0, 0], offset });

      editor.insertData(clipboard({ 'text/html': '<h1>pasted</h1><p>pasted</p>' }));

      expect(editor.children.map((node) => Node.string(node))).toEqual(
        order[0] === 'Text' ? ['Text', 'pasted', 'pasted'] : ['pasted', 'pasted', 'Text']
      );
    }
  );

  it('replaces the empty paragraph the caret is in', () => {
    const editor = setup([{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]);
    Transforms.select(editor, { path: [0, 0], offset: 0 });

    editor.insertData(clipboard({ 'text/html': '<h1>Title</h1><ul><li>item</li></ul>' }));

    expect(editor.children).toEqual([
      { type: 'heading', level: 1, children: [{ type: 'text', text: 'Title' }] },
      {
        type: 'list',
        format: 'unordered',
        indentLevel: 0,
        children: [{ type: 'list-item', children: [{ type: 'text', text: 'item' }] }],
      },
    ]);
  });

  it('only creates root blocks when pasting a list into a list', () => {
    const editor = setup([
      {
        type: 'list',
        format: 'unordered',
        children: [{ type: 'list-item', children: [{ type: 'text', text: 'firstsecond' }] }],
      },
    ]);
    Transforms.select(editor, { path: [0, 0, 0], offset: 5 });

    editor.insertData(clipboard({ 'text/html': '<p>intro</p><ol><li>a</li><li>b</li></ol>' }));

    expect(editor.children.map((node) => (node as { type: string }).type)).toEqual([
      'list',
      'paragraph',
      'list',
      'list',
    ]);
    expect(Node.string(editor.children[0])).toBe('first');
    expect(Node.string(editor.children[3])).toBe('second');
  });

  describe('splitting a list between its items', () => {
    const list = (...items: string[]) =>
      [
        {
          type: 'list',
          format: 'unordered',
          children: items.map((text) => ({
            type: 'list-item',
            children: [{ type: 'text', text }],
          })),
        },
      ] as Editor['children'];
    const items = (node: Node) =>
      (node as { children: Node[] }).children.map((item) => Node.string(item));
    const paste = (editor: Editor) =>
      editor.insertData(clipboard({ 'text/html': '<h2>X</h2><p>Y</p>' }));

    it('leaves no empty item when the caret is at the end of an item that is not the last', () => {
      const editor = setup(list('a', 'bb', 'c'));
      Transforms.select(editor, { path: [0, 0, 0], offset: 1 });

      paste(editor);

      expect(editor.children.map((node) => (node as { type: string }).type)).toEqual([
        'list',
        'heading',
        'paragraph',
        'list',
      ]);
      expect(items(editor.children[0])).toEqual(['a']);
      expect(items(editor.children[3])).toEqual(['bb', 'c']);
    });

    it('leaves no empty item when the caret is at the start of an item that is not the first', () => {
      const editor = setup(list('a', 'bb', 'c'));
      Transforms.select(editor, { path: [0, 1, 0], offset: 0 });

      paste(editor);

      expect(items(editor.children[0])).toEqual(['a']);
      expect(items(editor.children[3])).toEqual(['bb', 'c']);
    });

    it('still splits the item the caret is in the middle of', () => {
      const editor = setup(list('a', 'bbbb', 'c'));
      Transforms.select(editor, { path: [0, 1, 0], offset: 2 });

      paste(editor);

      expect(items(editor.children[0])).toEqual(['a', 'bb']);
      expect(items(editor.children[3])).toEqual(['bb', 'c']);
    });
  });

  it('reverts the whole paste in one undo step', () => {
    const initial: Editor['children'] = [
      { type: 'paragraph', children: [{ type: 'text', text: 'Before' }] },
    ];
    const editor = setup(structuredClone(initial));
    Transforms.select(editor, Editor.end(editor, []));

    editor.insertData(
      clipboard({
        'text/html': '<p>1</p><p>2</p><ul><li>3</li></ul><h1>4</h1><blockquote>5</blockquote>',
      })
    );
    expect(editor.children.length).toBeGreaterThan(1);

    editor.undo();

    expect(editor.children).toEqual(initial);
  });

  it('lets Slate handle content copied from a Blocks editor', () => {
    const editor = setup([{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]);
    const insertFragmentData = jest.spyOn(editor, 'insertFragmentData').mockReturnValue(true);

    editor.insertData(
      clipboard({
        'application/x-slate-fragment': 'encoded',
        'text/html': '<p>copied</p>',
      })
    );

    expect(insertFragmentData).toHaveBeenCalled();
  });

  it('falls back to plain text when there is no html', () => {
    const editor = setup([{ type: 'paragraph', children: [{ type: 'text', text: '' }] }]);
    Transforms.select(editor, { path: [0, 0], offset: 0 });

    editor.insertData(clipboard({ 'text/plain': 'one\ntwo\nthree' }));

    expect(editor.children).toEqual([
      { type: 'paragraph', children: [{ type: 'text', text: 'one' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'two' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'three' }] },
    ]);
  });

  it('turns blocks the project removed into paragraphs, and links into text', () => {
    const { quote: _quote, link: _link, ...blocks } = defaultBlocksStore;
    const editor = setup(
      [{ type: 'paragraph', children: [{ type: 'text', text: '' }] }],
      blocks as typeof defaultBlocksStore
    );
    Transforms.select(editor, { path: [0, 0], offset: 0 });

    editor.insertData(
      clipboard({
        'text/html':
          '<h1>Title</h1><blockquote>Quoted <a href="https://strapi.io">link</a></blockquote>',
      })
    );

    expect(editor.children).toEqual([
      { type: 'heading', level: 1, children: [{ type: 'text', text: 'Title' }] },
      { type: 'paragraph', children: [{ type: 'text', text: 'Quoted link' }] },
    ]);
  });
});
