import React from 'react';
import { IntlProvider } from 'react-intl';
import { render, fireEvent } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { TableRows } from '../TableRows';

const PROPS_FIXTURE = {
  rows: [
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
      type: 'asset',
    },
  ],
  onEditAsset: jest.fn(),
  onEditFolder: jest.fn(),
  onSelectOne: jest.fn(),
  selected: [],
};

const FOLDER_FIXTURE = {
  createdAt: '2022-11-17T10:40:06.022Z',
  id: 2,
  name: 'folder 1',
  type: 'folder',
  updatedAt: '2022-11-17T10:40:06.022Z',
};

const ComponentFixture = (props) => {
  const customProps = {
    ...PROPS_FIXTURE,
    ...props,
  };

  return (
    <IntlProvider locale="en" messages={{}}>
      <ThemeProvider theme={lightTheme}>
        <table>
          <TableRows {...customProps} />
        </table>
      </ThemeProvider>
    </IntlProvider>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

describe('TableList | TableRows', () => {
  describe('rendering assets', () => {
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
      const onSelectOneSpy = jest.fn();
      const { getByRole } = setup({ onSelectOne: onSelectOneSpy });

      fireEvent.click(getByRole('checkbox', { name: 'Select michka asset' }));

      expect(onSelectOneSpy).toHaveBeenCalledTimes(1);
    });

    it('should reflect non selected assets state', () => {
      const { getByRole } = setup();

      expect(getByRole('checkbox', { name: 'Select michka asset' })).not.toBeChecked();
    });

    it('should reflect selected assets state', () => {
      const { getByRole } = setup({ selected: [{ id: 1 }] });

      expect(getByRole('checkbox', { name: 'Select michka asset' })).toBeChecked();
    });

    it('should call onEditAsset callback', () => {
      const onEditAssetSpy = jest.fn();
      const { getByRole } = setup({ onEditAsset: onEditAssetSpy });

      fireEvent.click(getByRole('button', { name: 'Edit' }));

      expect(onEditAssetSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('rendering folders', () => {
    it('should render folder', () => {
      const { getByText } = setup({
        rows: [FOLDER_FIXTURE],
      });

      expect(getByText('folder 1')).toBeInTheDocument();
    });

    it('should call onEditFolder callback', () => {
      const onEditFolderSpy = jest.fn();
      const { getByRole } = setup({
        rows: [FOLDER_FIXTURE],
        onEditFolder: onEditFolderSpy,
      });

      fireEvent.click(getByRole('button', { name: 'Edit' }));

      expect(onEditFolderSpy).toHaveBeenCalledTimes(1);
    });

    it('should reflect non selected folder state', () => {
      const { getByRole } = setup({ rows: [FOLDER_FIXTURE] });

      expect(getByRole('checkbox', { name: 'Select folder 1 folder' })).not.toBeChecked();
    });

    it('should reflect selected folder state', () => {
      const { getByRole } = setup({ rows: [FOLDER_FIXTURE], selected: [{ id: 2 }] });

      expect(getByRole('checkbox', { name: 'Select folder 1 folder' })).toBeChecked();
    });

    it('should not display size and ext', () => {
      const { getAllByText } = setup({ rows: [FOLDER_FIXTURE] });

      expect(getAllByText('-').length).toEqual(2);
    });
  });
});
