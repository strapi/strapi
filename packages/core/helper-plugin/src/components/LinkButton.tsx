import {
  LinkButton as DSLinkButton,
  LinkButtonProps as DSLinkButtonProps,
} from '@strapi/design-system/v2';
import { NavLink } from 'react-router-dom';

/**
 * @preserve
 *
 * @deprecated Use @strapi/design-system LinkButton instead.
 */
const LinkButton = (props: DSLinkButtonProps) => <DSLinkButton {...props} as={NavLink} />;

export { LinkButton };
