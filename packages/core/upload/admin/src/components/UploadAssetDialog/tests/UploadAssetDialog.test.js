import React from 'react';
import { render as renderTL, fireEvent, screen } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/parts';
import en from '../../../translations/en.json';
import { UploadAssetDialog } from '../UploadAssetDialog';

jest.mock('../../../utils', () => ({
  ...jest.requireActual('../../../utils'),
  getTrad: x => x,
}));

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ id }) => en[id] || id) }),
}));

const render = (props = { onSucces: () => {}, onClose: () => {} }) =>
  renderTL(
    <ThemeProvider theme={lightTheme}>
      <UploadAssetDialog {...props} />
    </ThemeProvider>,
    { container: document.body }
  );

describe('UploadAssetDialog', () => {
  describe('from computer', () => {
    it('snapshots the component', () => {
      const { container } = render();

      expect(container).toMatchSnapshot();
    });
  });

  describe('from url', () => {
    it('snapshots the component', () => {
      const { container } = render();

      fireEvent.click(screen.getByText('From url'));

      expect(container).toMatchSnapshot();
    });
  });
});
