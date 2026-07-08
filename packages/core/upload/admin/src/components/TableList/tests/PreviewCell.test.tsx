import type * as React from 'react';

import { render as renderTL, screen } from '@testing-library/react';

import { PreviewCell } from '../PreviewCell';

import type { File } from '../../../../../shared/contracts/files';

jest.mock('react-intl', () => ({
  useIntl: () => ({ formatMessage: jest.fn(({ defaultMessage }) => defaultMessage) }),
}));

// Radix' Avatar.Item only mounts its underlying <img> once the browser reports
// the image has loaded, which never happens in jsdom. Mock it to a plain <img>
// so we can assert the props PreviewCell forwards (notably crossOrigin, #26581).
jest.mock('@strapi/design-system', () => ({
  ...jest.requireActual('@strapi/design-system'),
  Avatar: {
    Item: ({ src, alt, crossOrigin }: React.ImgHTMLAttributes<HTMLImageElement>) => (
      <img src={src} alt={alt} crossOrigin={crossOrigin} />
    ),
  },
}));

const baseImage: File = {
  id: 1,
  name: 'hello.png',
  hash: 'hello_hash',
  ext: '.png',
  mime: 'image/png',
  alternativeText: 'Alternative text',
  url: 'http://somewhere.com/hello.png',
} as File;

const render = (content: File) => renderTL(<PreviewCell content={content} />);

describe('PreviewCell', () => {
  it('forwards crossOrigin to the underlying image for remote assets (#26581)', () => {
    render(baseImage);

    const image = screen.getByAltText('Alternative text');
    expect(image).toHaveAttribute('src', 'http://somewhere.com/hello.png');
    expect(image).toHaveAttribute('crossorigin', 'anonymous');
  });

  it('does not set crossOrigin for local assets', () => {
    render({ ...baseImage, isLocal: true });

    const image = screen.getByAltText('Alternative text');
    expect(image).not.toHaveAttribute('crossorigin');
  });
});
