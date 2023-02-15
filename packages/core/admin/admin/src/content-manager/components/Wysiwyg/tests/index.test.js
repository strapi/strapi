import * as React from 'react';
import { IntlProvider } from 'react-intl';
import { render, waitFor, fireEvent, screen } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';
import Wysiwyg from '../index';

jest.mock('@strapi/helper-plugin', () => ({
  ...jest.requireActual('@strapi/helper-plugin'),
  useLibrary: () => ({ components: {} }),
}));

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

describe('Wysiwyg render and actions buttons', () => {
  let renderedContainer;
  let getContainerByText;
  let containerQueryByText;
  let returnedValue;

  beforeEach(() => {
    const onChange = jest.fn((e) => {
      returnedValue = e.target.value;
    });

    const { container, getByText, queryByText } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider messages={{}} locale="en">
          <Wysiwyg
            name="rich-text"
            intlLabel={{ id: 'hello world', defaultMessage: 'hello world' }}
            onChange={onChange}
            disabled={false}
          />
        </IntlProvider>
      </ThemeProvider>
    );
    renderedContainer = container;
    getContainerByText = getByText;
    containerQueryByText = queryByText;
  });

  it('should render the Wysiwyg', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));

    expect(getContainerByText('hello world')).toBeInTheDocument();
    expect(renderedContainer.firstChild).toMatchSnapshot();
  });

  it('should render bold markdown when clicking the bold button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#Bold'));

    expect(getContainerByText('**Bold**')).toBeInTheDocument();
  });

  it('should render italic markdown when clicking the italic button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#Italic'));

    expect(getContainerByText('_Italic_')).toBeInTheDocument();
  });

  it('should render underline markdown when clicking the underline button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#Underline'));

    const hasUnderlineMarkdown = getContainerByText((content, node) => {
      const hasText = (node) => node.textContent === '<u>Underline</u>';
      const nodeHasText = hasText(node);
      const childrenDontHaveText = Array.from(node.children).every((child) => !hasText(child));

      return nodeHasText && childrenDontHaveText;
    });

    expect(hasUnderlineMarkdown).toBeInTheDocument();
  });

  it('should render strikethrough markdown when clicking the strikethrough button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('Strikethrough'));

    expect(getContainerByText('~~Strikethrough~~')).toBeInTheDocument();
  });

  it('should render bullet list markdown when clicking the bullet list button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('BulletList'));

    expect(getContainerByText('-')).toBeInTheDocument();
  });

  it('should render number list markdown when clicking the number list button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('NumberList'));

    expect(getContainerByText('1.')).toBeInTheDocument();
  });

  it('should render code markdown when clicking the code button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('Code'));

    const expected = `
\`\`\`
Code
\`\`\``;

    expect(returnedValue).toEqual(expected);
  });

  // it('should render image markdown when clicking the image button', async () => {
  //   await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
  //   fireEvent.click(renderedContainer.querySelector('#more'));
  //   fireEvent.click(document.getElementById('Image'));
  //   fireEvent.click(document.getElementById('media-library'));
  //   fireEvent.click(document.getElementById('insert-button'));

  //   expect(getContainerByText('[sunset](http://localhost:3000/sunsetimage)')).toBeInTheDocument();
  // });

  it('should render link markdown when clicking the link button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('Link'));

    expect(getContainerByText('[Link](link)')).toBeInTheDocument();
  });

  it('should render quote markdown when clicking the quote button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#more'));
    fireEvent.click(document.getElementById('Quote'));

    expect(getContainerByText('>Quote')).toBeInTheDocument();
  });

  it('should render h1 markdown when clicking the h1 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h1'));

    expect(getContainerByText('#')).toBeInTheDocument();
  });

  it('should render h2 markdown when clicking the h2 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h2'));

    expect(getContainerByText('##')).toBeInTheDocument();
  });

  it('should render h3 markdown when clicking the h3 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h3'));

    expect(getContainerByText('###')).toBeInTheDocument();
  });

  it('should render h4 markdown when clicking the h4 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h4'));

    expect(getContainerByText('####')).toBeInTheDocument();
  });

  it('should render h5 markdown when clicking the h5 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h5'));

    expect(getContainerByText('#####')).toBeInTheDocument();
  });

  it('should render h6 markdown when clicking the h6 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h6'));

    expect(getContainerByText('######')).toBeInTheDocument();
  });

  it('should render h1 markdown when clicking the h4 button then clicking on the h1 button', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h1'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h4'));
    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    fireEvent.click(getContainerByText('h1'));

    expect(containerQueryByText('####')).not.toBeInTheDocument();
    expect(getContainerByText('#')).toBeInTheDocument();
  });

  // PREVIEW MODE TESTS

  it('should disable bold button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#Bold'));

    expect(containerQueryByText('**Bold**')).not.toBeInTheDocument();
  });

  it('should disable italic button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#Italic'));

    expect(containerQueryByText('_Italic_')).not.toBeInTheDocument();
  });

  it('should disable underline button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#Underline'));

    const hasUnderlineMarkdown = containerQueryByText((content, node) => {
      const hasText = (node) => node.textContent === '<u>Underline</u>';
      const nodeHasText = hasText(node);
      const childrenDontHaveText = Array.from(node.children).every((child) => !hasText(child));

      return nodeHasText && childrenDontHaveText;
    });

    expect(hasUnderlineMarkdown).not.toBeInTheDocument();
  });

  it('should disable strikethrough button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('Strikethrough')).not.toBeInTheDocument();
  });

  it('should disable bullet list button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('BulletList')).not.toBeInTheDocument();
  });

  it('should disable number list button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('NumbertList')).not.toBeInTheDocument();
  });

  it('should disable code button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('BulletList')).not.toBeInTheDocument();
  });

  it('should disable image button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('Image')).not.toBeInTheDocument();
  });

  it('should disable link button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('Link')).not.toBeInTheDocument();
  });

  it('should disable quote button when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));
    fireEvent.click(renderedContainer.querySelector('#more'));

    expect(document.getElementById('Quote')).not.toBeInTheDocument();
  });

  it('should disable titles buttons when editor is on preview mode', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    fireEvent.click(renderedContainer.querySelector('#preview'));

    fireEvent.mouseDown(renderedContainer.querySelector('#selectTitle'));
    expect(document.getElementById('h1')).not.toBeInTheDocument();
    expect(document.getElementById('h2')).not.toBeInTheDocument();
    expect(document.getElementById('h2')).not.toBeInTheDocument();
    expect(document.getElementById('h3')).not.toBeInTheDocument();
    expect(document.getElementById('h4')).not.toBeInTheDocument();
    expect(document.getElementById('h5')).not.toBeInTheDocument();
    expect(document.getElementById('h6')).not.toBeInTheDocument();
  });
});

describe('Wysiwyg render actions with initial value', () => {
  let renderedContainer;
  let returnedValue = 'hello world';

  beforeEach(() => {
    const onChange = jest.fn((e) => {
      returnedValue += e.target.value;
    });

    const { container } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider messages={{}} locale="en">
          <Wysiwyg
            intlLabel={{ id: 'hello world', defaultMessage: 'hello world' }}
            name="rich-text"
            onChange={onChange}
          />
        </IntlProvider>
      </ThemeProvider>
    );
    renderedContainer = container;
  });

  it('should add markdown with initial value', async () => {
    await waitFor(() => renderedContainer.querySelector('.CodeMirror-cursor'));
    expect(returnedValue).toEqual('hello world');
    const expected = `${returnedValue}**Bold**`;
    fireEvent.click(renderedContainer.querySelector('#Bold'));

    expect(returnedValue).toEqual(expected);
  });
});

function setup() {
  return render(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider messages={{}} locale="en">
        <Wysiwyg
          intlLabel={{ id: 'hello world', defaultMessage: 'hello world' }}
          name="rich-text"
          onChange={jest.fn()}
        />
      </IntlProvider>
    </ThemeProvider>
  );
}

// FIXME
describe.skip('Wysiwyg expand mode', () => {
  it('should open wysiwyg expand portal when clicking on expand button', async () => {
    const { container, getByTestId } = setup();

    await waitFor(() => container.querySelector('.CodeMirror-cursor'));

    screen.logTestingPlaygroundURL();

    expect(getByTestId('wysiwyg-expand')).not.toBeInTheDocument();

    fireEvent.click(container.querySelector('#expand'));
    expect(getByTestId('wysiwyg-expand')).toBeInTheDocument();
  });

  it('should close wysiwyg expand portal when clicking on collapse button', async () => {
    const { container, getByText, getByTestId } = setup();

    await waitFor(() => container.querySelector('.CodeMirror-cursor'));

    fireEvent.click(container.querySelector('#expand'));
    fireEvent.click(getByText('Collapse'));

    expect(getByTestId('wysiwyg-expand')).not.toBeInTheDocument();
  });
});

// FIXME
describe('Wysiwyg error state', () => {
  it('should show error message', async () => {
    const { container, getByText } = render(
      <ThemeProvider theme={lightTheme}>
        <IntlProvider messages={{}} locale="en">
          <Wysiwyg
            intlLabel={{ id: 'richtext', defaultMessage: 'richtext' }}
            name="rich-text"
            onChange={jest.fn()}
            error="This is a required field"
          />
        </IntlProvider>
      </ThemeProvider>
    );

    await waitFor(() => container.querySelector('.CodeMirror-cursor'));
    expect(getByText('This is a required field')).toBeInTheDocument();
  });
});
