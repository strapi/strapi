import { Accordion } from '@strapi/design-system';
import { render as renderRTL } from '@tests/utils';

import { ComponentCategory, ComponentCategoryProps } from '../ComponentCategory';

describe('ComponentCategory', () => {
  const render = (props?: Partial<ComponentCategoryProps>) => ({
    ...renderRTL(
      <Accordion.Root>
        <ComponentCategory onAddComponent={jest.fn()} category="testing" {...props} />
      </Accordion.Root>
    ),
  });

  it('should render my array of components when passed and the accordion is open', async () => {
    const { user, getByRole } = render({
      components: [
        {
          uid: 'test.test',
          displayName: 'myComponent',
          icon: 'test',
        },
      ],
    });

    await user.click(getByRole('button', { name: /testing/ }));

    expect(getByRole('button', { name: /myComponent/ })).toBeInTheDocument();
  });

  it('should render the category as the accordion buttons label', () => {
    const { getByText } = render({
      category: 'myCategory',
    });

    expect(getByText(/myCategory/)).toBeInTheDocument();
  });

  it('should call onAddComponent with the componentUid when a ComponentCard is clicked', async () => {
    const onAddComponent = jest.fn();
    const { getByRole, user } = render({
      onAddComponent,
      components: [
        {
          uid: 'test.test',
          displayName: 'myComponent',
          icon: 'test',
        },
      ],
    });

    await user.click(getByRole('button', { name: /testing/ }));

    await user.click(getByRole('button', { name: /myComponent/ }));

    expect(onAddComponent).toHaveBeenCalledWith('test.test');
  });
});
