import expect from 'expect';
import { shallow, mount } from 'enzyme';
import React from 'react';

import { IntlProvider, FormattedMessage } from 'react-intl';
import messages from '../messages';
import { FeaturePage } from '../index';
import H1 from 'components/H1';

describe('<FeaturePage />', () => {
  it('should render its heading', () => {
    const renderedComponent = shallow(
      <FeaturePage />
    );
    expect(renderedComponent.contains(
      <H1>
        <FormattedMessage {...messages.header} />
      </H1>
    )).toEqual(true);
  });

  it('should link to "/"', () => {
    const openRouteSpy = expect.createSpy();

    // Spy on the openRoute method of the FeaturePage
    const openRoute = (dest) => {
      if (dest === '/') {
        openRouteSpy();
      }
    };

    const renderedComponent = mount(
      <IntlProvider locale="en">
        <FeaturePage changeRoute={openRoute} />
      </IntlProvider>
    );
    const button = renderedComponent.find('button');
    button.simulate('click');
    expect(openRouteSpy).toHaveBeenCalled();
  });
});
