import * as React from 'react';

import { Flex, Grid, LinkButton, Typography } from '@strapi/design-system';
import { ExternalLink } from '@strapi/icons';
import { useIntl, type MessageDescriptor } from 'react-intl';

import { useEnterprise } from '../../../../../hooks/useEnterprise';

import type { ProjectType } from '../../../../../utils/getProjectType';

/* -------------------------------------------------------------------------------------------------
 * PlanDetail
 * -----------------------------------------------------------------------------------------------*/

interface PlanDetailProps {
  label: MessageDescriptor;
  value: React.ReactNode;
}

/**
 * A single labelled value rendered inside the Plan card's `<dl>`. Shared between the CE fallback
 * body (current plan only) and the EE body (license details), so both stay visually consistent.
 */
const PlanDetail = ({ label, value }: PlanDetailProps) => {
  const { formatMessage } = useIntl();

  return (
    <Grid.Item col={6} xs={12} direction="column" alignItems="start">
      <Typography variant="sigma" textColor="neutral600" tag="dt">
        {formatMessage(label)}
      </Typography>
      <Typography tag="dd">{value}</Typography>
    </Grid.Item>
  );
};

/* -------------------------------------------------------------------------------------------------
 * PlanCard
 * -----------------------------------------------------------------------------------------------*/

/**
 * The billing link's label and destination depend on the current plan: Community links out to the
 * public pricing page, while Growth and Enterprise link to the billing portal.
 */
const PLAN_LINK: Record<ProjectType, { label: MessageDescriptor; href: string }> = {
  Community: {
    label: { id: 'Settings.application.plan.see-all-plans', defaultMessage: 'See all plans' },
    href: 'https://strapi.io/pricing-self-hosted',
  },
  Growth: {
    label: {
      id: 'Settings.application.plan.manage-subscription',
      defaultMessage: 'Manage subscription',
    },
    href: 'https://billing.strapi.io',
  },
  Enterprise: {
    label: {
      id: 'Settings.application.plan.view-subscription',
      defaultMessage: 'View subscription',
    },
    href: 'https://billing.strapi.io',
  },
};

const PlanCardBodyCE = () => (
  <Grid.Root gap={5} tag="dl">
    <PlanDetail
      label={{ id: 'Settings.application.plan.current', defaultMessage: 'current plan' }}
      value={window.strapi.projectType}
    />
  </Grid.Root>
);

const PlanCard = () => {
  const { formatMessage } = useIntl();

  const PlanCardBody = useEnterprise(
    PlanCardBodyCE,
    async () =>
      (
        await import(
          '../../../../../../../ee/admin/src/pages/SettingsPage/pages/ApplicationInfoPage/components/LicenseInfo'
        )
      ).LicenseInfoEE
  );

  // block rendering until the EE component is fully loaded
  if (!PlanCardBody) {
    return null;
  }

  const { label, href } = PLAN_LINK[window.strapi.projectType];

  return (
    <Flex
      direction="column"
      alignItems="stretch"
      gap={4}
      hasRadius
      background="neutral0"
      shadow="tableShadow"
      paddingTop={6}
      paddingBottom={6}
      paddingRight={7}
      paddingLeft={7}
    >
      <Flex justifyContent="space-between" alignItems="center">
        <Typography variant="delta" tag="h3">
          {formatMessage({ id: 'Settings.application.plan.title', defaultMessage: 'Plan' })}
        </Typography>
        <LinkButton
          variant="secondary"
          endIcon={<ExternalLink />}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {formatMessage(label)}
        </LinkButton>
      </Flex>
      <PlanCardBody />
    </Flex>
  );
};

export { PlanCard, PlanDetail };
export type { PlanDetailProps };
