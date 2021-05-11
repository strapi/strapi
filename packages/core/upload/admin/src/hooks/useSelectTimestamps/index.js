import { useSelector } from 'react-redux';
import selectFileModelTimestamps from '../../containers/Initializer/selectors';

const useSelectTimestamps = () => {
  const timestamps = useSelector(selectFileModelTimestamps);

  return timestamps;
};

export default useSelectTimestamps;
