import * as React from 'react';
import { IntlProvider } from 'react-intl';
import { render as renderRTL } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import Wysiwyg from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useLibrary: () => ({ components: {} }),
}));

/**
 * TODO: these should be in the JEST setup.
 */
document.createRange = () => {
  const range = new Range();
  range.getBoundingClientRect = jest.fn();
  range.getClientRects = jest.fn(() => ({
    item: () => null,
    length: 0,
  }));

  return range;
};

window.focus = jest.fn();

const render = ({ onChange = jest.fn(), ...restProps } = {}) => ({
  user: userEvent.setup(),
  ...renderRTL(
    <Wysiwyg
      name="rich-text"
      intlLabel={{ id: 'hello world', defaultMessage: 'hello world' }}
      onChange={onChange}
      disabled={false}
      {...restProps}
    />,
    {
      wrapper: ({ children }) => (
        <ThemeProvider theme={lightTheme}>
          <IntlProvider messages={{}} locale="en">
            {children}
          </IntlProvider>
        </ThemeProvider>
      ),
    }
  ),
});

describe('Wysiwyg render and actions buttons', () => {
  it('should render the Wysiwyg', async () => {
    const { getByText } = render();

    expect(getByText('hello world')).toBeInTheDocument();
  });

  it('should render bold markdown when clicking the bold button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'Bold' }));

    expect(getByText('**Bold**')).toBeInTheDocument();
  });

  it('should render italic markdown when clicking the italic button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'Italic' }));

    expect(getByText('_Italic_')).toBeInTheDocument();
  });

  it('should render underline markdown when clicking the underline button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'Underline' }));

    const hasUnderlineMarkdown = getByText((content, node) => {
      const hasText = (node) => node.textContent === '<u>Underline</u>';
      const nodeHasText = hasText(node);
      const childrenDontHaveText = Array.from(node.children).every((child) => !hasText(child));

      return nodeHasText && childrenDontHaveText;
    });

    expect(hasUnderlineMarkdown).toBeInTheDocument();
  });

  it('should render strikethrough markdown when clicking the strikethrough button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'More' }));
    await user.click(getByRole('button', { name: 'Strikethrough' }));

    expect(getByText('~~Strikethrough~~')).toBeInTheDocument();
  });

  it('should render bullet list markdown when clicking the bullet list button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'More' }));
    await user.click(getByRole('button', { name: 'BulletList' }));

    expect(getByText('-')).toBeInTheDocument();
  });

  it('should render number list markdown when clicking the number list button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'More' }));
    await user.click(getByRole('button', { name: 'NumberList' }));

    expect(getByText('1.')).toBeInTheDocument();
  });

  it('should render code markdown when clicking the code button', async () => {
    const onChange = jest.fn();
    const { user, getByRole } = render({ onChange });

    await user.click(getByRole('button', { name: 'More' }));
    await user.click(getByRole('button', { name: 'Code' }));

    const expected = `
\`\`\`
Code
\`\`\``;

    expect(onChange).toHaveBeenNthCalledWith(2, {
      target: {
        name: 'rich-text',
        type: 'wysiwyg',
        value: expected,
      },
    });
  });

  // it('should render image markdown when clicking the image button', async () => {
  //
  //   fireEvent.click(renderedContainer.querySelector('#more'));
  //   fireEvent.click(document.getElementById('Image'));
  //   fireEvent.click(document.getElementById('media-library'));
  //   fireEvent.click(document.getElementById('insert-button'));

  //   expect(getByText('[sunset](http://localhost:3000/sunsetimage)')).toBeInTheDocument();
  // });

  it('should render link markdown when clicking the link button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'More' }));
    await user.click(getByRole('button', { name: 'Link' }));

    expect(getByText('[Link](link)')).toBeInTheDocument();
  });

  it('should render quote markdown when clicking the quote button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'More' }));
    await user.click(getByRole('button', { name: 'Quote' }));

    expect(getByText('>Quote')).toBeInTheDocument();
  });

  it('should render h1 markdown when clicking the h1 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Add a title' }));
    await user.click(getByRole('option', { name: 'h1' }));

    expect(getByText('#')).toBeInTheDocument();
  });

  it('should render h2 markdown when clicking the h2 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Add a title' }));
    await user.click(getByRole('option', { name: 'h2' }));

    expect(getByText('##')).toBeInTheDocument();
  });

  it('should render h3 markdown when clicking the h3 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Add a title' }));
    await user.click(getByRole('option', { name: 'h3' }));

    expect(getByText('###')).toBeInTheDocument();
  });

  it('should render h4 markdown when clicking the h4 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Add a title' }));
    await user.click(getByRole('option', { name: 'h4' }));

    expect(getByText('####')).toBeInTheDocument();
  });

  it('should render h5 markdown when clicking the h5 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Add a title' }));
    await user.click(getByRole('option', { name: 'h5' }));

    expect(getByText('#####')).toBeInTheDocument();
  });

  it('should render h6 markdown when clicking the h6 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Add a title' }));
    await user.click(getByRole('option', { name: 'h6' }));

    expect(getByText('######')).toBeInTheDocument();
  });

  it('should render h1 markdown when clicking the h4 button then clicking on the h1 button', async () => {
    const { user, getByText, getByRole, queryByText } = render();

    await user.click(getByRole('combobox', { name: 'Add a title' }));
    await user.click(getByRole('option', { name: 'h1' }));
    await user.click(getByRole('combobox', { name: 'Add a title' }));
    await user.click(getByRole('option', { name: 'h4' }));
    await user.click(getByRole('combobox', { name: 'Add a title' }));
    await user.click(getByRole('option', { name: 'h1' }));

    expect(queryByText('####')).not.toBeInTheDocument();
    expect(getByText('#')).toBeInTheDocument();
  });

  // PREVIEW MODE TESTS

  it('should disable bold button when editor is on preview mode', async () => {
    const { user, getByRole } = render();

    await user.click(getByRole('button', { name: /Preview/ }));
    expect(getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('should disable italic button when editor is on preview mode', async () => {
    const { user, getByRole } = render();

    await user.click(getByRole('button', { name: /Preview/ }));
    expect(getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('should disable underline button when editor is on preview mode', async () => {
    const { user, getByRole } = render();

    await user.click(getByRole('button', { name: /Preview/ }));

    expect(getByRole('button', { name: 'Underline' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('should disabled the more button when editor is on preview mode', async () => {
    const { user, getByRole } = render();

    await user.click(getByRole('button', { name: /Preview/ }));
    expect(getByRole('button', { name: 'More' })).toHaveAttribute('aria-disabled', 'true');
  });

  it('should disable titles buttons when editor is on preview mode', async () => {
    const { user, getByRole } = render();

    await user.click(getByRole('button', { name: /Preview/ }));

    expect(getByRole('combobox', { name: 'Add a title' })).toHaveAttribute('aria-disabled', 'true');
  });
});

// FIXME
describe.skip('Wysiwyg expand mode', () => {
  it('should open wysiwyg expand portal when clicking on expand button', async () => {
    const { getByTestId } = render();

    expect(getByTestId('wysiwyg-expand')).not.toBeInTheDocument();

    // await user.click(container.querySelector('#expand'));

    expect(getByTestId('wysiwyg-expand')).toBeInTheDocument();
  });

  it('should close wysiwyg expand portal when clicking on collapse button', async () => {
    const { getByTestId } = render();

    // fireEvent.click(container.querySelector('#expand'));
    // fireEvent.click(getByText('Collapse'));

    expect(getByTestId('wysiwyg-expand')).not.toBeInTheDocument();
  });
});

describe('Wysiwyg error state', () => {
  it('should show error message', async () => {
    const { getByText } = render({
      error: 'This is a required field',
    });

    expect(getByText('This is a required field')).toBeInTheDocument();
  });
});
