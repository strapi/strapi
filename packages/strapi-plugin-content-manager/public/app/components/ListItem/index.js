/**
*
* ListItem
*
*/
import React from 'react'; // eslint-disable-line no-unused-vars
import { Link } from 'react-router';

function ListItem(props) {
  return (
    <li>
      <Link to={props.destination} onClick={props.onClick}>
        <h4>{props.title}</h4>
      </Link>
      <p>{props.message}</p>
    </li>
  );
}

export default ListItem;
