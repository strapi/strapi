import { DesignSystemProvider } from '@strapi/design-system';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import { CellContent, CellContentProps } from '../CellContent';

const PROPS_FIXTURE = {
  cellType: 'image',
  contentType: 'asset',
  content: {
    id: 1,
    name: 'michka-picture-name',
    hash: 'michka-picture-hash',
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

const ComponentFixture = (props: Partial<CellContentProps>) => {
  const customProps = {
    ...PROPS_FIXTURE,
    ...props,
  };

  return (
    <IntlProvider locale="en" messages={{}}>
      <DesignSystemProvider>
        <CellContent {...PROPS_FIXTURE} {...customProps} />
      </DesignSystemProvider>
    </IntlProvider>
  );
};

const setup = (props: Partial<CellContentProps>) => render(<ComponentFixture {...props} />);

describe('TableList | CellContent', () => {
  const fileTypesToTest = [
    { mime: 'application/pdf', ext: 'pdf', expectedIcon: 'file-pdf-icon' },
    { mime: 'application/vnd.ms-excel', ext: 'xls', expectedIcon: 'file-xls-icon' },
    { mime: 'text/csv', ext: 'csv', expectedIcon: 'file-csv-icon' },
    { mime: 'application/zip', ext: 'zip', expectedIcon: 'file-zip-icon' },
    { mime: 'text/plain', ext: 'txt', expectedIcon: 'file-icon' },
  ];
  fileTypesToTest.forEach((fileType) => {
    it(`should render the ${fileType.expectedIcon === 'file-icon' ? 'default file' : 'corresponding'} icon according to the file type (${fileType.ext})`, () => {
      const { ext, expectedIcon, mime } = fileType;
      const { getByTestId } = setup({
        content: { ...PROPS_FIXTURE.content, mime, ext },
      });

      expect(getByTestId(expectedIcon)).toBeInTheDocument();
    });
  });

  it('should render image cell type when element type is folder', () => {
    const { getByLabelText } = setup({ contentType: 'folder' });

    expect(getByLabelText('folder')).toBeInTheDocument();
  });

  it('should render text cell type', () => {
    const { getByText } = setup({
      cellType: 'text',
      content: { ...PROPS_FIXTURE.content, name: 'some text' },
      name: 'name',
    });

    expect(getByText('some text')).toBeInTheDocument();
  });

  it('should render extension cell type when element type is asset', () => {
    const { getByText } = setup({
      cellType: 'ext',
      content: { ...PROPS_FIXTURE.content, ext: '.pdf' },
      name: 'ext',
    });

    expect(getByText('PDF')).toBeInTheDocument();
  });

  it('should render extension cell type with "-" when element type is folder', () => {
    const { getByText } = setup({ cellType: 'ext', contentType: 'folder' });

    expect(getByText('-')).toBeInTheDocument();
  });

  it('should render size cell type when element type is asset', () => {
    const { getByText } = setup({
      cellType: 'size',
      content: { ...PROPS_FIXTURE.content, size: Number('20.5435') },
      name: 'size',
    });

    expect(getByText('21KB')).toBeInTheDocument();
  });

  it('should render size cell type with "-" when element type is folder', () => {
    const { getByText } = setup({ cellType: 'size', contentType: 'folder' });

    expect(getByText('-')).toBeInTheDocument();
  });

  it('should render date cell type', () => {
    const { getByText } = setup({
      cellType: 'date',
      content: { ...PROPS_FIXTURE.content, updatedAt: '2022-11-18T12:08:02.202Z' },
      name: 'updatedAt',
    });

    expect(getByText('Friday, November 18, 2022')).toBeInTheDocument();
  });

  it('should render "-" by default when no recognized cell type is passed', () => {
    const { getByText } = setup({ cellType: 'not recognized type' });

    expect(getByText('-')).toBeInTheDocument();
  });
});
