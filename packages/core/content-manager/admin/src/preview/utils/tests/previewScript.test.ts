import { previewScript } from '../previewScript';

const getHelpers = () => {
  const result = previewScript({
    shouldRun: false,
    colors: { highlightHoverColor: '', highlightActiveColor: '' },
  });
  if (!result || !('helpers' in result)) {
    throw new Error('previewScript no-run mode did not return helpers');
  }
  return result.helpers;
};

describe('previewScript helpers', () => {
  describe('getMimePrefix', () => {
    it('extracts the prefix before the slash', () => {
      expect(getHelpers().getMimePrefix('image/jpeg')).toBe('image');
      expect(getHelpers().getMimePrefix('video/mp4')).toBe('video');
      expect(getHelpers().getMimePrefix('application/pdf')).toBe('application');
    });

    it('returns the whole string when there is no slash', () => {
      expect(getHelpers().getMimePrefix('image')).toBe('image');
    });

    it('returns an empty string for non-string input', () => {
      expect(getHelpers().getMimePrefix(undefined)).toBe('');
      expect(getHelpers().getMimePrefix(null)).toBe('');
      expect(getHelpers().getMimePrefix(42)).toBe('');
      expect(getHelpers().getMimePrefix({})).toBe('');
    });
  });

  describe('findMediaTarget', () => {
    it('returns the element itself when it is a media tag', () => {
      const img = document.createElement('img');
      expect(getHelpers().findMediaTarget(img)).toBe(img);

      const video = document.createElement('video');
      expect(getHelpers().findMediaTarget(video)).toBe(video);

      const picture = document.createElement('picture');
      expect(getHelpers().findMediaTarget(picture)).toBe(picture);
    });

    it('returns the first descendant media element when the root is a wrapper', () => {
      const wrapper = document.createElement('div');
      const img = document.createElement('img');
      wrapper.appendChild(document.createElement('span'));
      wrapper.appendChild(img);
      expect(getHelpers().findMediaTarget(wrapper)).toBe(img);
    });

    it('returns null when no media element can be found', () => {
      const wrapper = document.createElement('div');
      wrapper.appendChild(document.createElement('span'));
      expect(getHelpers().findMediaTarget(wrapper)).toBeNull();
    });

    it('returns null for a null root', () => {
      expect(getHelpers().findMediaTarget(null)).toBeNull();
    });
  });

  describe('resolveMediaUrl', () => {
    it('returns absolute URLs unchanged', () => {
      expect(
        getHelpers().resolveMediaUrl('https://example.com/new.jpg', 'https://example.com/old.jpg')
      ).toBe('https://example.com/new.jpg');
    });

    it('returns protocol-relative URLs unchanged', () => {
      expect(
        getHelpers().resolveMediaUrl('//cdn.example.com/new.jpg', 'https://other/old.jpg')
      ).toBe('//cdn.example.com/new.jpg');
    });

    it('returns data and blob URLs unchanged', () => {
      expect(getHelpers().resolveMediaUrl('data:image/png;base64,abc', null)).toBe(
        'data:image/png;base64,abc'
      );
      expect(getHelpers().resolveMediaUrl('blob:http://foo/bar', null)).toBe('blob:http://foo/bar');
    });

    it('prepends the origin from the current attribute when the new URL is relative', () => {
      expect(
        getHelpers().resolveMediaUrl('/uploads/new.jpg', 'http://localhost:1337/uploads/old.jpg')
      ).toBe('http://localhost:1337/uploads/new.jpg');
    });

    it('returns the relative URL unchanged when there is no current attribute', () => {
      expect(getHelpers().resolveMediaUrl('/uploads/new.jpg', null)).toBe('/uploads/new.jpg');
    });

    it('returns the relative URL unchanged when the current attribute is itself relative', () => {
      expect(getHelpers().resolveMediaUrl('/uploads/new.jpg', '/uploads/old.jpg')).toBe(
        '/uploads/new.jpg'
      );
    });

    it('adds a leading slash when the relative URL is missing one', () => {
      expect(
        getHelpers().resolveMediaUrl('uploads/new.jpg', 'http://localhost:1337/uploads/old.jpg')
      ).toBe('http://localhost:1337/uploads/new.jpg');
    });
  });

  describe('patchMediaElement — <img>', () => {
    it('updates src and alt on a same-kind image swap', () => {
      const img = document.createElement('img');
      img.src = 'https://example.com/old.jpg';
      img.alt = 'old';

      const result = getHelpers().patchMediaElement(img, {
        url: 'https://example.com/new.jpg',
        mime: 'image/jpeg',
        alternativeText: 'new',
      });

      expect(result).toBe(true);
      expect(img).toHaveAttribute('src', 'https://example.com/new.jpg');
      expect(img).toHaveAttribute('alt', 'new');
    });

    it('resolves a relative payload URL against the current absolute src', () => {
      const img = document.createElement('img');
      img.setAttribute('src', 'http://localhost:1337/uploads/old.jpg');

      const result = getHelpers().patchMediaElement(img, {
        url: '/uploads/new.jpg',
        mime: 'image/jpeg',
      });

      expect(result).toBe(true);
      expect(img).toHaveAttribute('src', 'http://localhost:1337/uploads/new.jpg');
    });

    it('clears a stale srcset when patching src', () => {
      const img = document.createElement('img');
      img.setAttribute('srcset', 'https://example.com/old.jpg 1x');

      getHelpers().patchMediaElement(img, {
        url: 'https://example.com/new.jpg',
        mime: 'image/jpeg',
      });

      expect(img).not.toHaveAttribute('srcset');
    });

    it('refuses to patch when the new mime is not an image', () => {
      const img = document.createElement('img');
      img.src = 'https://example.com/old.jpg';

      const result = getHelpers().patchMediaElement(img, {
        url: 'https://example.com/new.mp4',
        mime: 'video/mp4',
      });

      expect(result).toBe(false);
      expect(img).toHaveAttribute('src', 'https://example.com/old.jpg');
    });

    it('patches when mime is absent (trusts the target tag)', () => {
      const img = document.createElement('img');
      const result = getHelpers().patchMediaElement(img, {
        url: 'https://example.com/new.jpg',
      });
      expect(result).toBe(true);
      expect(img).toHaveAttribute('src', 'https://example.com/new.jpg');
    });
  });

  describe('patchMediaElement — <video>', () => {
    it('updates src and poster on a same-kind video swap', () => {
      const video = document.createElement('video');

      const result = getHelpers().patchMediaElement(video, {
        url: 'https://example.com/new.mp4',
        mime: 'video/mp4',
        previewUrl: 'https://example.com/poster.jpg',
      });

      expect(result).toBe(true);
      expect(video).toHaveAttribute('src', 'https://example.com/new.mp4');
      expect(video).toHaveAttribute('poster', 'https://example.com/poster.jpg');
    });

    it('refuses to patch when the new mime is not a video', () => {
      const video = document.createElement('video');
      const result = getHelpers().patchMediaElement(video, {
        url: 'https://example.com/photo.jpg',
        mime: 'image/jpeg',
      });
      expect(result).toBe(false);
    });
  });

  describe('patchMediaElement — <picture>', () => {
    it('updates every <source> srcset and the fallback <img>', () => {
      const picture = document.createElement('picture');
      const source1 = document.createElement('source');
      const source2 = document.createElement('source');
      const img = document.createElement('img');
      picture.appendChild(source1);
      picture.appendChild(source2);
      picture.appendChild(img);

      const result = getHelpers().patchMediaElement(picture, {
        url: 'https://example.com/new.jpg',
        mime: 'image/jpeg',
        alternativeText: 'fresh',
      });

      expect(result).toBe(true);
      expect(source1).toHaveAttribute('srcset', 'https://example.com/new.jpg');
      expect(source2).toHaveAttribute('srcset', 'https://example.com/new.jpg');
      expect(img).toHaveAttribute('src', 'https://example.com/new.jpg');
      expect(img).toHaveAttribute('alt', 'fresh');
    });

    it('refuses to patch when the new mime is not an image', () => {
      const picture = document.createElement('picture');
      const result = getHelpers().patchMediaElement(picture, {
        url: 'https://example.com/clip.mp4',
        mime: 'video/mp4',
      });
      expect(result).toBe(false);
    });
  });

  describe('patchMediaElement — rejects invalid inputs', () => {
    it('returns false for non-media target tags', () => {
      const div = document.createElement('div');
      expect(getHelpers().patchMediaElement(div, { url: 'x', mime: 'image/jpeg' })).toBe(false);
    });

    it('returns false when the url is missing or empty', () => {
      const img = document.createElement('img');
      expect(getHelpers().patchMediaElement(img, { mime: 'image/jpeg' })).toBe(false);
      expect(getHelpers().patchMediaElement(img, { url: '', mime: 'image/jpeg' })).toBe(false);
    });

    it('returns false for null value', () => {
      const img = document.createElement('img');
      expect(getHelpers().patchMediaElement(img, null)).toBe(false);
    });

    it('returns false for null target', () => {
      expect(getHelpers().patchMediaElement(null, { url: 'x', mime: 'image/jpeg' })).toBe(false);
    });
  });
});
