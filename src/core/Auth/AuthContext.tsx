import { createContext } from 'react';

export type TUserRole = 'admin' | 'manager' | 'guest';

export interface IAuthContext {
  user: { id: string; role: TUserRole } | null;
  login: (id: string, role: TUserRole) => void;
  logout: () => void;
}

export const AuthContext = createContext<IAuthContext | undefined>(undefined);
