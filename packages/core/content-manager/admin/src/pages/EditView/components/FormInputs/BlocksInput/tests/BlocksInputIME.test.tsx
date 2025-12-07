/* eslint-disable testing-library/no-node-access */
import * as React from 'react';

import { Form } from '@strapi/admin/strapi-admin';
import { render, screen, fireEvent } from '@tests/utils';
import { createEvent } from '@testing-library/react';

import { BlocksInput } from '../BlocksInput';

import { blocksData } from './mock-schema';

type BlocksEditorProps = React.ComponentProps<typeof BlocksInput>;

const setup = ({
  initialValues = {
    'blocks-editor': blocksData,
  },
  ...props
}: Partial<BlocksEditorProps> & { initialValues?: object } = {}) =>
  render(
    <BlocksInput
      label="blocks type"
      name="blocks-editor"
      hint="blocks description"
      placeholder="blocks placeholder"
      disabled={false}
      type="blocks"
      {...props}
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


const mockEditable = jest.fn(({ onKeyDown }) => (
  <div role="textbox" contentEditable data-testid="mock-editable" onKeyDown={onKeyDown} />
));

jest.mock('slate-react', () => ({
  ...jest.requireActual('slate-react'),
  Editable: (props: any) => mockEditable(props),
}));

jest.mock('@strapi/admin/strapi-admin', () => ({
  ...jest.requireActual('@strapi/admin/strapi-admin'),
  useElementOnScreen: jest.fn(() => ({ current: null })),
}));


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

    setup({ initialValues });

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

    setup({ initialValues });

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
