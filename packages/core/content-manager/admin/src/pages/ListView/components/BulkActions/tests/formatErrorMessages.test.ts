import { formatErrorMessages } from '../PublishAction';

describe('formatErrorMessages', () => {
  it('should format error messages correctly', () => {
    const errors = {
      errors: {
        Content: [
          {
            cards: {
              id: 'components.Input.error.validation.required',
              defaultMessage: 'This value is required.',
            },
          },
        ],
      },
    };

    const formattedMessages = formatErrorMessages(errors, '', () => (msg) => msg);

    expect(formattedMessages).toEqual(['This value is required.']);
  });
});
