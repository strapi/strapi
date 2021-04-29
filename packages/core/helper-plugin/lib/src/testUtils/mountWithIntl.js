import React from 'react';
import { mount } from 'enzyme';
import PropTypes from 'prop-types';
import { IntlProvider, intlShape } from 'react-intl';

const mountWithIntl = (componentToMount, pluginTrads, context = {}) => {
  const intlProvider = new IntlProvider({ locale: 'en', messages: pluginTrads }, {});
  const { intl } = intlProvider.getChildContext();

  return mount(React.cloneElement(componentToMount, { intl }), {
    context: { intl, ...context },
    childContextTypes: { intl: intlShape, emitEvent: PropTypes.func },
  });
};

export default mountWithIntl;
