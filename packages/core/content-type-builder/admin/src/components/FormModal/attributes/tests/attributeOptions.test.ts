import en from '../../../../translations/en.json';
import { attributeOptions } from '../attributeOptions';

const PRIVATE_FIELD_DESCRIPTION =
  'This field will not show up in the API response. New private fields are also excluded from search.';

describe('attributeOptions', () => {
  it('keeps the registered English private-field description aligned with the fallback copy', () => {
    const registeredMessage = en['form.attribute.item.privateField.description'];
    const fallbackMessage = attributeOptions.private.description.defaultMessage;

    expect(registeredMessage).toBe(PRIVATE_FIELD_DESCRIPTION);
    expect(registeredMessage).toBe(fallbackMessage);
  });
});
