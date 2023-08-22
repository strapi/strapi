import { useEffect } from 'react';

type DependencyList = ReadonlyArray<unknown>;
interface UseFocusWhenNavigateProps {
  selector?: string;
  dependencies?: DependencyList;
}

const useFocusWhenNavigate = ({
  selector = 'main',
  dependencies = [],
}: UseFocusWhenNavigateProps) => {
  useEffect(() => {
    const mainElement = document.querySelector(selector);

    if (mainElement) {
      (mainElement as HTMLElement).focus();
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
