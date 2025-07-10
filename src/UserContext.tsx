import React, { createContext, useContext, useState } from 'react';

export interface UserData {
  wallet?: string;
  clabe?: string;
  // Puedes agregar más campos según lo que captures en el registro
  [key: string]: any;
}

interface UserContextType {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
  updateUser: (fields: Partial<UserData>) => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser debe usarse dentro de UserProvider');
  return ctx;
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserData | null>(null);
  const updateUser = (fields: Partial<UserData>) => setUser(prev => ({ ...prev, ...fields }));
  return (
    <UserContext.Provider value={{ user, setUser, updateUser }}>
      {children}
    </UserContext.Provider>
  );
}; 