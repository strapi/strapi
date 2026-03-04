import { formatErrorMessages } from '../PublishAction';

describe('formatErrorMessages', () => {
  it('should format error messages correctly', () => {
    const errors = {
      'Content.0.cards': {
        id: 'components.Input.error.validation.required',
        defaultMessage: 'This value is required.',
      },
    };

    const formattedMessages = formatErrorMessages(errors, '', (msg) => msg.defaultMessage);

    expect(formattedMessages).toEqual(['This value is required.']);
  });
});
