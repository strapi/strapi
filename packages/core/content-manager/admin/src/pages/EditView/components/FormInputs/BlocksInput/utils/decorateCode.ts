import * as Prism from 'prismjs';
import { BaseRange, Element, Node, NodeEntry } from 'slate';
import './prismLanguages';

import { codeLanguages } from './constants';

type BaseRangeCustom = BaseRange & { className: string };

export const decorateCode = ([node, path]: NodeEntry) => {
  const ranges: BaseRangeCustom[] = [];

  // make sure it is an Slate Element
  if (!Element.isElement(node) || node.type !== 'code') return ranges;
  // transform the Element into a string
  const text = Node.string(node);
  const decorateKey = codeLanguages.find((lang) => lang.value === node.language)?.decorate;

  const selectedLanguage = Prism.languages[decorateKey || 'plaintext'];

  // create "tokens" with "prismjs" and put them in "ranges"
  const tokens = Prism.tokenize(text, selectedLanguage);
  let start = 0;
  for (const token of tokens) {
    const length = token.length;
    const end = start + length;
    if (typeof token !== 'string') {
      ranges.push({
        anchor: { path, offset: start },
        focus: { path, offset: end },
        className: `token ${token.type}`,
      });
    }
    start = end;
  }

  // these will be found in "renderLeaf" in "leaf" and their "className" will be applied
  return ranges;
};
