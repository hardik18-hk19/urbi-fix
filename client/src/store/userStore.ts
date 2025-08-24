import { create } from "zustand";
import { persist } from "zustand/middleware";
import { User } from "../types";

// User interface is now imported from types file

// Define the store state interface
interface UserState {
  // State
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;

  // Computed getters for HACKADEMIA roles
  getUserRole: () => string | null;
  isAdmin: () => boolean;
  isConsumer: () => boolean;
  isProvider: () => boolean;
  isVerifiedProvider: () => boolean;
}

// Create the store with persistence
export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setUser: (user: User) =>
        set({
          user,
          isAuthenticated: true,
        }),

      setToken: (token: string) =>
        set({
          token,
          isAuthenticated: true,
        }),

      setAuth: (user: User, token: string) =>
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        }),

      clearAuth: () =>
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        }),

      updateUser: (updates: Partial<User>) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      setLoading: (loading: boolean) => set({ isLoading: loading }),

      // Computed getters
      getUserRole: () => {
        const { user } = get();
        return user?.role || null;
      },

      isAdmin: () => {
        const { user } = get();
        return user?.role === "admin";
      },

      isConsumer: () => {
        const { user } = get();
        return user?.role === "consumer";
      },

      isProvider: () => {
        const { user } = get();
        return user?.role === "provider";
      },

      // Helper methods for provider verification
      isVerifiedProvider: () => {
        const { user } = get();
        return (
          user?.role === "provider" && user?.providerDetails?.verified === true
        );
      },
    }),
    {
      name: "user-storage", // Key for localStorage
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }), // Only persist these fields
    }
  )
);

// Utility hooks for common use cases
export const useAuth = () => {
  const { user, token, isAuthenticated, isLoading } = useUserStore();
  const userRole = user?.role || null;

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    userRole,
    // Convenience methods
    isLoggedIn: isAuthenticated,
    hasRole: (role: string) => userRole === role,
  };
};

export const useUserActions = () => {
  const { setUser, setToken, setAuth, clearAuth, updateUser, setLoading } =
    useUserStore();
  return { setUser, setToken, setAuth, clearAuth, updateUser, setLoading };
};

export const useUserRole = () => {
  const { getUserRole, isAdmin, isConsumer, isProvider, isVerifiedProvider } =
    useUserStore();
  return { getUserRole, isAdmin, isConsumer, isProvider, isVerifiedProvider };
};

// Helper function to initialize auth from localStorage (for SSR compatibility)
export const initializeAuth = () => {
  if (typeof window !== "undefined") {
    const storedToken = localStorage.getItem("authToken");
    const { token, setToken } = useUserStore.getState();

    // Sync with localStorage if there's a mismatch
    if (storedToken && !token) {
      setToken(storedToken);
    } else if (!storedToken && token) {
      localStorage.setItem("authToken", token);
    }
  }
};

// Helper function to clear all auth data
export const clearAllAuthData = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user-storage");
  }
  useUserStore.getState().clearAuth();
};

// HACKADEMIA-specific helper functions
export const getRedirectPath = (role: string) => {
  switch (role) {
    case "admin":
      return "/admin-dashboard";
    case "consumer":
      return "/consumer-dashboard";
    case "provider":
      return "/provider-dashboard";
    default:
      return "/";
  }
};

export const canAccessRoute = (
  userRole: string | null,
  requiredRole: string
) => {
  if (!userRole) return false;
  if (requiredRole === "any") return true;
  return userRole === requiredRole;
};

// Provider verification helpers
export const updateProviderVerification = (verified: boolean) => {
  const { updateUser } = useUserStore.getState();
  updateUser({
    providerDetails: {
      ...useUserStore.getState().user?.providerDetails,
      verified,
    } as any,
  });
};
