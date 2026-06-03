import type { Transformer } from 'unified';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';

const DESIGN_SYSTEM = 'https://design-system.strapi.io';

/**
 * TypeDoc pulls JSDoc from @strapi/design-system .d.ts files. Those comments link to Storybook
 * using paths like `[Label](../?path=/docs/foundations-responsive--docs)` which resolve as site-relative
 * URLs in Docusaurus and fail the link checker. Map them to the public Storybook host.
 */
export function remarkDesignSystemLinks(): Transformer<Root> {
  return (tree) => {
    visit(tree, 'link', (node) => {
      if (typeof node.url !== 'string') {
        return;
      }
      let m = node.url.match(/^\.\.\/\?path=(.+)$/);
      if (m) {
        node.url = `${DESIGN_SYSTEM}/?path=${m[1]}`;
        return;
      }
      m = node.url.match(/^\.\.\?path=(.+)$/);
      if (m) {
        node.url = `${DESIGN_SYSTEM}/?path=${m[1]}`;
      }
    });
    visit(tree, 'html', (node) => {
      if (typeof node.value !== 'string' || !node.value.includes('?path=')) {
        return;
      }
      node.value = node.value.replace(/href="\.\.\/\?path=([^"]+)"/g, (_, p) => {
        return `href="${DESIGN_SYSTEM}/?path=${p}"`;
      });
    });
  };
}
