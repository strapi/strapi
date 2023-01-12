import React from 'react';
import { buildDescription } from '../index';

describe('CONTENT MANAGER | Inputs | Utils', () => {
  describe('fieldDescription', () => {
    const description =
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.';
    const values = { br: <br /> };

    it('correctly generates field description', () => {
      const minLength = 2;
      const maxLength = 100;

      const result = buildDescription(description, minLength, maxLength);
      expect(result).toEqual({
        defaultMessage: `min. ${minLength} / max. ${maxLength} characters{br}${description}`,
        id: description,
        values,
      });
    });

    describe('correctly ignores omissions', () => {
      it('minLength', () => {
        const minLength = 0;
        const maxLength = 100;

        const result = buildDescription(description, minLength, maxLength);
        expect(result).toEqual({
          defaultMessage: `max. ${maxLength} characters{br}${description}`,
          id: description,
          values,
        });
      });

      it('maxLength', () => {
        const minLength = 5;
        const maxLength = 0;

        const result = buildDescription(description, minLength, maxLength);
        expect(result).toEqual({
          defaultMessage: `min. ${minLength} characters{br}${description}`,
          id: description,
          values,
        });
      });
    });
  });
});
