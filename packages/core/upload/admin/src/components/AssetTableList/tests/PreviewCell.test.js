import React from 'react';
import { render } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import { PreviewCell } from '../PreviewCell';

const PROPS_FIXTURE = {
  alternativeText: 'alternative alt',
  fileExtension: 'jpeg',
  mime: 'image/jpeg',
  name: 'michka',
  thumbnailURL: 'michka-picture-url-thumbnail.jpeg',
  url: 'michka-picture-url-default.jpeg',
};

const ComponentFixture = (props) => {
  const customProps = {
    ...PROPS_FIXTURE,
    ...props,
  };

  return (
    <ThemeProvider theme={lightTheme}>
      <PreviewCell {...PROPS_FIXTURE} {...customProps} />
    </ThemeProvider>
  );
};

const setup = (props) => render(<ComponentFixture {...props} />);

describe('AssetTableList | PreviewCell', () => {
  describe('rendering images', () => {
    it('should render an image with thumbnail if available', () => {
      const { getByRole } = setup();

      expect(getByRole('img', { name: 'alternative alt' })).toHaveAttribute(
        'src',
        'michka-picture-url-thumbnail.jpeg'
      );
    });

    it('should render an image with default url if thumbnail is not available', () => {
      const { getByRole } = setup({ thumbnailURL: undefined });

      expect(getByRole('img', { name: 'alternative alt' })).toHaveAttribute(
        'src',
        'michka-picture-url-default.jpeg'
      );
    });

    it('should render alternative text if available', () => {
      const { getByRole, queryByRole } = setup();

      expect(getByRole('img', { name: 'alternative alt' })).toBeInTheDocument();
      expect(queryByRole('img', { name: 'michka' })).not.toBeInTheDocument();
    });
  });

  describe('rendering files', () => {
    it('should render an image with thumbnail if available', () => {
      const { getByText } = setup({ mime: 'application/pdf', fileExtension: 'pdf' });

      expect(getByText('pdf')).toBeInTheDocument();
    });
  });
});
