import React, {createContext, useState, useContext} from 'react';

interface NotificationsContextType {
  hasUnread: boolean;
  clearUnread: () => void;
  setUnread: () => void;
}

const NotificationsContext = createContext<NotificationsContextType>({
  hasUnread: false,
  clearUnread: () => {},
  setUnread: () => {},
});

export const useNotifications = () => useContext(NotificationsContext);

export const NotificationsProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  // Simulate having an unread notification by default
  const [hasUnread, setHasUnread] = useState(true);

  const clearUnread = () => setHasUnread(false);
  const setUnread = () => setHasUnread(true);

  return (
    <NotificationsContext.Provider value={{hasUnread, clearUnread, setUnread}}>
      {children}
    </NotificationsContext.Provider>
  );
};
