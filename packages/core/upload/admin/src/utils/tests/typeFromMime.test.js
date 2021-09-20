import { AssetType } from '../../constants';
import { typeFromMime } from '../typeFromMime';

describe('typeFromMime', () => {
  it('gives a type of image when the mime contains "image"', () => {
    const type = typeFromMime('image/png');

    expect(type).toBe(AssetType.Image);
  });

  it('gives a type of video when the mime contains "video"', () => {
    const type = typeFromMime('video/mp4');

    expect(type).toBe(AssetType.Video);
  });

  it('gives a type of document when the mime is neither video nor image', () => {
    const type = typeFromMime('application/pdf');

    expect(type).toBe(AssetType.Document);
  });
});
