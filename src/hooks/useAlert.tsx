import React, { createContext, useContext, useState, ReactNode } from 'react';
import CustomAlert, { AlertButton } from '../components/CustomAlert';

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons?: AlertButton[];
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose?: () => void;
}

interface AlertContextType {
  showAlert: (
    title: string,
    message: string,
    buttons?: AlertButton[],
    type?: 'success' | 'error' | 'info' | 'warning'
  ) => void;
  hideAlert: () => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const AlertProvider = ({ children }: { children: ReactNode }) => {
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: '',
    message: '',
  });

  const showAlert = (
    title: string,
    message: string,
    buttons?: AlertButton[],
    type: 'success' | 'error' | 'info' | 'warning' = 'info'
  ) => {
    setAlert({
      visible: true,
      title,
      message,
      buttons,
      type,
    });
  };

  const hideAlert = () => {
    setAlert((prev) => ({ ...prev, visible: false }));
  };

  return (
    <AlertContext.Provider value={{ showAlert, hideAlert }}>
      {children}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        buttons={alert.buttons}
        type={alert.type}
        onClose={hideAlert}
      />
    </AlertContext.Provider>
  );
};

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert must be used within AlertProvider');
  }
  return context;
};

