import * as React from 'react';

import {
  Box,
  Breadcrumbs,
  Button,
  Crumb,
  Field,
  Flex,
  Modal,
  SingleSelect,
  SingleSelectOption,
  Typography,
  VisuallyHidden,
} from '@strapi/design-system';
import { Cog } from '@strapi/icons';
import { useIntl } from 'react-intl';

import { DATA_ACTIONS } from '../../../../../shared/contracts/permissions';
import { getTranslation } from '../../../utils/getTranslation';

import { RulesDot } from './RulesDot';
import { ConditionActionRow } from './settings/ConditionActionRow';
import { ConditionInputs, isMissing, toConditionRef } from './settings/ConditionInputs';

import type { DataAction, LayoutContentType } from '../../../../../shared/contracts/permissions';
import type { SubjectSettings } from '../utils/editorModel';

/** The depths a role can be given besides Unlimited; a stored depth outside them is listed too */
const DEPTHS = [1, 2, 3, 5];

const UNLIMITED = 'unlimited';
const MIXED = 'mixed';

type Conditions = SubjectSettings['conditions'];
type Depth = SubjectSettings['populateDepth'];

const toDepthValue = (depth: Depth) => {
  if (depth === 'mixed') {
    return MIXED;
  }

  return depth === null ? UNLIMITED : String(depth);
};

const fromDepthValue = (value: string | number): Depth => {
  if (value === MIXED) {
    return 'mixed';
  }

  return value === UNLIMITED ? null : Number(value);
};

/* -------------------------------------------------------------------------------------------------
 * SettingsForm
 * -----------------------------------------------------------------------------------------------*/

interface SubjectSettingsModalProps {
  contentType: LayoutContentType;
  /** The actions the editor grants on the content type: conditions are set on those */
  granted: DataAction[];
  value: SubjectSettings;
  disabled: boolean;
  onApply: (next: SubjectSettings) => void;
}

interface SettingsFormProps extends SubjectSettingsModalProps {
  onClose: () => void;
}

const cloneConditions = (conditions: Conditions): Conditions =>
  JSON.parse(JSON.stringify(conditions));

/**
 * The body of the modal. It is mounted when the modal opens, so each opening starts from `value`
 * and a Cancel leaves no trace.
 */
const SettingsForm = ({
  contentType,
  granted,
  value,
  disabled,
  onApply,
  onClose,
}: SettingsFormProps) => {
  const { formatMessage } = useIntl();
  const [conditions, setConditions] = React.useState(() => cloneConditions(value.conditions));
  const [populateDepth, setPopulateDepth] = React.useState<Depth>(value.populateDepth);

  const actions = DATA_ACTIONS.filter((action) => granted.includes(action));
  const hasConditions =
    contentType.conditions.length > 0 ||
    actions.some((action) => (value.conditions[action] ?? []).length > 0);

  // A condition chosen without an input it needs would be refused when the role is saved
  const isIncomplete = actions.some((action) =>
    (conditions[action] ?? []).some((ref) =>
      (contentType.conditions.find(({ name }) => name === ref.name)?.params ?? [])
        .filter((param) => param.createOnly !== true || action === 'create')
        .some((param) => isMissing(param, ref, contentType))
    )
  );

  const setNames = (action: DataAction, names: string[]) =>
    setConditions((current) => {
      const chosen = current[action] ?? [];
      const loaded = value.conditions[action] ?? [];

      return {
        ...current,
        [action]: names.flatMap((name) => {
          const condition = contentType.conditions.find((entry) => entry.name === name);
          const ref =
            chosen.find((entry) => entry.name === name) ??
            (condition ? toConditionRef(condition, action, contentType) : undefined) ??
            loaded.find((entry) => entry.name === name);

          return ref ? [ref] : [];
        }),
      };
    });

  const setParam = (action: DataAction, name: string, param: string, next: unknown) =>
    setConditions((current) => ({
      ...current,
      [action]: (current[action] ?? []).map((ref) => {
        if (ref.name !== name) {
          return ref;
        }

        const { [param]: _previous, ...others } = ref.params ?? {};
        const params = next === undefined ? others : { ...others, [param]: next };

        return Object.keys(params).length > 0 ? { name, params } : { name };
      }),
    }));

  const depths = [
    ...new Set([
      ...DEPTHS,
      ...(typeof value.populateDepth === 'number' ? [value.populateDepth] : []),
    ]),
  ].sort((a, b) => a - b);

  const handleApply = () => {
    const next = Object.fromEntries(
      Object.entries(conditions).filter(([, list]) => list.length > 0)
    ) as Conditions;

    onApply({ populateDepth, conditions: next });
    onClose();
  };

  return (
    <>
      <Modal.Header>
        <VisuallyHidden>
          <Modal.Title>
            {`${contentType.label}, ${formatMessage({ id: 'global.settings', defaultMessage: 'Settings' })}`}
          </Modal.Title>
        </VisuallyHidden>
        <Breadcrumbs
          id="end-users-conditions-modal-breadcrumbs"
          label={`${contentType.label}, ${formatMessage({ id: 'global.settings', defaultMessage: 'Settings' })}`}
        >
          <Crumb>{contentType.label}</Crumb>
          <Crumb isCurrent>
            {formatMessage({ id: 'global.settings', defaultMessage: 'Settings' })}
          </Crumb>
        </Breadcrumbs>
      </Modal.Header>
      <Modal.Body>
        <Flex direction="column" alignItems="stretch" gap={6}>
          <Field.Root
            hint={formatMessage(
              {
                id: getTranslation('roles.settings.depth.hint'),
                defaultMessage:
                  'How many levels of relations this role can populate from {name}. <code>populate=*</code> is one level.',
              },
              {
                name: contentType.label,
                code: (chunks: React.ReactNode) => <code>{chunks}</code>,
              }
            )}
          >
            <Field.Label>
              {formatMessage({
                id: getTranslation('roles.settings.depth'),
                defaultMessage: 'Populate depth',
              })}
            </Field.Label>
            <SingleSelect
              value={toDepthValue(populateDepth)}
              disabled={disabled}
              onChange={(next) => setPopulateDepth(fromDepthValue(next))}
            >
              {populateDepth === 'mixed' && (
                <SingleSelectOption value={MIXED}>
                  {formatMessage({
                    id: getTranslation('roles.settings.depth.mixed'),
                    defaultMessage: 'Mixed',
                  })}
                </SingleSelectOption>
              )}
              {depths.map((depth) => (
                <SingleSelectOption key={depth} value={String(depth)}>
                  {formatMessage(
                    {
                      id: getTranslation('roles.settings.depth.levels'),
                      defaultMessage: '{count, plural, one {# level} other {# levels}}',
                    },
                    { count: depth }
                  )}
                </SingleSelectOption>
              ))}
              <SingleSelectOption value={UNLIMITED}>
                {formatMessage({
                  id: getTranslation('roles.settings.depth.unlimited'),
                  defaultMessage: 'Unlimited',
                })}
              </SingleSelectOption>
            </SingleSelect>
            <Field.Hint />
          </Field.Root>
          {actions.length === 0 ? (
            <Typography textColor="neutral600">
              {formatMessage({
                id: getTranslation('roles.settings.no-actions'),
                defaultMessage:
                  'Conditions are set on the actions the role is granted. Tick an action first.',
              })}
            </Typography>
          ) : !hasConditions ? (
            <Typography textColor="neutral600">
              {formatMessage(
                {
                  id: getTranslation('roles.settings.no-conditions'),
                  defaultMessage: 'No condition applies to {name}.',
                },
                { name: contentType.label }
              )}
            </Typography>
          ) : (
            <Box tag="ul">
              {actions.map((action, index) => {
                const chosen = conditions[action] ?? [];

                return (
                  <ConditionActionRow
                    key={action}
                    action={action}
                    available={contentType.conditions}
                    unavailable={(value.conditions[action] ?? []).filter(
                      ({ name }) => !contentType.conditions.some((entry) => entry.name === name)
                    )}
                    value={chosen}
                    isGrey={index % 2 === 0}
                    isReadOnly={disabled}
                    onChange={(names) => setNames(action, names)}
                  >
                    <ConditionInputs
                      action={action}
                      contentType={contentType}
                      conditions={chosen.flatMap((ref) => {
                        const condition = contentType.conditions.find(
                          (entry) => entry.name === ref.name
                        );

                        return condition ? [{ condition, ref }] : [];
                      })}
                      onChange={(name, param, next) => setParam(action, name, param, next)}
                    />
                  </ConditionActionRow>
                );
              })}
            </Box>
          )}
        </Flex>
      </Modal.Body>
      <Modal.Footer>
        {disabled ? (
          <Button variant="tertiary" type="button" onClick={onClose}>
            {formatMessage({ id: 'app.components.Button.close', defaultMessage: 'Close' })}
          </Button>
        ) : (
          <>
            <Button variant="tertiary" type="button" onClick={onClose}>
              {formatMessage({ id: 'app.components.Button.cancel', defaultMessage: 'Cancel' })}
            </Button>
            <Button type="button" disabled={isIncomplete} onClick={handleApply}>
              {formatMessage({
                id: 'Settings.permissions.conditions.apply',
                defaultMessage: 'Apply',
              })}
            </Button>
          </>
        )}
      </Modal.Footer>
    </>
  );
};

/* -------------------------------------------------------------------------------------------------
 * SubjectSettingsModal
 * -----------------------------------------------------------------------------------------------*/

/** Whether the type has anything set: a condition on an action, or a depth other than Unlimited */
const hasSettings = ({ populateDepth, conditions }: SubjectSettings) =>
  populateDepth !== null || Object.values(conditions).some((list) => list.length > 0);

/**
 * The Settings button of a content type and the modal it opens: the conditions of each granted
 * action, and the populate depth of the type. Nothing leaves the modal until Apply.
 */
const SubjectSettingsModal = ({
  contentType,
  granted,
  value,
  disabled,
  onApply,
}: SubjectSettingsModalProps) => {
  const { formatMessage } = useIntl();
  const [open, setOpen] = React.useState(false);

  return (
    <Modal.Root open={open} onOpenChange={setOpen}>
      <Box position="relative">
        {hasSettings(value) && (
          <RulesDot
            role="img"
            aria-label={formatMessage({
              id: getTranslation('roles.settings.set'),
              defaultMessage: 'A condition or a populate depth is set.',
            })}
            position="absolute"
            top="-3px"
            left="-10px"
          />
        )}
        <Modal.Trigger>
          <Button variant="tertiary" startIcon={<Cog />} type="button">
            {formatMessage({ id: 'global.settings', defaultMessage: 'Settings' })}
          </Button>
        </Modal.Trigger>
      </Box>
      <Modal.Content
        aria-label={`${contentType.label}, ${formatMessage({ id: 'global.settings', defaultMessage: 'Settings' })}`}
      >
        <SettingsForm
          contentType={contentType}
          granted={granted}
          value={value}
          disabled={disabled}
          onApply={onApply}
          onClose={() => setOpen(false)}
        />
      </Modal.Content>
    </Modal.Root>
  );
};

export { SubjectSettingsModal };
export type { SubjectSettingsModalProps };
