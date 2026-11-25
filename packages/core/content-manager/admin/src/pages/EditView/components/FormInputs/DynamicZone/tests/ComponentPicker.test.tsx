import { screen, render as renderRTL } from '@tests/utils';

import { ComponentPicker, ComponentPickerProps } from '../ComponentPicker';

import { dynamicComponentsByCategory } from './fixtures';

describe('ComponentPicker', () => {
  const Component = (props?: Partial<ComponentPickerProps>) => (
    <ComponentPicker
      isOpen
      onClickAddComponent={jest.fn()}
      dynamicComponentsByCategory={dynamicComponentsByCategory}
      {...props}
    />
  );

  const render = (props?: Partial<ComponentPickerProps>) => renderRTL(<Component {...props} />);

  it('should by default give me the instruction to Pick one Component', () => {
    render();

    expect(screen.getByText(/Pick one component/)).toBeInTheDocument();
  });

  it('should render null if isOpen is false', () => {
    render({ isOpen: false });

    expect(screen.queryByText(/Pick one component/)).not.toBeInTheDocument();
  });

  it('should render the category names by default', () => {
    render();

    expect(screen.getByText('Blog')).toBeInTheDocument();
  });

  it('should open the first category of components when isOpen changes to true from false', () => {
    const { rerender } = render({
      isOpen: false,
      dynamicComponentsByCategory: {
        blog: [
          {
            uid: 'blog.test-como',
            displayName: 'component',
          },
        ],
        seo: [
          {
            uid: 'seo.metadata',
            displayName: 'meta',
          },
        ],
      },
    });

    rerender(<Component isOpen />);

    expect(screen.getByRole('button', { name: /Blog/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Seo/ })).not.toBeInTheDocument();
  });

  it('should call onClickAddComponent with the componentUid when a Component is clicked', async () => {
    const onClickAddComponent = jest.fn();
    const { user } = render({
      onClickAddComponent,
    });

    await user.click(screen.getByRole('button', { name: 'component' }));

    expect(onClickAddComponent).toHaveBeenCalledWith('blog.test-como');
  });

  it('should offer to add an empty component or to copy one when copying is available', async () => {
    const onClickAddComponent = jest.fn();
    const onClickCopyComponent = jest.fn();
    const { user } = render({
      onClickAddComponent,
      onClickCopyComponent,
    });

    await user.click(screen.getByRole('button', { name: 'component' }));

    expect(onClickAddComponent).not.toHaveBeenCalled();

    await user.click(screen.getByRole('menuitem', { name: /Use existing content/ }));

    expect(onClickCopyComponent).toHaveBeenCalledWith('blog.test-como');

    await user.click(screen.getByRole('button', { name: 'component' }));
    await user.click(screen.getByRole('menuitem', { name: /Empty component/ }));

    expect(onClickAddComponent).toHaveBeenCalledWith('blog.test-como');
  });
});
