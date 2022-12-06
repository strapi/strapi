import React from 'react';
import { IntlProvider } from 'react-intl';
import { render as renderTL } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import ImageCardAsset from '../ImageCardAsset';

const ASSET_FIXTURES = {
  ext: '.jpeg',
  height: 250,
  name: 'asset.jpeg',
  size: 46.26,
  url: 'uploads/asset.jpeg',
  width: 340,
};

const render = (props) =>
  renderTL(
    <ThemeProvider theme={lightTheme}>
      <IntlProvider locale="en" messages={{}} textComponent="span">
        <ImageCardAsset asset={ASSET_FIXTURES} {...props} />
      </IntlProvider>
    </ThemeProvider>
  );

describe('ApplicationInfosPage | ImageCardAsset', () => {
  it('should render and match snapshot', () => {
    const { container } = render();

    expect(container).toMatchSnapshot();
  });

  it('should display and format asset extension and size', () => {
    const { getAllByText, getByText } = render();

    getAllByText(/\.jpeg/i).map((element) => expect(element).toBeInTheDocument());
    expect(getByText(/340✕250/i)).toBeInTheDocument();
  });
});
