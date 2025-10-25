import { toNumber } from 'lodash/fp';
import Field from './field';

export default class NumberField extends Field {
  toDB(value: unknown) {
    // Handle null and undefined
    if (value === null || value === undefined) {
      return value;
    }

    // For string values, validate that the entire string is a valid number
    // This prevents cases like "900260056-1" where parseFloat would return 900260056
    // but the string itself is not a valid number
    if (typeof value === 'string') {
      const trimmedValue = value.trim();
      
      // Empty strings should be rejected
      if (trimmedValue === '') {
        throw new Error(`Expected a valid Number, got ${value}`);
      }

      // Check if the string is a valid numeric representation
      // Number(trimmedValue) will return NaN for invalid strings like "900260056-1"
      const numberValue = Number(trimmedValue);
      
      if (isNaN(numberValue)) {
        throw new Error(`Expected a valid Number, got ${value}`);
      }

      return numberValue;
    }

    // Reject arrays and objects (except Date which is a special case handled by toNumber)
    if (typeof value === 'object' && !(value instanceof Date)) {
      throw new Error(`Expected a valid Number, got ${value}`);
    }

    // For non-string values, use toNumber from lodash
    const numberValue = toNumber(value);

    if (isNaN(numberValue)) {
      throw new Error(`Expected a valid Number, got ${value}`);
    }

    return numberValue;
  }

  fromDB(value: unknown) {
    return toNumber(value);
  }
}
