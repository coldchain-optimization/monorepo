import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import { api } from '../services/api';
import type { User, LoginInput, SignupInput } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (data: LoginInput) => Promise<void>;
  signup: (data: SignupInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(
    localStorage.getItem('token')
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      api
        .getProfile()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (data: LoginInput) => {
    try {
      const res = await api.login(data);
      if (res.token && res.user) {
        localStorage.setItem('token', res.token);
        setToken(res.token);
        setUser(res.user);
      } else {
        throw new Error('Invalid response: missing token or user');
      }
    } catch (err) {
      console.error('Login error:', err);
      throw err;
    }
  };

  const signup = async (data: SignupInput) => {
    try {
      const res = await api.signup(data);
      if (res.token && res.user) {
        localStorage.setItem('token', res.token);
        setToken(res.token);
        setUser(res.user);
      } else {
        throw new Error('Invalid response: missing token or user');
      }
    } catch (err) {
      console.error('Signup error:', err);
      throw err;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
