import * as React from 'react';

import { lightTheme, ThemeProvider } from '@strapi/design-system';
import { render, screen } from '@testing-library/react';
import PropTypes from 'prop-types';
import { IntlProvider } from 'react-intl';
import { createEditor } from 'slate';
import { Slate, withReact } from 'slate-react';

import { BlocksToolbar } from '..';

const initialValue = [
  {
    type: 'paragraph',
    children: [
      { text: 'A line of text in a paragraph.' },
      { text: 'Some of it bold!', bold: true },
    ],
  },
];

const Wrapper = ({ children }) => {
  const [editor] = React.useState(() => withReact(createEditor()));

  return (
    <ThemeProvider theme={lightTheme}>
      <IntlProvider messages={{}} locale="en">
        <Slate initialValue={initialValue} editor={editor}>
          {children}
        </Slate>
      </IntlProvider>
    </ThemeProvider>
  );
};

Wrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

const setup = () =>
  render(<BlocksToolbar />, {
    wrapper: Wrapper,
  });

describe('BlocksEditor toolbar', () => {
  it('should render the toolbar', () => {
    setup();

    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('should toggle the bold modifier', () => {
    setup();

    const boldButton = screen.getByRole('button', { name: /bold/i });
    expect(boldButton).toBeInTheDocument();
  });
});
