import { ArrowsOut } from '@strapi/icons';
import { MessageDescriptor } from 'react-intl';

/**
 * Valid column widths for discrete snapping (1/3, 1/2, 2/3, 3/3)
 */
export const RESIZE_OPTIONS = {
  '1/3': 4,
  '2/3': 8,
  '3/3': 12,
  '2/2': 6,
} as const;

/**
 * Resize option configuration for menu items
 */
export interface ResizeOption {
  value: string;
  width: number;
  label: MessageDescriptor;
}

/**
 * Resize menu item configuration
 */
export interface ResizeMenuItemConfig {
  key: number;
  value: string;
  width: number;
  label: string;
  isCurrentWidth: boolean;
  onClick?: () => void;
  startIcon: typeof ArrowsOut;
}

/**
 * Creates resize menu items configuration for the widget resize menu
 * @param columnWidth - Current column width of the widget
 * @param formatMessage - Intl formatMessage function
 * @param onResizeSelect - Callback function when a resize option is selected
 * @returns Array of resize option configurations
 */
export const createResizeMenuItems = (
  columnWidth: number,
  formatMessage: (descriptor: MessageDescriptor) => string,
  onResizeSelect: (value: string | number) => void
): ResizeMenuItemConfig[] => {
  const allOptions: ResizeOption[] = [
    {
      value: '1/3',
      width: 4,
      label: { id: 'content-releases.header.actions.1/3', defaultMessage: '1/3' },
    },
    {
      value: '2/2',
      width: 6,
      label: { id: 'content-releases.header.actions.2/2', defaultMessage: '2/2' },
    },
    {
      value: '2/3',
      width: 8,
      label: { id: 'content-releases.header.actions.2/3', defaultMessage: '2/3' },
    },
    {
      value: '3/3',
      width: 12,
      label: { id: 'content-releases.header.actions.3/3', defaultMessage: '3/3' },
    },
  ];

  // Return configuration objects instead of JSX elements
  return allOptions.map((option) => ({
    key: option.width,
    value: option.value,
    width: option.width,
    label: formatMessage(option.label),
    isCurrentWidth: option.width === columnWidth,
    onClick: option.width === columnWidth ? undefined : () => onResizeSelect(option.value),
    startIcon: ArrowsOut,
  }));
};

/**
 * Handles resize option selection
 * @param value - Selected resize value
 * @param resizeTo - Function to resize the widget
 * @param onMenuClose - Callback to close the menu
 */
export const handleResizeSelect = (
  value: string | number,
  resizeTo: (width: number) => void,
  onMenuClose: () => void
) => {
  const stringValue = String(value);
  const newWidth = RESIZE_OPTIONS[stringValue as keyof typeof RESIZE_OPTIONS];

  if (newWidth) {
    resizeTo(newWidth);
    onMenuClose();
  }
};
