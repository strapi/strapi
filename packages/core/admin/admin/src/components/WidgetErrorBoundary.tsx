import * as React from 'react';

import { Widget } from './WidgetHelpers';

interface WidgetErrorBoundaryProps {
  children: React.ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

/**
 * One widget throwing during render must not take down the rest of the homepage.
 */
class WidgetErrorBoundary extends React.Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <Widget.Error />;
    }

    return this.props.children;
  }
}

export { WidgetErrorBoundary };
