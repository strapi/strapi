import React from 'react';
import { shallow } from 'enzyme';
import { IntlProvider } from 'react-intl';
import renderer from 'react-test-renderer';
import translationMessages from '../../../../translations/en.json';
import EventInput from '../index';
import EventRow from '../EventRow';

const intlProvider = new IntlProvider({ locale: 'en', message: translationMessages }, {});
const { intl } = intlProvider.state;

function nodeWithIntlProp(node) {
  return React.cloneElement(node, { intl });
}

const shallowWithIntl = node => {
  return shallow(nodeWithIntlProp(node), { context: { intl } });
};

describe('<EventInput />', () => {
  const props = {
    name: 'events',
    value: ['media.create', 'media.delete'],
    onChange: jest.fn(),
    shouldShowDPEvents: false,
  };

  it('should match the snapshot', () => {
    const tree = renderer.create(
      <IntlProvider locale="en" messages={translationMessages} textComponent="span">
        <EventInput {...props} />
      </IntlProvider>
    );

    expect(tree).toMatchSnapshot();
  });

  describe('OnChange prop called with right params', () => {
    it('should add an event on handleChange if value is true', () => {
      const event = {
        target: {
          name: 'entry.update',
          value: true,
        },
      };

      const formattedEvent = {
        target: {
          name: 'events',
          value: ['media.create', 'media.delete', 'entry.update'],
        },
      };

      let wrapper = shallowWithIntl(<EventInput {...props} />);
      wrapper.dive();
      let child = wrapper.find(EventRow);

      child
        .at(0)
        .props()
        .handleChange(event);

      expect(props.onChange).toHaveBeenCalledWith(formattedEvent);
    });

    it('should delete an event on handleChange if value is false', () => {
      const event = {
        target: {
          name: 'media.create',
          value: false,
        },
      };

      const formattedEvent = {
        target: {
          name: 'events',
          value: ['media.delete'],
        },
      };

      let wrapper = shallowWithIntl(<EventInput {...props} />);
      wrapper.dive();
      let child = wrapper.find(EventRow);

      child
        .at(0)
        .props()
        .handleChange(event);

      expect(props.onChange).toHaveBeenCalledWith(formattedEvent);
    });
  });

  it('should add all events from the same category on handleChangeAll if value is true', () => {
    const event = {
      target: {
        name: 'entry',
        value: true,
      },
    };

    const formattedEvent = {
      target: {
        name: 'events',
        value: ['media.create', 'media.delete', 'entry.create', 'entry.update', 'entry.delete'],
      },
    };

    let wrapper = shallowWithIntl(<EventInput {...props} />);
    wrapper.dive();
    let child = wrapper.find(EventRow);

    child
      .at(0)
      .props()
      .handleChangeAll(event);

    expect(props.onChange).toHaveBeenCalledWith(formattedEvent);
  });

  it('should delete all events from the same category on handleChangeAll if value is false', () => {
    const event = {
      target: {
        name: 'media',
        value: false,
      },
    };

    const formattedEvent = {
      target: {
        name: 'events',
        value: [],
      },
    };

    let wrapper = shallowWithIntl(<EventInput {...props} />);
    wrapper.dive();
    let child = wrapper.find(EventRow);

    child
      .at(0)
      .props()
      .handleChangeAll(event);

    expect(props.onChange).toHaveBeenCalledWith(formattedEvent);
  });
});
