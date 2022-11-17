import React from 'react';
import { IntlProvider } from 'react-intl';
import { render, fireEvent } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { TableRows } from '../TableRows';

const PROPS_FIXTURE = {
  assets: [
    {
      alternativeText: 'alternative text',
      createdAt: '2021-10-01T08:04:56.326Z',
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
        <TableRows {...customProps} />
      </ThemeProvider>
    </IntlProvider>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

describe('AssetTableList | TableRows', () => {
  it('should properly render every asset attribute', () => {
    const { getByRole, getByText } = setup();

    expect(getByRole('img', { name: 'alternative text' })).toBeInTheDocument();
    expect(getByText('michka')).toBeInTheDocument();
    expect(getByText('JPEG')).toBeInTheDocument();
    expect(getByText('12KB')).toBeInTheDocument();
    expect(getByText('10/1/2021')).toBeInTheDocument();
    expect(getByText('10/18/2021')).toBeInTheDocument();
    expect(getByText('10/18/2021')).toBeInTheDocument();
  });

  it('should call onSelectAsset callback', () => {
    const onSelectAssetSpy = jest.fn();
    const { getByRole } = setup({ onSelectAsset: onSelectAssetSpy });

    fireEvent.click(getByRole('checkbox', { name: 'Select michka asset' }));

    expect(onSelectAssetSpy).toHaveBeenCalledTimes(1);
  });

  it('should reflect non selected assets state', () => {
    const { getByRole } = setup();

    expect(getByRole('checkbox', { name: 'Select michka asset' })).not.toBeChecked();
  });

  it('should reflect selected assets state', () => {
    const { getByRole } = setup({ selectedAssets: [{ id: 1 }] });

    expect(getByRole('checkbox', { name: 'Select michka asset' })).toBeChecked();
  });

  it('should call onEditAsset callback', () => {
    const onEditAssetSpy = jest.fn();
    const { getByRole } = setup({ onEditAsset: onEditAssetSpy });

    const editAssetButton = getByRole('button', { name: 'Edit' });
    fireEvent.click(editAssetButton);

    expect(onEditAssetSpy).toHaveBeenCalledTimes(1);
  });
});
