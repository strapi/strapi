import { Link as DSLink, LinkProps as DSLinkProps } from '@strapi/design-system/v2';
import { NavLink } from 'react-router-dom';

/**
 * @preserve
 *
 * @deprecated Use @strapi/design-system LinkButton instead.
 */
const Link = (props: DSLinkProps & { to?: string }) => <DSLink {...props} as={NavLink} />;

export { Link };
