import { isSelectable } from '../isSelectable';

describe('TableList | isSelectable', () => {
  it('should return true if asset is an allowed file type', () => {
    expect(isSelectable(['image', 'file', 'video', 'audio'], 'image')).toEqual(true);
  });

  it('should return true if asset type is not contained in allowed types array but file type is contained', () => {
    expect(isSelectable(['video', 'audio', 'file'], 'pdf')).toEqual(true);
  });

  it('should return false if asset type is not contained in allowed types array and file type is image, video or audio', () => {
    expect(isSelectable(['video', 'audio', 'file'], 'image')).toEqual(false);

    expect(isSelectable(['image', 'audio', 'file'], 'video')).toEqual(false);

    expect(isSelectable(['image', 'video', 'file'], 'audio')).toEqual(false);
  });
});
