import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService, User as BackendUser } from '../services/authService';
import { ValidationError } from '../services/apiService';
import { WelcomePage } from '../components/welcome/WelcomePage';
import toast from 'react-hot-toast';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  department: string;
  phone?: string;
  lastLogin?: Date;
  // Add backend compatibility
  username?: string;
  full_name?: string;
  created_at?: string;
  last_login?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<boolean>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Transform backend user to frontend format
const transformBackendUser = (backendUser: BackendUser): User => {
  return {
    id: backendUser.id,
    email: backendUser.email,
    name: backendUser.full_name,
    role: backendUser.role,
    department: backendUser.department,
    phone: backendUser.phone,
    lastLogin: backendUser.last_login ? new Date(backendUser.last_login) : undefined,
    // Keep backend fields for compatibility
    username: backendUser.username,
    full_name: backendUser.full_name,
    created_at: backendUser.created_at,
    last_login: backendUser.last_login,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const initializeAuth = async () => {
      const token = authService.getToken();
      const savedUser = authService.getStoredUser();
      
      if (token && savedUser) {
        try {
          // Verify token is still valid by fetching profile
          const backendUser = await authService.getProfile();
          setUser(transformBackendUser(backendUser));
        } catch (error) {
          // Token is invalid, clear auth data
          authService.logout();
          setUser(null);
        }
      }
      
      setIsLoading(false);
    };
    
    initializeAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    
    try {
      // Try backend authentication first
      const response = await authService.login(email, password);
      const transformedUser = transformBackendUser(response.user);
      setUser(transformedUser);
      setIsLoading(false);
      return true;
    } catch (error) {
      // Fallback to mock authentication for demo
      if (email === 'admin@taqa.ma' && password === 'admin123') {
        const mockUser: User = {
          id: 'admin-001',
          email: 'admin@taqa.ma',
          name: 'Ahmed Bennani',
          role: 'Administrateur Système',
          department: 'Direction Technique',
          phone: '+212 6 12 34 56 78',
          avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
          lastLogin: new Date(),
        };
        
        setUser(mockUser);
        localStorage.setItem('taqa_user', JSON.stringify(mockUser));
        localStorage.setItem('taqa_token', 'mock-token');
        setIsLoading(false);
        return true;
      }
      
      setIsLoading(false);
      
      if (error instanceof ValidationError) {
        toast.error('Données de connexion invalides');
      } else {
        toast.error('Erreur de connexion. Utilisation du mode démo.');
        console.error('Login error:', error);
      }
      
      return false;
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const updateProfile = async (data: Partial<User>): Promise<boolean> => {
    if (!user) return false;
    
    setIsLoading(true);
    
    try {
      // Try backend update first
      const backendUpdates = {
        full_name: data.name,
        email: data.email,
        department: data.department,
        phone: data.phone,
      };
      
      const updatedBackendUser = await authService.updateProfile(backendUpdates);
      const transformedUser = transformBackendUser(updatedBackendUser);
      setUser(transformedUser);
      setIsLoading(false);
      return true;
    } catch (error) {
      // Fallback to local update for demo
      const updatedUser = { ...user, ...data };
      setUser(updatedUser);
      localStorage.setItem('taqa_user', JSON.stringify(updatedUser));
      setIsLoading(false);
      
      if (error instanceof ValidationError) {
        toast.error('Données invalides');
        return false;
      } else {
        toast.warning('Mode démo - modifications locales uniquement');
        console.error('Profile update error:', error);
        return true;
      }
    }
  };

  const value = {
    user,
    login,
    logout,
    updateProfile,
    isAuthenticated: !!user,
    isLoading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!user && !isLoading ? (
        <WelcomePage onLogin={(credentials) => login(credentials.email, credentials.password)} />
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};