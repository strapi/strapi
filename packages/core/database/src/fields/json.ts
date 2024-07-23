import Field from './field';

export default class JSONField extends Field {
  toDB(value: unknown) {
    return JSON.stringify(value);
  }

  fromDB(value: unknown) {
    try {
      if (typeof value === 'string') {
        const parsedValue = JSON.parse(value);

        if (typeof parsedValue === 'string') {
          return JSON.parse(parsedValue);
        }

        return parsedValue;
      }
    } catch (error) {
      // Just return the value if it's not a valid JSON string
      return value;
    }

    return value;
  }
}
