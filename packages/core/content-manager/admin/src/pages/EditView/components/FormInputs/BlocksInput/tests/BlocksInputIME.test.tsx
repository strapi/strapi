/* eslint-disable testing-library/no-node-access */
import * as React from 'react';

import { Form } from '@strapi/admin/strapi-admin';
import { createEvent } from '@testing-library/react';
import { render, screen, fireEvent } from '@tests/utils';

import { BlocksInput } from '../BlocksInput';

// Mock Component
const MockEditable = ({ onKeyDown }: { onKeyDown: React.KeyboardEventHandler }) => (
  <textarea data-testid="mock-editable" onKeyDown={onKeyDown} />
);

jest.mock('slate-react', () => ({
  ...jest.requireActual('slate-react'),
  Editable: (props: any) => <MockEditable {...props} />,
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useElementOnScreen: jest.fn(() => ({ current: null })),
}));

// Test Helper
const renderBlocksInput = (initialValues: any) => {
  return render(
    <BlocksInput
      label="blocks type"
      name="blocks-editor"
      hint="blocks description"
      placeholder="blocks placeholder"
      disabled={false}
      type="blocks"
    />,
    {
      renderOptions: {
        wrapper: ({ children }) => (
          <Form method="POST" onSubmit={jest.fn()} initialValues={initialValues}>
            {children}
          </Form>
        ),
      },
    }
  );
};

describe('BlocksInput IME', () => {
  it('should not prevent default behavior when pressing Enter during composition', async () => {
    const initialValues = {
      'blocks-editor': [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Hello' }],
        },
      ],
    };

    renderBlocksInput(initialValues);

    const editor = await screen.findByTestId('mock-editable');

    const event = createEvent.keyDown(editor, {
      key: 'Enter',
      keyCode: 13,
      isComposing: true,
    });

    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    fireEvent(editor, event);

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('should prevent default behavior (split block) when pressing Enter NOT during composition', async () => {
    const initialValues = {
      'blocks-editor': [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'World' }],
        },
      ],
    };

    renderBlocksInput(initialValues);

    const editor = await screen.findByTestId('mock-editable');

    const event = createEvent.keyDown(editor, {
      key: 'Enter',
      keyCode: 13,
      isComposing: false,
    });

    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    fireEvent(editor, event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });
});

