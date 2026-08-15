import { Menu } from '@strapi/design-system';
import { styled } from 'styled-components';

/**
 * `Menu.Content` for the row-level "..." menus, with the design system's height
 * clamp replaced by a viewport-aware one.
 *
 * The DS caps its menus at a flat `15rem` and hides the scrollbar
 * (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`). Under a
 * last-row trigger that clamp cut items off with nothing on screen to hint they
 * were there — Delete simply wasn't reachable.
 *
 * Raising the cap to `fit-content` fixed that, but it removes the fallback too:
 * the box then grows to its content and the DS's `overflow: auto` can never
 * fire. At 200% zoom or in a short window the menu ends up taller than the
 * viewport with no way to scroll it — the same items-you-can't-reach bug, moved
 * to a different trigger condition (WCAG 1.4.4 / 1.4.10).
 *
 * So cap to the space Radix measured instead. `--radix-popper-available-height`
 * is set on the content element by `@radix-ui/react-popper`, and the DS mounts
 * this box as the popper content (`asChild`), so it resolves here. The fallback
 * in `min()` covers the first paint, before the property is written. Radix's
 * collision flip still picks the side with more room; this only decides what
 * happens when neither side has enough. The scrollbar is un-hidden so the
 * overflow is visible when it does happen.
 */
export const ActionsMenuContent = styled(Menu.Content).attrs({
  maxHeight: 'min(var(--radix-popper-available-height, 100vh), 100vh)',
})`
  scrollbar-width: thin;
  -ms-overflow-style: auto;

  &::-webkit-scrollbar {
    display: block;
    width: 0.4rem;
  }

  &::-webkit-scrollbar-thumb {
    background: ${({ theme }) => theme.colors.neutral300};
    border-radius: ${({ theme }) => theme.borderRadius};
  }
`;
