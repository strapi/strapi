import { Descendant, Transforms, Node } from 'slate';
import { type Editor } from 'slate';
import { jsx } from 'slate-hyperscript';

type TElementTag =
  | 'A'
  | 'BLOCKQUOTE'
  | 'H1'
  | 'H2'
  | 'H3'
  | 'H4'
  | 'H5'
  | 'H6'
  | 'IMG'
  | 'LI'
  | 'OL'
  | 'P'
  | 'PRE'
  | 'UL';
type TTextTag = 'CODE' | 'DEL' | 'EM' | 'I' | 'S' | 'STRONG' | 'U';

const ELEMENT_TAGS = {
  A: (el: HTMLElement) => ({ type: 'link', url: el.getAttribute('href') }),
  BLOCKQUOTE: () => ({ type: 'quote' }),
  H1: () => ({ type: 'heading', level: 1 }),
  H2: () => ({ type: 'heading', level: 2 }),
  H3: () => ({ type: 'heading', level: 3 }),
  H4: () => ({ type: 'heading', level: 4 }),
  H5: () => ({ type: 'heading', level: 5 }),
  H6: () => ({ type: 'heading', level: 6 }),
  IMG: (el: HTMLElement) => ({ type: 'image', url: el.getAttribute('src') }),
  LI: () => ({ type: 'list-item' }),
  UL: () => ({ type: 'list', format: 'unordered' }),
  OL: () => ({ type: 'list', format: 'ordered' }),
  P: () => ({ type: 'paragraph' }),
  PRE: () => ({ type: 'code' }),
};

// COMPAT: `B` is omitted here because Google Docs uses `<b>` in weird ways.
const TEXT_TAGS = {
  CODE: () => ({ code: true }),
  DEL: () => ({ strikethrough: true }),
  EM: () => ({ italic: true }),
  I: () => ({ italic: true }),
  S: () => ({ strikethrough: true }),
  B: () => ({ bold: true }),
  STRONG: () => ({ bold: true }),
  U: () => ({ underline: true }),
};

function getSpan(el: HTMLElement) {
  if (el.style.fontWeight === '700') {
    return { bold: true };
  }
  if (el.style.fontStyle === 'italic') {
    return { italic: true };
  }
}
function isGoogleDoc(el: HTMLElement) {
  return el.nodeName === 'B' && el.style.fontWeight === 'normal';
}

const deserialize = (
  el: ChildNode
): string | null | Descendant | (string | null | { text: string } | Descendant | Node)[] => {
  console.log('------------------------------------------------');
  console.log('------------------------------------------------');
  console.log('------------------------------------------------');
  console.log('el', el);
  console.log('el.nodeType', el.nodeType);
  console.log('el.nodeName', el.nodeName);

  if (el.nodeType === 3) {
    return el.textContent;
  } else if (el.nodeType !== 1) {
    return null;
  } else if (el.nodeName === 'BR') {
    return '\n';
  }

  const { nodeName } = el;
  let parent = el;

  if (nodeName === 'PRE' && el.childNodes[0] && el.childNodes[0].nodeName === 'CODE') {
    parent = el.childNodes[0];
  }
  let children = Array.from(parent.childNodes).map(deserialize).flat();

  if (children.length === 0) {
    children = [{ text: '' }];
  }

  if (nodeName === 'BODY') {
    return jsx('fragment', {}, children);
  }
  if (isGoogleDoc(el as HTMLElement)) {
    return jsx('fragment', {}, children);
  }

  if (nodeName === 'SPAN') {
    console.log('SPAN');
    const attrs = getSpan(el as HTMLElement);
    console.log('attrs', attrs);
    console.log('children', children);
    if (attrs) {
      return children.map((child) => jsx('text', attrs, child));
    }
  }

  if (ELEMENT_TAGS[nodeName as TElementTag]) {
    console.log('ELEMENT TAGS');
    const attrs = ELEMENT_TAGS[nodeName as TElementTag](el as HTMLElement);
    if (children) {
      return jsx('element', attrs, children);
    }
  }

  if (TEXT_TAGS[nodeName as TTextTag]) {
    console.log('TEXT TAGS');
    const attrs = TEXT_TAGS[nodeName as TTextTag]();
    return children.map((child) => jsx('text', attrs, child));
  }

  return children;
};

export function withHtml(editor: Editor) {
  const { insertData, isVoid } = editor;

  editor.isVoid = (element) => {
    return element.type === 'image' ? true : isVoid(element);
  };

  editor.insertData = (data) => {
    const html = data.getData('text/html');

    if (html) {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      const fragment = deserialize(parsed.body);
      console.log('fragment', fragment);
      Transforms.insertFragment(editor, fragment as Node[]);
      return;
    }

    insertData(data);
  };

  return editor;
}
