import React from 'react';
import { shallow } from 'enzyme';
import { DropdownItem } from 'reactstrap';
import { changeLocale } from '../../LanguageProvider/actions';
import { LocaleToggle, mapDispatchToProps } from '../index';

describe('<LocaleToggle />', () => {
  let props;

  beforeEach(() => {
    props = {
      changeLocale: jest.fn(),
      currentLocale: {
        locale: 'en',
      },
      localeToggle: {
        className: '',
      },
    };
  });

  it('should not crash', () => {
    shallow(<LocaleToggle {...props} />);
  });

  describe('<LocaleToggle />, toggle instance', () => {
    it('should update the state when called', () => {
      const renderedComponent = shallow(<LocaleToggle {...props} />);
      const { toggle } = renderedComponent.instance();

      toggle();

      expect(renderedComponent.state('isOpen')).toBe(true);
    });

    it('call the toggle handle on click', () => {
      const renderedComponent = shallow(<LocaleToggle {...props} />);
      renderedComponent.setState({ isOpen: true });
      const dropDown = renderedComponent.find(DropdownItem).at(0);
      dropDown.simulate('click');

      expect(props.changeLocale).toHaveBeenCalled();
    });
  });

  describe('<LocaleToggle />, mapDispatchToProps', () => {
    describe('changeLocale', () => {
      it('should be injected', () => {
        const dispatch = jest.fn();
        const result = mapDispatchToProps(dispatch);

        expect(result.changeLocale).toBeDefined();
      });

      it('should dispatch the changeLocale action when called', () => {
        const dispatch = jest.fn();
        const result = mapDispatchToProps(dispatch);
        result.changeLocale();

        expect(dispatch).toHaveBeenCalledWith(changeLocale());
      });
    });
  });
});
