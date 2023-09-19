import * as React from 'react';
interface UseFocusWhenNavigateProps {
  selector?: string;
  dependencies?: React.DependencyList;
}

const useFocusWhenNavigate = ({
  selector = 'main',
  dependencies = [],
}: UseFocusWhenNavigateProps = {}) => {
  React.useEffect(() => {
    const mainElement: HTMLElement | null = document.querySelector(selector);

    if (mainElement) {
      mainElement.focus();
      window.scrollTo({ top: 0 });
    } else {
      console.warn(
        `[useFocusWhenNavigate] The page does not contain the selector "${selector}" and can't be focused.`
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
};

export { useFocusWhenNavigate };
