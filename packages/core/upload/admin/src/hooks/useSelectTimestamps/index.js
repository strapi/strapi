import { useSelector } from 'react-redux';
import selectFileModelTimestamps from '../../components/Initializer/selectors';

const useSelectTimestamps = () => {
  const timestamps = useSelector(selectFileModelTimestamps);

  return timestamps;
};

export default useSelectTimestamps;
