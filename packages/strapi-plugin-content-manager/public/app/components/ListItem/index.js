/**
*
* ListItem
*
*/
import { Link } from 'react-router';

function ListItem(props) {
  return (
    <li>
      <Link to={props.destination}>
        <h4>{props.title}</h4>
      </Link>
      <p>{props.message}</p>
    </li>
  );
}

export default ListItem;
