import React from 'react';
import { IntlProvider } from 'react-intl';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { AssetTableList } from '..';

const PROPS_FIXTURE = {
  assets: [
    {
      alternativeText: 'alternative text',
      createdAt: '2021-10-18T08:04:56.326Z',
      ext: '.jpeg',
      formats: {
        thumbnail: {
          url: '/uploads/thumbnail_3874873_b5818bb250.jpg',
        },
      },
      id: 1,
      mime: 'image/jpeg',
      name: 'michka',
      size: 11.79,
      updatedAt: '2021-10-18T08:04:56.326Z',
      url: '/uploads/michka.jpg',
    },
  ],
  onEditAsset: jest.fn(),
  onSelectAsset: jest.fn(),
  selectedAssets: [],
};

const ComponentFixture = (props) => {
  const customProps = {
    ...PROPS_FIXTURE,
    ...props,
  };

  return (
    <IntlProvider locale="en" messages={{}}>
      <ThemeProvider theme={lightTheme}>
        <AssetTableList {...customProps} />
      </ThemeProvider>
    </IntlProvider>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

describe('AssetTableList', () => {
  it('should render table headers labels', () => {
    const { getByText } = setup();

    expect(getByText('preview')).toBeInTheDocument();
    expect(getByText('name')).toBeInTheDocument();
    expect(getByText('extension')).toBeInTheDocument();
    expect(getByText('size')).toBeInTheDocument();
    expect(getByText('created')).toBeInTheDocument();
    expect(getByText('last update')).toBeInTheDocument();
  });

  it('should render a visually hidden edit table headers label', () => {
    const { getByRole } = setup();

    expect(getByRole('columnheader', { name: 'actions' })).toBeInTheDocument();
  });

  it('should render assets', () => {
    const { getByText } = setup();

    expect(getByText('michka')).toBeInTheDocument();
    expect(getByText('JPEG')).toBeInTheDocument();
  });
});
