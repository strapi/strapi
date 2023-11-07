import { type Attribute } from '@strapi/types';
import { type BaseEditor } from 'slate';
import { type HistoryEditor } from 'slate-history';
import { type ReactEditor } from 'slate-react';

import { type LinkEditor } from './plugins/withLinks';

declare module 'slate' {
  interface CustomTypes {
    Editor: Omit<BaseEditor & ReactEditor & HistoryEditor & LinkEditor, 'children'> & {
      children: Attribute.BlocksValue;
    };
    Element: Attribute.BlocksNode;
    Descendant: Attribute.BlocksInlineNode | Text;
    Text: Attribute.BlocksTextNode;
  }
}
