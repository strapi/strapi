import { Accordion } from '@strapi/design-system';
import { render as renderRTL, waitFor } from '@tests/utils';

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

    await user.click(getByRole('button', { name: /testing/i }));

    expect(getByRole('button', { name: /myComponent/ })).toBeInTheDocument();
  });

  it('should render the category as the accordion buttons label', () => {
    const { getByText } = render({
      category: 'myCategory',
    });

    expect(getByText(/myCategory/i)).toBeInTheDocument();
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

    await user.click(getByRole('button', { name: /testing/i }));

    await user.click(getByRole('button', { name: /myComponent/ }));

    expect(onAddComponent).toHaveBeenCalledWith('test.test');
  });

  it('should render a screenshot thumbnail instead of the icon when a screenshot is provided', async () => {
    const { user, getByRole, getByAltText } = render({
      components: [
        {
          uid: 'test.test',
          displayName: 'myComponent',
          icon: 'test',
          screenshot: '/_component-screenshots/test.png',
        },
      ],
    });

    await user.click(getByRole('button', { name: /testing/i }));

    const thumbnail = getByAltText('myComponent');
    expect(thumbnail).toBeInTheDocument();
    expect(thumbnail).toHaveAttribute('src', '/_component-screenshots/test.png');
  });

  it('should fall back to the component icon (no image) when no screenshot is provided', async () => {
    const { user, getByRole, queryByAltText } = render({
      components: [
        {
          uid: 'test.test',
          displayName: 'myComponent',
          icon: 'test',
        },
      ],
    });

    await user.click(getByRole('button', { name: /testing/i }));

    expect(queryByAltText('myComponent')).not.toBeInTheDocument();
  });

  it('should reveal an enlarged preview on hover and remove it on unhover', async () => {
    const { user, getByRole, getByAltText, findAllByAltText, queryAllByAltText } = render({
      components: [
        {
          uid: 'test.test',
          displayName: 'myComponent',
          icon: 'test',
          screenshot: '/_component-screenshots/test.png',
        },
      ],
    });

    await user.click(getByRole('button', { name: /testing/i }));

    // Only the thumbnail is rendered before hover.
    expect(queryAllByAltText('myComponent')).toHaveLength(1);

    await user.hover(getByAltText('myComponent'));

    // The popover is portaled, so both the thumbnail and the enlarged preview match.
    const images = await findAllByAltText('myComponent');
    expect(images).toHaveLength(2);

    await user.unhover(images[0]);

    await waitFor(() => expect(queryAllByAltText('myComponent')).toHaveLength(1));
  });
});
