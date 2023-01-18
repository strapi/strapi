import React from 'react';
import { IntlProvider } from 'react-intl';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { CellContent } from '../CellContent';

const PROPS_FIXTURE = {
  cellType: 'image',
  contentType: 'asset',
  content: {
    alternativeText: 'alternative alt',
    ext: 'jpeg',
    formats: {
      thumbnail: {
        url: 'michka-picture-url-thumbnail.jpeg',
      },
    },
    mime: 'image/jpeg',
    url: 'michka-picture-url-default.jpeg',
  },
  name: 'preview',
};

const ComponentFixture = (props) => {
  const customProps = {
    ...PROPS_FIXTURE,
    ...props,
  };

  return (
    <IntlProvider locale="en" messages={{}}>
      <ThemeProvider theme={lightTheme}>
        <CellContent {...PROPS_FIXTURE} {...customProps} />
      </ThemeProvider>
    </IntlProvider>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

describe('TableList | CellContent', () => {
  it('should render image cell type when element type is asset and mime includes image', () => {
    const { container, getByRole } = setup();

    expect(getByRole('img', { name: 'alternative alt' })).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render image cell type when element type is asset and mime does not include image', () => {
    const { container, getByText } = setup({
      content: { ...PROPS_FIXTURE.element, mime: 'application/pdf', ext: 'pdf' },
    });

    expect(getByText('pdf')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render image cell type when element type is folder', () => {
    const { container } = setup({ contentType: 'folder' });

    expect(container.querySelector('path')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render text cell type', () => {
    const { container, getByText } = setup({
      cellType: 'text',
      content: { ...PROPS_FIXTURE.content, name: 'some text' },
      name: 'name',
    });

    expect(getByText('some text')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render extension cell type when element type is asset', () => {
    const { container, getByText } = setup({
      cellType: 'ext',
      content: { ...PROPS_FIXTURE.content, ext: '.pdf' },
      name: 'ext',
    });

    expect(getByText('PDF')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render extension cell type with "-" when element type is folder', () => {
    const { container, getByText } = setup({ cellType: 'ext', contentType: 'folder' });

    expect(getByText('-')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render size cell type when element type is asset', () => {
    const { container, getByText } = setup({
      cellType: 'size',
      content: { ...PROPS_FIXTURE.content, size: '20.5435' },
      name: 'size',
    });

    expect(getByText('21KB')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render size cell type with "-" when element type is folder', () => {
    const { container, getByText } = setup({ cellType: 'size', contentType: 'folder' });

    expect(getByText('-')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render date cell type', () => {
    const { container, getByText } = setup({
      cellType: 'date',
      content: { ...PROPS_FIXTURE.content, updatedAt: '2022-11-18T12:08:02.202Z' },
      name: 'updatedAt',
    });

    expect(getByText('Friday, November 18, 2022')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });

  it('should render "-" by default when no recognized cell type is passed', () => {
    const { container, getByText } = setup({ cellType: 'not recognized type' });

    expect(getByText('-')).toBeInTheDocument();
    expect(container).toMatchSnapshot();
  });
});
