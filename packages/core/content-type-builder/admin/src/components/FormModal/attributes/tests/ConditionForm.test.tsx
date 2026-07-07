import { render, screen } from '@strapi/admin/strapi-admin/test';

import { ConditionForm } from '../ConditionForm';

import type { AttributeConditions } from '../../../../types';

const setup = (value?: AttributeConditions | null) =>
  render(
    <ConditionForm
      name="conditions"
      value={value}
      onChange={jest.fn()}
      onDelete={jest.fn()}
      attributeName="subtitle"
      conditionFields={[{ name: 'isFeatured', type: 'boolean' }]}
    />
  );

describe('CTB | FormModal | ConditionForm', () => {
  it('treats a null visible condition as no condition', () => {
    setup({ visible: null } as unknown as AttributeConditions);

    expect(screen.getByRole('button', { name: /apply condition/i })).toBeInTheDocument();
  });
});
