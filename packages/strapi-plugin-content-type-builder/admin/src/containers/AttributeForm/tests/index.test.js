import React from 'react';
// import { shallow } from 'enzyme';
import mountWithIntl from 'testUtils/mountWithIntl';
import formatMessagesWithPluginId from 'testUtils/formatMessages';

// This part is needed if you need to test the lifecycle of a container that contains FormattedMessages

import pluginId from '../../../pluginId';
import pluginTradsEn from '../../../translations/en.json';

import AttributeForm from '../index';

const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);
const renderComponent = (props = {}) => mountWithIntl(<AttributeForm {...props} />, messages);

describe('<AttributeForm />', () => {
  let props;

  beforeEach(() => {
    props = {
      onSubmit: jest.fn(),
      onSubmitEdit: jest.fn(),
    };
  });

  it('should not crash', () => {
    const wrapper = renderComponent(props);

    wrapper.unmount();
  });
});
