import React from 'react';
import { buildMinMaxDescription } from '../index';

describe('CONTENT MANAGER | Inputs | Utils', () => {
  describe('fieldDescription', () => {
    const id = 'content-manager.form.Input.minMaxDescription';
    const values = (min, max) => ({ br: <br />, min, max });

    it('ignores unsupported field types', () => {
      const result = buildMinMaxDescription('someType');
      expect(result).toBeNull();
    });

    it('expects one of min or max to be a number ', () => {
      const result = buildMinMaxDescription('text', null, 'test');
      expect(result).toBeNull();
    });

    describe('correctly generates field description', () => {
      it('text field', () => {
        const min = 2;
        const max = 100;

        const result = buildMinMaxDescription('text', min, max);
        expect(result).toEqual({
          id,
          defaultMessage: `min. {min} / max. {max} characters{br}`,
          values: values(min, max),
        });
      });

      it('number field', () => {
        const min = 2;
        const max = 100;

        const result = buildMinMaxDescription('number', min, max);
        expect(result).toEqual({
          id,
          defaultMessage: `min. {min} / max. {max}{br}`,
          values: values(min, max),
        });
      });
    });

    describe('correctly ignores omissions', () => {
      it('min', () => {
        const min = 0;
        const max = 100;

        const result = buildMinMaxDescription('text', min, max);
        expect(result).toEqual({
          id,
          defaultMessage: `max. {max} characters{br}`,
          values: values(min, max),
        });
      });

      it('max', () => {
        const min = 5;
        const max = 0;

        const result = buildMinMaxDescription('text', min, max);
        expect(result).toEqual({
          id,
          defaultMessage: `min. {min} characters{br}`,
          values: values(min, max),
        });
      });
    });
  });
});
