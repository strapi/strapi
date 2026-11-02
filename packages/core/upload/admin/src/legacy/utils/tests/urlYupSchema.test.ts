import { ValidationError } from 'yup';

import { urlSchema } from '../urlYupSchema';

const validateUrls = async (urls: string) => {
  try {
    await urlSchema.validate({ urls });

    return undefined;
  } catch (err) {
    return (err as ValidationError).message as unknown;
  }
};

describe('urlSchema', () => {
  it('accepts a list of valid urls', async () => {
    const urls = ['https://strapi.io/a.png', 'https://strapi.io/b.png'].join('\n');

    await expect(validateUrls(urls)).resolves.toBeUndefined();
  });

  it('returns a message descriptor carrying the max value when there are too many urls', async () => {
    const urls = Array.from({ length: 21 }, (_, i) => `https://strapi.io/${i}.png`).join('\n');

    const message = await validateUrls(urls);

    /**
     * The message has to carry `values`, otherwise react-intl cannot interpolate
     * `components.Input.error.validation.max` ("The value is too high (max: {max}).")
     * and renders the raw `{max}` placeholder instead. See strapi/strapi#19030.
     */
    expect(message).toEqual({
      id: 'components.Input.error.validation.max',
      defaultMessage: 'The value is too high (max: {max}).',
      values: { max: 20 },
    });
  });

  it('returns a message descriptor carrying the count of invalid urls', async () => {
    const message = await validateUrls(['not-a-url', 'me-neither'].join('\n'));

    expect(message).toEqual({
      id: 'upload.form.upload-url.error.url.invalids',
      defaultMessage: '{number} URLs are invalids',
      values: { number: 2 },
    });
  });

  it('returns the singular message descriptor for a single invalid url', async () => {
    const message = await validateUrls('not-a-url');

    expect(message).toEqual({
      id: 'upload.form.upload-url.error.url.invalid',
      defaultMessage: 'One URL is invalid',
      values: { number: 1 },
    });
  });
});
