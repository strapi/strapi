import React from 'react';
import ReactDOM from 'react-dom';

const NotificationComponent = config => {
  // get all notification instances
  const notificationInstances = document.querySelectorAll('*[id^="strapi-notif"]');

  React.useEffect(() => {
    console.log('mounted');

    return () => console.log('unmounted');
  });

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
      {config.message}
    </div>
  );
};

const showNewNotification = config => {
  const div = document.createElement('div');
  div.setAttribute('id', 'strapi-notif');

  document.body.appendChild(div);

  ReactDOM.render(<NotificationComponent config={config} />, div);

  setTimeout(() => {
    destroyNotification(div);
  }, 3000);
};

const destroyNotification = notifElement => {
  // Unmount strapi-notif child
  const childHaveBeenUnmounted = ReactDOM.unmountComponentAtNode(notifElement);

  if (childHaveBeenUnmounted) {
    // Remove strapi-notif div from the dom
    document.body.removeChild(notifElement);
  }
};

export default showNewNotification;
