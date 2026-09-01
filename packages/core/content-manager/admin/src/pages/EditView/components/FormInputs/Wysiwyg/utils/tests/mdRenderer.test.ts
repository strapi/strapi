import { md } from '../mdRenderer';

describe('mdRenderer', () => {
  it('renders common rich text preview markdown consistently', () => {
    const source = `
# Title

Paragraph with [link](https://example.com), emoji :smile:, and ==mark==.

::: warning
Warning text
:::

Footnote here[^1]

[^1]: Footnote *value*.
`;

    expect(md.render(source)).toMatchSnapshot();
  });

  it('normalizes image alt text with inline html (per markdown-it / CommonMark rules)', () => {
    const source = '![A <em>tag</em> and  \\nbreak](https://example.com/x.png)';

    expect(md.render(source)).toMatchSnapshot();
  });
});
