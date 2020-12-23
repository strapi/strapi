import ReactTooltip from 'react-tooltip';
import styled from 'styled-components';

// TODO : replace by the buffet tooltip component when it will be released
// Add !important to customize CSS is recommended by react-tooltip in the official readme
const Tooltip = styled(ReactTooltip).attrs(({ delayShow = 500, theme }) => ({
  // Pre set the tooltip static props.
  place: 'bottom',
  effect: 'solid',
  delayShow,
  arrowColor: 'transparent',
  backgroundColor: theme.main.colors.greyDark,
}))`
  padding: 0.5rem 0.7rem !important;
  opacity: 1 !important;
  border-radius: ${({ theme }) => theme.main.sizes.borderRadius} !important;
  max-width: 400px;
  max-height: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export default Tooltip;
