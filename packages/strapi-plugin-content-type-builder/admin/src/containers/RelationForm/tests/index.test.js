import React from 'react';
import { shallow } from 'enzyme';
// import mountWithIntl from 'testUtils/mountWithIntl';
// import formatMessagesWithPluginId from 'testUtils/formatMessages';

// This part is needed if you need to test the lifecycle of a container that contains FormattedMessages

// import pluginId from '../../../pluginId';
// import pluginTradsEn from '../../../translations/en.json';

import RelationForm from '../index';

// const messages = formatMessagesWithPluginId(pluginId, pluginTradsEn);
// const renderComponent = (props = {}) => mountWithIntl(<RelationForm {...props} />, messages);

describe('<RelationForm />', () => {
  let props;

  beforeEach(() => {
    props = {
      activeTab: 'base',
      attributeToEditName: '',
      initData: jest.fn(),
      isOpen: true,
      models: [],
      modelToEditName: '',
      modifiedData: {
        key: '',
        name: '',
        source: '',
      },
      onCancel: jest.fn(),
      onChange: jest.fn(),
      onChangeRelationNature: jest.fn(),
      onChangeRelationTarget: jest.fn(),
      onSubmit: jest.fn(),
      onSubmitEdit: jest.fn(),
      push: () => {},
      source: null,
    };
  });
  it('should not crash', () => {
    shallow(<RelationForm {...props} />);

    // renderComponent({});
  });
});
