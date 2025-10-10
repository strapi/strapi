import { Form } from '@strapi/admin/strapi-admin';
import { render as renderRTL } from '@tests/utils';

import { Wysiwyg, WysiwygProps } from '../Field';

/**
 * TODO: these should be in the JEST setup.
 */
document.createRange = () => {
  const range = new Range();
  range.getBoundingClientRect = jest.fn();
  // @ts-expect-error – mocking.
  range.getClientRects = jest.fn(() => ({
    item: () => null,
    length: 0,
  }));

  return range;
};

window.focus = jest.fn();

const render = ({
  formInitialValues = {},
  ...props
}: Partial<WysiwygProps> & {
  formInitialValues?: object;
} = {}) =>
  renderRTL(
    <Wysiwyg type="richtext" name="rich-text" label="hello world" disabled={false} {...props} />,
    {
      renderOptions: {
        wrapper: ({ children }) => (
          <Form method="POST" onSubmit={jest.fn()} initialValues={formInitialValues}>
            {children}
          </Form>
        ),
      },
    }
  );

describe('Wysiwyg render and actions buttons', () => {
  /**
   * There's a warning about our sanitizeHtml function that we allow `script`
   * and `style` tags, yet there's no tests or comments as to why we allow everything
   * or rather if we should keep allowing everything as the library goes.
   *
   * So, this just shuts the console up for us 🤷🏻‍♀️
   */
  const originalWarn = console.warn;

  beforeAll(() => {
    console.warn = jest.fn();
  });

  afterAll(() => {
    console.warn = originalWarn;
  });

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
      const hasText = (node: Element | null) =>
        node ? node.textContent === '<u>Underline</u>' : false;
      const nodeHasText = hasText(node);
      // eslint-disable-next-line testing-library/no-node-access
      const childrenDontHaveText = Array.from(node?.children ?? []).every(
        (child) => !hasText(child)
      );

      return nodeHasText && childrenDontHaveText;
    });

    expect(hasUnderlineMarkdown).toBeInTheDocument();
  });

  it('should render strikethrough markdown when clicking the strikethrough button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'Strikethrough' }));

    expect(getByText('~~Strikethrough~~')).toBeInTheDocument();
  });

  it('should render bullet list markdown when clicking the bullet list button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'Bulleted list' }));

    expect(getByText('-')).toBeInTheDocument();
  });

  it('should render number list markdown when clicking the number list button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'Numbered list' }));

    expect(getByText('1.')).toBeInTheDocument();
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

    await user.click(getByRole('button', { name: 'Link' }));

    expect(getByText('[Link](link)')).toBeInTheDocument();
  });

  it('should render quote markdown when clicking the quote button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('button', { name: 'Quote' }));

    expect(getByText('>Quote')).toBeInTheDocument();
  });

  it('should render Heading 1 markdown when clicking the Heading 1 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Headings' }));
    await user.click(getByRole('option', { name: 'Heading 1' }));

    expect(getByText('#')).toBeInTheDocument();
  });

  it('should render Heading 2 markdown when clicking the Heading 2 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Headings' }));
    await user.click(getByRole('option', { name: 'Heading 2' }));

    expect(getByText('##')).toBeInTheDocument();
  });

  it('should render Heading 3 markdown when clicking the Heading 3 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Headings' }));
    await user.click(getByRole('option', { name: 'Heading 3' }));

    expect(getByText('###')).toBeInTheDocument();
  });

  it('should render Heading 4 markdown when clicking the Heading 4 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Headings' }));
    await user.click(getByRole('option', { name: 'Heading 4' }));

    expect(getByText('####')).toBeInTheDocument();
  });

  it('should render Heading 5 markdown when clicking the Heading 5 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Headings' }));
    await user.click(getByRole('option', { name: 'Heading 5' }));

    expect(getByText('#####')).toBeInTheDocument();
  });

  it('should render Heading 6 markdown when clicking the Heading 6 button', async () => {
    const { user, getByText, getByRole } = render();

    await user.click(getByRole('combobox', { name: 'Headings' }));
    await user.click(getByRole('option', { name: 'Heading 6' }));

    expect(getByText('######')).toBeInTheDocument();
  });

  it('should render Heading 1 markdown when clicking the Heading 4 button then clicking on the Heading 1 button', async () => {
    const { user, getByText, getByRole, queryByText } = render();

    await user.click(getByRole('combobox', { name: 'Headings' }));
    await user.click(getByRole('option', { name: 'Heading 1' }));
    await user.click(getByRole('combobox', { name: 'Headings' }));
    await user.click(getByRole('option', { name: 'Heading 4' }));
    await user.click(getByRole('combobox', { name: 'Headings' }));
    await user.click(getByRole('option', { name: 'Heading 1' }));

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

  it('should disable titles buttons when editor is on preview mode', async () => {
    const { user, getByRole } = render();

    await user.click(getByRole('button', { name: /Preview/ }));

    expect(getByRole('combobox', { name: 'Headings' })).toHaveAttribute('aria-disabled', 'true');
  });
});

// FIXME
describe.skip('Wysiwyg expand mode', () => {
  it('should open wysiwyg expand portal when clicking on expand button', async () => {
    const { queryByTestId, getByTestId } = render();

    expect(queryByTestId('wysiwyg-expand')).not.toBeInTheDocument();

    // await user.click(container.querySelector('#expand'));

    expect(getByTestId('wysiwyg-expand')).toBeInTheDocument();
  });

  it('should close wysiwyg expand portal when clicking on collapse button', async () => {
    const { queryByTestId } = render();

    // fireEvent.click(container.querySelector('#expand'));
    // fireEvent.click(getByText('Collapse'));

    expect(queryByTestId('wysiwyg-expand')).not.toBeInTheDocument();
  });
});

describe('Wysiwyg error state', () => {
  // TODO: re-add this test when we have a way to test the error state.
  it.skip('should show error message', async () => {
    const { getByText } = render();

    expect(getByText('This is a required field')).toBeInTheDocument();
  });
});
