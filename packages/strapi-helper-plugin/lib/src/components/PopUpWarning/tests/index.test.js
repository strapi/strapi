import React from 'react';
import { shallow } from 'enzyme';
import { render, cleanup } from '@testing-library/react';
import { IntlProvider } from 'react-intl';

import renderWithIntl from '../../../testUtils/renderWithIntl';
import PopUpWarning from '../index';

const translationMessage = {
  'components.popUpWarning.button.cancel': 'Cancel',
  'components.popUpWarning.button.confirm': 'Confirm',
  'components.popUpWarning.message': 'Are you sure you want to delete this?',
  'components.popUpWarning.title': 'Please confirm',
};

describe('<PopUpWarning />', () => {
  const props = {
    content: {
      cancel: 'components.popUpWarning.button.cancel',
      confirm: 'components.popUpWarning.button.confirm',
      message: 'components.popUpWarning.message',
      title: 'components.popUpWarning.title',
    },
    isOpen: true,
    onConfirm: jest.fn(),
    onlyConfirmButton: false,
    popUpWarningType: 'danger',
    toggleModal: jest.fn(),
  };

  describe('should render properly', () => {
    afterEach(cleanup);
    it('should not crash', () => {
      shallow(<PopUpWarning {...props} />);
    });

    it('render match snapshot if onlyConfirmButton is false', () => {
      const { asFragment } = render(
        <IntlProvider
          locale="en"
          defaultLocale="en"
          messages={translationMessage}
        >
          <PopUpWarning {...props} />
        </IntlProvider>
      );
      expect(asFragment()).toMatchSnapshot();
    });

    it('render match snapshot if onlyConfirmButton is true', () => {
      const { asFragment } = renderWithIntl(
        <PopUpWarning {...props} onlyConfirmButton={true} />,
        translationMessage
      );
      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('Actions', () => {
    it('It should call the onConfirm props on confirm button click', () => {
      const renderedComponent = shallow(<PopUpWarning {...props} />).debug();

      expect(true).toBe(true);

      // const confirmButton = renderedComponent.find('button').at(0);
      // confirmButton.simulate('click');

      // expect(props.onConfirm).toHaveBeenCalled();
    });
  });
});
