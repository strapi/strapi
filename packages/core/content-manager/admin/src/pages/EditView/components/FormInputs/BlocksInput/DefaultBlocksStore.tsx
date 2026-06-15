import { codeBlocks } from './Blocks/Code';
import { embeddedSocialMediaBlocks } from './Blocks/EmbeddedSocialMedia';
import { headingBlocks } from './Blocks/Heading';
import { imageBlocks } from './Blocks/Image';
import { linkBlocks } from './Blocks/Link';
import { listBlocks } from './Blocks/List';
import { paragraphBlocks } from './Blocks/Paragraph';
import { quoteBlocks } from './Blocks/Quote';
import { BlocksStore } from './BlocksEditor';

const defaultBlocksStore: BlocksStore = {
  ...embeddedSocialMediaBlocks,
  ...paragraphBlocks,
  ...headingBlocks,
  ...listBlocks,
  ...linkBlocks,
  ...imageBlocks,
  ...quoteBlocks,
  ...codeBlocks,
};

export { defaultBlocksStore };
