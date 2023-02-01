import React from 'react';
import { IntlProvider } from 'react-intl';
import { fireEvent, render as renderTL } from '@testing-library/react';
import { ThemeProvider, lightTheme } from '@strapi/design-system';

import PendingLogoDialog from '../PendingLogoDialog';

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
        <PendingLogoDialog
          asset={ASSET_FIXTURES}
          goTo={jest.fn}
          onChangeLogo={jest.fn}
          onClose={jest.fn}
          setLocalImage={jest.fn}
          next="next"
          prev="prev"
          {...props}
        />
      </IntlProvider>
    </ThemeProvider>
  );

describe('ApplicationInfosPage | PendingLogoDialog', () => {
  it('should render and match snapshot', () => {
    const { container } = render();

    expect(container).toMatchSnapshot();
  });

  it('should call onChangeLogo and goTo callbacks', () => {
    const onChangeLogoSpy = jest.fn();
    const goToSpy = jest.fn();
    const { getByRole } = render({ onChangeLogo: onChangeLogoSpy, goTo: goToSpy });

    fireEvent.click(getByRole('button', { name: 'Upload logo' }));

    expect(onChangeLogoSpy).toHaveBeenCalledTimes(1);
    expect(goToSpy).toHaveBeenCalledTimes(1);
  });

  it('should call onChangeLogo and goTo callbacks', () => {
    const onChangeLogoSpy = jest.fn();
    const goToSpy = jest.fn();
    const { getByRole } = render({ onChangeLogo: onChangeLogoSpy, goTo: goToSpy });

    fireEvent.click(getByRole('button', { name: 'Upload logo' }));

    expect(onChangeLogoSpy).toHaveBeenCalledWith(ASSET_FIXTURES);
    expect(goToSpy).toHaveBeenCalledWith('next');
  });

  it('should call setLocalImage and goTo callbacks', () => {
    const setLocalImageSpy = jest.fn();
    const goToSpy = jest.fn();
    const { getByRole } = render({ setLocalImage: setLocalImageSpy, goTo: goToSpy });

    fireEvent.click(getByRole('button', { name: 'Choose another logo' }));

    expect(setLocalImageSpy).toHaveBeenCalledWith(undefined);
    expect(goToSpy).toHaveBeenCalledWith('prev');
  });

  it('should call onClose callback', () => {
    const onCloseSpy = jest.fn();
    const { getByRole } = render({ onClose: onCloseSpy });

    fireEvent.click(getByRole('button', { name: 'Cancel' }));

    expect(onCloseSpy).toHaveBeenCalledTimes(1);
  });
});
