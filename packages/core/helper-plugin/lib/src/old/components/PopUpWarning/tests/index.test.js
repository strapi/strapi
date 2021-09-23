import React from 'react';
import ReactDOM from 'react-dom';
import { shallow } from 'enzyme';
import { fireEvent } from '@testing-library/react';

import renderWithIntl from '../../../testUtils/renderWithIntl';
import PopUpWarning from '../index';

const translationMessages = {
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
    popUpWarningType: 'warning',
    toggleModal: jest.fn(),
  };

  beforeAll(() => {
    ReactDOM.createPortal = jest.fn(element => {
      return element;
    });
  });

  afterEach(() => {
    ReactDOM.createPortal.mockClear();
  });

  describe('should render properly', () => {
    it('should not crash', () => {
      shallow(<PopUpWarning {...props} />);
    });

    it('should match snapshot if onlyConfirmButton is false', () => {
      const { asFragment } = renderWithIntl(<PopUpWarning {...props} />, translationMessages);

      expect(asFragment()).toMatchSnapshot();
    });

    it('should match snapshot if onlyConfirmButton is true', () => {
      const { asFragment } = renderWithIntl(
        <PopUpWarning {...props} onlyConfirmButton={true} />,
        translationMessages
      );

      expect(asFragment()).toMatchSnapshot();
    });
  });

  describe('should call methods properly', () => {
    it('should call onConfirm props on confirm button click', () => {
      const { getByText } = renderWithIntl(<PopUpWarning {...props} />, translationMessages);

      const node = getByText('Confirm');
      fireEvent.click(node);

      expect(props.onConfirm).toHaveBeenCalled();
    });

    it('should call toggleModal props on cancel button click', () => {
      const { getByText } = renderWithIntl(<PopUpWarning {...props} />, translationMessages);

      const node = getByText('Cancel');
      fireEvent.click(node);

      expect(props.toggleModal).toHaveBeenCalled();
    });
  });
});
