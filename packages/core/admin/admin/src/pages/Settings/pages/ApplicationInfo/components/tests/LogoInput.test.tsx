import { fireEvent } from '@testing-library/react';
import { render, server } from '@tests/utils';
import { rest } from 'msw';

import { LogoInput } from '../LogoInput';

const CUSTOM_IMAGE_FIXTURES = {
  ext: '.jpeg',
  height: 250,
  name: 'custom.jpeg',
  size: 46.26,
  url: 'uploads/custom.jpeg',
  width: 340,
};

/**
 * This forces the onload callback to be called in the next tick
 */
window.Image = class LocalImage extends Image {
  constructor() {
    super();
    setTimeout(() => {
      if (this.onload) {
        this.onload(new Event('image loaded'));
      }
    });
  }
};

describe('ApplicationsInfosPage || LogoInput', () => {
  describe('logo input', () => {
    it('should render correctly', async () => {
      const { getByText, getByRole, rerender, user } = render(
        <LogoInput
          canUpdate
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={jest.fn()}
        />
      );

      expect(getByText('logo input label')).toBeInTheDocument();
      expect(getByRole('button', { name: 'Change logo' })).toBeInTheDocument();

      rerender(
        <LogoInput
          canUpdate
          customLogo={CUSTOM_IMAGE_FIXTURES}
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={jest.fn()}
        />
      );

      expect(getByRole('button', { name: 'Reset logo' })).toBeInTheDocument();

      await user.click(getByRole('button', { name: 'Change logo' }));

      expect(getByRole('heading', { name: 'Upload logo' })).toBeInTheDocument();
      expect(getByRole('tab', { name: 'From url' })).toBeInTheDocument();
      expect(getByRole('tab', { name: 'From computer' })).toBeInTheDocument();
      expect(getByRole('tabpanel', { name: 'From computer' })).toBeInTheDocument();
      expect(getByRole('button', { name: 'Browse files' })).toBeInTheDocument();
      expect(getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
      expect(getByRole('button', { name: 'Cancel' })).toBeInTheDocument();

      await user.click(getByRole('tab', { name: 'From url' }));

      expect(getByRole('tabpanel', { name: 'From url' })).toBeInTheDocument();
      expect(getByRole('textbox', { name: 'URL' })).toBeInTheDocument();
      expect(getByRole('button', { name: 'Close modal' })).toBeInTheDocument();
      expect(getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    });

    it('should call onResetMenuLogo callback', async () => {
      const onChangeLogoSpy = jest.fn();
      const { getByRole, user } = render(
        <LogoInput
          canUpdate
          customLogo={CUSTOM_IMAGE_FIXTURES}
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={onChangeLogoSpy}
        />
      );

      await user.click(getByRole('button', { name: 'Reset logo' }));

      expect(onChangeLogoSpy).toHaveBeenCalledTimes(1);
      expect(onChangeLogoSpy.mock.calls[0]).toMatchInlineSnapshot(`
        [
          null,
        ]
      `);
    });

    it('should render disabled actions if no update permissions', () => {
      const { getByRole } = render(
        <LogoInput
          canUpdate={false}
          customLogo={CUSTOM_IMAGE_FIXTURES}
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={jest.fn()}
        />
      );

      expect(getByRole('button', { name: 'Change logo' })).toHaveAttribute('aria-disabled', 'true');
      expect(getByRole('button', { name: 'Reset logo' })).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('from computer', () => {
    it('should show error message when uploading wrong file format', async () => {
      const { getByLabelText, getByRole, findByText, user } = render(
        <LogoInput
          canUpdate
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={jest.fn()}
        />,
        {
          userEventOptions: {
            applyAccept: false,
          },
        }
      );

      await user.click(getByRole('button', { name: 'Change logo' }));

      await user.upload(
        getByLabelText('Drag and Drop here or'),
        new File(['(⌐□_□)'], 'michka.gif', { type: 'image/gif' })
      );

      await findByText('Wrong format uploaded (accepted formats only: jpeg, jpg, png, svg).');
    });

    it('should show error message when uploading unauthorized width/height', async () => {
      const { getByLabelText, getByRole, user, findByText } = render(
        <LogoInput
          canUpdate
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={jest.fn()}
        />,
        {
          userEventOptions: {
            applyAccept: false,
          },
        }
      );

      await user.click(getByRole('button', { name: 'Change logo' }));

      const file = new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' });
      Object.defineProperty(file, 'size', { value: 2048 * 2048 + 1 });

      await user.upload(getByLabelText('Drag and Drop here or'), file);

      await findByText(
        'The file uploaded is too large (max dimension: 750x750, max file size: 100KB)'
      );
    });

    it('should accept upload and lead user to next modal', async () => {
      const { getByLabelText, getByRole, user, findByText } = render(
        <LogoInput
          canUpdate
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={jest.fn()}
        />,
        {
          userEventOptions: {
            applyAccept: false,
          },
        }
      );

      await user.click(getByRole('button', { name: 'Change logo' }));

      await user.upload(
        getByLabelText('Drag and Drop here or'),
        new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' })
      );

      await findByText('Pending logo');
    });

    it('should let user choose another logo', async () => {
      const { getByLabelText, getByRole, user, findByText } = render(
        <LogoInput
          canUpdate
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={jest.fn()}
        />,
        {
          userEventOptions: {
            applyAccept: false,
          },
        }
      );

      await user.click(getByRole('button', { name: 'Change logo' }));

      await user.upload(
        getByLabelText('Drag and Drop here or'),
        new File(['(⌐□_□)'], 'michka.png', { type: 'image/png' })
      );

      await findByText('Pending logo');

      await user.click(getByRole('button', { name: 'Choose another logo' }));

      await findByText('Upload logo');
    });
  });

  describe('from url', () => {
    it('should show error message when uploading wrong file format', async () => {
      server.use(
        rest.get('http://gifs.com/some-gif.gif', (_, res, ctx) => {
          return res(
            ctx.set('content-type', 'image/gif'),
            ctx.body(new Blob(['my-image'], { type: 'image/gif' }))
          );
        })
      );

      const { getByLabelText, getByRole, findByText, user } = render(
        <LogoInput
          canUpdate
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={jest.fn()}
        />
      );

      await user.click(getByRole('button', { name: 'Change logo' }));
      await user.click(getByRole('tab', { name: 'From url' }));

      await user.type(getByLabelText('URL'), 'http://gifs.com/some-gif.gif');

      fireEvent.click(getByRole('button', { name: 'Next' }));

      await findByText('Wrong format uploaded (accepted formats only: jpeg, jpg, png, svg).');
    });

    it('should show error message when uploading unauthorized width/height', async () => {
      server.use(
        rest.get('http://gifs.com/some-png.png', (_, res, ctx) => {
          return res(
            ctx.set('content-type', 'image/png'),
            ctx.body(new File(['1'.repeat(1024 * 1024 + 1)], 'my-image', { type: 'image/png' }))
          );
        })
      );

      const { getByLabelText, getByRole, findByText, user } = render(
        <LogoInput
          canUpdate
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={jest.fn()}
        />
      );

      await user.click(getByRole('button', { name: 'Change logo' }));
      await user.click(getByRole('tab', { name: 'From url' }));

      await user.type(getByLabelText('URL'), 'http://gifs.com/some-png.png');

      fireEvent.click(getByRole('button', { name: 'Next' }));

      await findByText(
        'The file uploaded is too large (max dimension: 750x750, max file size: 100KB)'
      );
    });

    it('should accept upload and lead user to next modal', async () => {
      server.use(
        rest.get('http://gifs.com/some-png.png', (_, res, ctx) => {
          return res(
            ctx.set('content-type', 'image/png'),
            ctx.body(new File(['1'], 'my-image', { type: 'image/png' }))
          );
        })
      );

      const { getByLabelText, getByRole, findByText, user } = render(
        <LogoInput
          canUpdate
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={jest.fn()}
        />
      );

      await user.click(getByRole('button', { name: 'Change logo' }));
      await user.click(getByRole('tab', { name: 'From url' }));

      await user.type(getByLabelText('URL'), 'http://gifs.com/some-png.png');

      fireEvent.click(getByRole('button', { name: 'Next' }));

      await findByText('Pending logo');
    });

    it('should let user choose another logo', async () => {
      server.use(
        rest.get('http://gifs.com/some-png.png', (_, res, ctx) => {
          return res(
            ctx.set('content-type', 'image/png'),
            ctx.body(new File(['1'], 'my-image', { type: 'image/png' }))
          );
        })
      );

      const { getByLabelText, getByRole, findByText, user } = render(
        <LogoInput
          canUpdate
          defaultLogo="/admin/defaultLogo.png"
          label="logo input label"
          onChangeLogo={jest.fn()}
        />
      );

      await user.click(getByRole('button', { name: 'Change logo' }));
      await user.click(getByRole('tab', { name: 'From url' }));

      await user.type(getByLabelText('URL'), 'http://gifs.com/some-png.png');

      fireEvent.click(getByRole('button', { name: 'Next' }));

      await findByText('Pending logo');

      await user.click(getByRole('button', { name: 'Choose another logo' }));

      await findByText('Upload logo');
    });
  });
});
