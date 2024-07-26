import Field from './field';

export default class JSONField extends Field {
  toDB(value: unknown) {
    if (value == null) {
      return null;
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return value;
  }

  fromDB(value: unknown) {
    try {
      if (typeof value === 'string') {
        const parsedValue = JSON.parse(value);

        /**
         * On Strapi 5 until 5.0.0-rc.7, the values were accidentally stringified twice when saved,
         * so in those cases we need to parse them twice to retrieve the actual value.
         */
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
