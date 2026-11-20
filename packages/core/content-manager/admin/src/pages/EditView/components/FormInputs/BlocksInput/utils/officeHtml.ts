/**
 * Helpers for the HTML Microsoft Word puts in the clipboard.
 */

/**
 * Word marks list bullets and some hidden content with mso-specific styles.
 */
const isHiddenOfficeElement = (element: Element) => {
  const style = (element.getAttribute('style') ?? '').toLowerCase().replace(/\s/g, '');

  return style.includes('mso-list:ignore') || style.includes('display:none');
};

/**
 * Word does not use <ul>/<ol>: list items are paragraphs with an `mso-list` style holding their
 * level, and the bullet or number is written as text in a hidden span.
 */
const getOfficeListItem = (
  element: Element
): { level: number; format: 'ordered' | 'unordered' } | null => {
  const style = (element.getAttribute('style') ?? '').toLowerCase();
  const levelMatch = style.match(/mso-list:\s*\S+\s+level(\d+)/);

  if (!levelMatch) {
    return null;
  }

  const marker =
    Array.from(element.querySelectorAll('span'))
      .find((span) => isHiddenOfficeElement(span))
      ?.textContent?.replace(/ /g, ' ')
      .trim() ?? '';

  const isOrdered = /^(\d+|[a-z]{1,4})[.)]$/i.test(marker);

  return {
    level: Number.parseInt(levelMatch[1], 10) - 1,
    format: isOrdered ? 'ordered' : 'unordered',
  };
};

export { getOfficeListItem, isHiddenOfficeElement };
