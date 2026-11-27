// no-code-e2e: scenario=tests-next/ui/scenarios/media-library/upload-image.md id=media-upload-image hash=51fa2d323c85
// Generated from tests-next/ui/scenarios/media-library/upload-image.md. Do not edit by hand: change the scenario instead.
import { expect, test } from '../../../fixtures';
import { MediaLibraryPage } from '../../../pages';

// 1x1 JPEG
const JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

const FILE_NAME = 'photo.jpg';

test('uploads a JPEG image to the Media Library', { tag: ['@critical'] }, async ({ page }) => {
  const library = new MediaLibraryPage(page);

  await library.goto();
  await library.uploadFromComputer({
    name: FILE_NAME,
    mimeType: 'image/jpeg',
    buffer: Buffer.from(JPEG_BASE64, 'base64'),
  });

  // The image shows in the library with its file name.
  await expect(library.asset(FILE_NAME)).toBeVisible();

  // The upload ends without an error.
  await expect(library.uploadFailedDialog()).toBeHidden();

  // The library holds exactly 1 asset.
  await expect(library.heading()).toHaveText('Home (1 item)');
});
