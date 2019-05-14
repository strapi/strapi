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

  describe('<LocaleToggle />, getFlagUrl instance', () => {
    it('should return the en flag', () => {
      const renderedComponent = shallow(<LocaleToggle {...props} />);
      const { getFlagUrl } = renderedComponent.instance();
  
      expect(getFlagUrl('en')).toEqual('https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/us.svg');
    });

    it('should return the pt-BR flag', () => {
      const renderedComponent = shallow(<LocaleToggle {...props} />);
      const { getFlagUrl } = renderedComponent.instance();
  
      expect(getFlagUrl('pt-BR')).toEqual('https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/br.svg');
    });

    it('should return the zh flag', () => {
      const renderedComponent = shallow(<LocaleToggle {...props} />);
      const { getFlagUrl } = renderedComponent.instance();
  
      expect(getFlagUrl('zh')).toEqual('https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/cn.svg');
      expect(getFlagUrl('zh-Hans')).toEqual('https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/cn.svg');
    });

    it('should return the ar flag', () => {
      const renderedComponent = shallow(<LocaleToggle {...props} />);
      const { getFlagUrl } = renderedComponent.instance();
  
      expect(getFlagUrl('ar')).toEqual('https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/sa.svg');
    });

    it('should return the ko flag', () => {
      const renderedComponent = shallow(<LocaleToggle {...props} />);
      const { getFlagUrl } = renderedComponent.instance();
  
      expect(getFlagUrl('ko')).toEqual('https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/kr.svg');
    });

    it('should return the ja flag', () => {
      const renderedComponent = shallow(<LocaleToggle {...props} />);
      const { getFlagUrl } = renderedComponent.instance();
  
      expect(getFlagUrl('ja')).toEqual('https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/jp.svg');
    });

    it('should return the locale flag', () => {
      const renderedComponent = shallow(<LocaleToggle {...props} />);
      const { getFlagUrl } = renderedComponent.instance();
      const locale = 'fr';
      expect(getFlagUrl(locale)).toEqual(`https://cdnjs.cloudflare.com/ajax/libs/flag-icon-css/3.1.0/flags/4x3/${locale}.svg`);
    });
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
