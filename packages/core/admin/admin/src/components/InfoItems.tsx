import { Flex, Typography } from '@strapi/design-system';
import { Globe, Lock } from '@strapi/icons';

import {
  DescriptionComponentRenderer,
  type DescriptionComponent,
} from './DescriptionComponentRenderer';

interface InfoItemDescription {
  label: string;
  value?: string;
  /**
   * @default 'neutral'
   */
  tone?: 'neutral' | 'secondary' | 'warning';
  icon?: 'globe' | 'lock';
}

const ICONS = { globe: Globe, lock: Lock };

interface InfoItemsProps<Props> {
  descriptions: DescriptionComponent<Props, InfoItemDescription>[];
  props: Props;
}

/**
 * @beta
 * @description Renders info items that plugins give as data, e.g. where a folder is shared. A
 * description may call hooks and returns one item or `null`
 */
const InfoItems = <Props,>({ descriptions, props }: InfoItemsProps<Props>) => (
  <DescriptionComponentRenderer descriptions={descriptions} props={props}>
    {(items) =>
      items.length > 0 ? (
        <Flex gap={3} wrap="wrap">
          {items.map(({ id, label, value, tone = 'neutral', icon }) => {
            const Icon = icon ? ICONS[icon] : null;

            return (
              <Flex key={id} gap={1} alignItems="center">
                {Icon && <Icon aria-hidden fill={`${tone}600`} />}
                <Typography variant="pi" fontWeight="bold" textColor={`${tone}700`}>
                  {label}
                </Typography>
                {value && (
                  <Typography variant="pi" textColor="neutral600">
                    {value}
                  </Typography>
                )}
              </Flex>
            );
          })}
        </Flex>
      ) : null
    }
  </DescriptionComponentRenderer>
);

export { InfoItems };
export type { InfoItemDescription, InfoItemsProps };
