import React from 'react';
import { mount } from 'enzyme';
import { IntlProvider, intlShape } from 'react-intl';

const mountWithIntl = (componentToMount, pluginTrads) => {
  const intlProvider = new IntlProvider({ locale: 'en', messages: pluginTrads }, {});
  const { intl } = intlProvider.getChildContext();

  return mount(
    React.cloneElement(componentToMount, { intl }), {
      context: { intl },
      childContextTypes: { intl: intlShape },
    },
  );
};

export default mountWithIntl;
