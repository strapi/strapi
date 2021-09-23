import React from 'react';
import { render } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

const renderWithIntl = (componentToRender, pluginTrads) => {
  return render(
    <IntlProvider locale="en" defaultLocale="en" messages={pluginTrads} textComponent="span">
      {componentToRender}
    </IntlProvider>
  );
};

export default renderWithIntl;
