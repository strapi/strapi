import en from '../../../../translations/en.json';
import { forms } from '../../forms/forms';
import { advancedForm } from '../advancedForm';
import { attributeOptions } from '../attributeOptions';

import type { FormAPI } from '../../../../utils/formAPI';

type Item = { name: string; tooltip?: { defaultMessage: string } };

const findRequired = (sections: Array<{ items: Item[] }>) =>
  sections.flatMap((section) => section.items).find((item) => item.name === 'required');

describe('advancedForm | required on relations and media', () => {
  describe.each(['relation', 'media'] as const)('%s', (type) => {
    it.each([
      ['off', { strictRelations: false }],
      ['not provided', undefined],
    ])('disables required with a tooltip when strictRelations is %s', (_label, options) => {
      const required = findRequired(advancedForm[type](undefined, '', options).sections);

      expect(required).toMatchObject({
        name: 'required',
        type: 'checkbox',
        disabled: true,
        tooltip: { id: 'content-type-builder.form.attribute.item.requiredField.strictRelations' },
      });
    });

    it('keeps the default required option when strictRelations is on', () => {
      const required = findRequired(
        advancedForm[type](undefined, '', { strictRelations: true }).sections
      );

      expect(required).toBe(attributeOptions.required);
    });
  });

  it('leaves required editable on other attribute types', () => {
    expect(findRequired(advancedForm.text().sections)).toBe(attributeOptions.required);
  });

  it('keeps the registered English tooltip aligned with the fallback copy', () => {
    const required = findRequired(advancedForm.relation(undefined, '').sections);

    expect(en['form.attribute.item.requiredField.strictRelations']).toBe(
      required?.tooltip?.defaultMessage
    );
  });

  it('forwards strictRelations from the attribute form to the definitions', () => {
    const extensions = { getAdvancedForm: jest.fn(() => []) } as unknown as FormAPI;
    const params = {
      data: {},
      type: 'relation' as const,
      step: null,
      attributes: [],
      extensions,
      forTarget: 'contentType',
    };

    expect(
      findRequired(forms.attribute.form.advanced({ ...params, strictRelations: true }).sections)
    ).toBe(attributeOptions.required);
    expect(findRequired(forms.attribute.form.advanced(params).sections)).toMatchObject({
      disabled: true,
    });
    expect(extensions.getAdvancedForm).toHaveBeenCalledWith(
      ['attribute', 'relation'],
      expect.not.objectContaining({ strictRelations: expect.anything() })
    );
  });
});
