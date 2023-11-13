import { render, screen } from '@testing-library/react';

import { listBlocks } from '../List';

import { Wrapper } from './Wrapper';

describe('List', () => {
  it('renders an unordered list block properly', () => {
    render(
      listBlocks['list-unordered'].renderElement({
        children: 'list unordered',
        element: {
          type: 'list',
          children: [{ type: 'list-item', children: [{ type: 'text', text: 'list unordered' }] }],
          format: 'unordered',
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        wrapper: Wrapper,
      }
    );

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
  });

  it('renders an ordered list block properly', () => {
    render(
      listBlocks['list-ordered'].renderElement({
        children: 'list ordered',
        element: {
          type: 'list',
          children: [{ type: 'list-item', children: [{ type: 'text', text: 'list ordered' }] }],
          format: 'unordered',
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        wrapper: Wrapper,
      }
    );

    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
  });

  it('renders a list item block properly', () => {
    render(
      listBlocks['list-item'].renderElement({
        children: 'list item',
        element: {
          type: 'list-item',
          children: [{ type: 'text', text: 'list item' }],
        },
        attributes: {
          'data-slate-node': 'element',
          ref: null,
        },
      }),
      {
        wrapper: Wrapper,
      }
    );

    const listItem = screen.getByRole('listitem');
    expect(listItem).toBeInTheDocument();
    expect(listItem).toHaveTextContent('list item');
  });
});
