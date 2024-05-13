import { Earth } from '@strapi/icons';
import { render as renderRTL } from '@tests/utils';

import { DynamicZoneLabel, DynamicZoneLabelProps } from '../DynamicZoneLabel';

const LabelAction = () => {
  return (
    <button aria-label="i18n" type="button">
      <Earth aria-hidden />
    </button>
  );
};

describe('DynamicZoneLabel', () => {
  const Component = (props?: Partial<DynamicZoneLabelProps>) => (
    <DynamicZoneLabel label="dynamic zone" name="test" {...props} />
  );

  const render = (props?: Partial<DynamicZoneLabelProps>) => renderRTL(<Component {...props} />);

  it('should render the label by default', () => {
    const { getByText } = render();

    expect(getByText(/dynamic zone/)).toBeInTheDocument();
  });

  it('should render the name of the zone when there is no label', () => {
    const { getByText } = render({ label: '' });

    expect(getByText(/test/)).toBeInTheDocument();
  });

  it('should always render the amount of components no matter the value', () => {
    const { rerender, getByText } = render({ numberOfComponents: 0 });

    expect(getByText(/0/)).toBeInTheDocument();

    rerender(<Component numberOfComponents={2} />);

    expect(getByText(/2/)).toBeInTheDocument();
  });

  it('should render an asteriks when the required prop is true', () => {
    const { getByText } = render({ required: true });

    expect(getByText(/\*/)).toBeInTheDocument();
  });

  it('should render the labelAction when it is provided', () => {
    const { getByLabelText } = render({ labelAction: <LabelAction /> });

    expect(getByLabelText(/i18n/)).toBeInTheDocument();
  });

  it('should render a description if passed as a prop', () => {
    const { getByText } = render({
      hint: 'description',
    });

    expect(getByText(/description/)).toBeInTheDocument();
  });
});
