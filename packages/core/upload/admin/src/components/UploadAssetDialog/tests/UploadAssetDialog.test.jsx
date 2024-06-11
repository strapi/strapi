/* eslint-disable no-await-in-loop */
import React from 'react';

import { within } from '@testing-library/react';
import { fireEvent, render, screen, waitFor } from '@tests/utils';

import { UploadAssetDialog } from '../UploadAssetDialog';

describe('UploadAssetDialog', () => {
  let confirmSpy;

  beforeAll(() => {
    confirmSpy = jest.spyOn(window, 'confirm');
    confirmSpy.mockImplementation(jest.fn(() => true));
  });

  afterAll(() => {
    confirmSpy.mockRestore();
  });

  describe('from computer', () => {
    it('closes the dialog when clicking on cancel on the add asset step', async () => {
      const onCloseSpy = jest.fn();
      const { user, getByRole } = render(<UploadAssetDialog open onClose={onCloseSpy} />);

      await user.click(getByRole('button', { name: 'cancel' }));

      expect(onCloseSpy).toBeCalled();
    });

    it('open confirm box when clicking on cancel on the pending asset step', async () => {
      const file = new File(['Some stuff'], 'test.png', { type: 'image/png' });

      const { user, getByRole } = render(<UploadAssetDialog open />);

      await user.upload(document.querySelector('[type="file"]'), file);

      await user.click(getByRole('button', { name: 'cancel' }));

      expect(window.confirm).toBeCalled();
    });

    [
      ['png', 'image/png', 'Image', 1],
      ['mp4', 'video/mp4', 'Video', 2],
      ['pdf', 'application/pdf', 'Doc', 1],
      ['unknown', 'unknown', 'Doc', 1],
    ].forEach(([ext, mime, assetType, number]) => {
      it(`shows ${number} valid ${mime} file`, async () => {
        const file = new File(['Some stuff'], `test.${ext}`, { type: mime });

        const { user, getByText, getAllByText } = render(<UploadAssetDialog open />);

        await user.upload(document.querySelector('[type="file"]'), file);

        expect(getByText('1 asset ready to upload')).toBeInTheDocument();
        expect(
          getByText('Manage the assets before adding them to the Media Library')
        ).toBeInTheDocument();

        expect(getAllByText(`test.${ext}`).length).toBe(number);
        expect(getByText(ext)).toBeInTheDocument();
        expect(getByText(assetType)).toBeInTheDocument();
      });
    });
  });

  describe('from url', () => {
    it('shows an error message when the asset does not exist', async () => {
      const { user, getByRole } = render(<UploadAssetDialog open />);

      await user.click(getByRole('tab', { name: 'From URL' }));

      const urls = [
        'http://localhost:5000/an-image.png',
        'http://localhost:5000/a-pdf.pdf',
        'http://localhost:5000/a-video.mp4',
        'http://localhost:5000/not-working-like-cors.lutin',
        'http://localhost:1234/some-where-not-existing.jpg',
      ];

      // eslint-disable-next-line no-restricted-syntax
      for (const url of urls) {
        await user.type(getByRole('textbox', 'URL'), url);

        await user.type(getByRole('textbox', 'URL'), '[Enter]');
      }

      /**
       * userEvent does not submit forms.
       */
      fireEvent.click(getByRole('button', { name: 'Next' }));

      await waitFor(() => expect(screen.getByText('An error occured')).toBeInTheDocument());
    }, 10000);

    /**
     * We should review this test and understand what value it brings,
     * atm it requires a lot of mocking and triggers many async operations
     * which are hard to follow.
     */
    it.skip('snapshots the component with 4 URLs: 3 valid and one in failure', async () => {
      const { user, getByText, getByRole } = render(<UploadAssetDialog open />);

      await user.click(getByRole('tab', { name: 'From URL' }));

      const urls = [
        'http://localhost:5000/an-image.png',
        'http://localhost:5000/a-pdf.pdf',
        'http://localhost:5000/a-video.mp4',
        'http://localhost:5000/not-working-like-cors.lutin',
      ];

      // eslint-disable-next-line no-restricted-syntax
      for (const url of urls) {
        await user.type(getByRole('textbox', 'URL'), url);

        if (urls.indexOf(url) < urls.length - 1) {
          await user.type(getByRole('textbox', 'URL'), '[Enter]');
        }
      }

      /**
       * userEvent does not submit forms.
       */
      fireEvent.click(getByRole('button', { name: 'Next' }));

      const assets = [
        {
          name: 'an-image.png',
          ext: 'png',
          mime: 'image/png',
          source: 'url',
          type: 'image',
          url: 'http://localhost:5000/an-image.png',
          rawFile: new File([''], 'image/png'),
        },
        {
          name: 'a-pdf.pdf',
          ext: 'pdf',
          mime: 'application/pdf',
          source: 'url',
          type: 'doc',
          url: 'http://localhost:5000/a-pdf.pdf',
          rawFile: new File([''], 'application/pdf'),
        },
        {
          name: 'a-video.mp4',
          ext: 'mp4',
          mime: 'video/mp4',
          source: 'url',
          type: 'video',
          url: 'http://localhost:5000/a-video.mp4',
          rawFile: new File([''], 'video/mp4'),
        },
        {
          name: 'not-working-like-cors.lutin',
          ext: 'lutin',
          mime: 'application/json',
          source: 'url',
          type: 'doc',
          url: 'http://localhost:5000/not-working-like-cors.lutin',
          rawFile: new File([''], 'something/weird'),
        },
      ];

      await waitFor(() => expect(getByText('4 assets ready to upload')).toBeInTheDocument());

      assets.forEach((asset) => {
        const card = within(screen.getByRole('dialog')).getAllByLabelText(asset.name)[0];

        expect(within(card).getByText(asset.ext)).toBeInTheDocument();
        expect(
          within(card).getByText(`${asset.type.charAt(0).toUpperCase()}${asset.type.slice(1)}`)
        ).toBeInTheDocument();
      });
    }, 10000);
  });
});
