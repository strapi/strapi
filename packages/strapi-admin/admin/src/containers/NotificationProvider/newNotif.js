import React from 'react';
import ReactDOM from 'react-dom';

const NotificationComponent = () => {
  const notificationInstances = document.querySelectorAll('*[id^="strapi-notif"]');

  return (
    <div
      style={{
        position: 'absolute',
        top: (notificationInstances.length + 1) * 50,
        left: 10,
        backgroundColor: 'red',
        color: 'black',
        padding: '10px',
        border: '1px solid',
      }}
    >
      My custom notification
    </div>
  );
};

const displayNotif = () => {
  const div = document.createElement('div');
  div.setAttribute('id', 'strapi-notif');

  document.body.appendChild(div);

  ReactDOM.render(<NotificationComponent />, div);

  setTimeout(() => {
    document.body.removeChild(div);
  }, 3000);
};

export default displayNotif;
