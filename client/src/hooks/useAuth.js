import { useRouter } from "next/navigation";
import {
  useAuth as useAuthStore,
  useUserActions,
  useUserRole,
} from "../store/userStore";
import { authAPI } from "../lib/api";

/**
 * Enhanced useAuth hook with additional authentication utilities
 * Provides a comprehensive interface for authentication operations
 */
export const useAuth = () => {
  const router = useRouter();
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    userRole,
    isLoggedIn,
    hasRole,
  } = useAuthStore();
  const { setAuth, clearAuth, setLoading } = useUserActions();
  const { isAdmin, isConsumer, isProvider, isVerifiedProvider } = useUserRole();

  /**
   * Enhanced login function
   */
  const login = async (credentials) => {
    setLoading(true);
    try {
      const response = await authAPI.login(credentials);

      // Set authentication state
      setAuth(response.user, response.token);

      // Store token in localStorage for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", response.token);
      }

      return {
        success: true,
        user: response.user,
        redirectPath: getRedirectPath(response.user.role),
      };
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        error:
          error.response?.data?.message || "Login failed. Please try again.",
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enhanced register function
   */
  const register = async (userData) => {
    setLoading(true);
    try {
      const response = await authAPI.register(userData);

      // Set authentication state
      setAuth(response.user, response.token);

      // Store token in localStorage for persistence
      if (typeof window !== "undefined") {
        localStorage.setItem("authToken", response.token);
      }

      return {
        success: true,
        user: response.user,
        redirectPath: getRedirectPath(response.user.role),
      };
    } catch (error) {
      console.error("Registration error:", error);
      return {
        success: false,
        error:
          error.response?.data?.message ||
          "Registration failed. Please try again.",
      };
    } finally {
      setLoading(false);
    }
  };

  /**
   * Enhanced logout function
   */
  const logout = () => {
    // Clear authentication state
    clearAuth();

    // Clear localStorage
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken");
      localStorage.removeItem("user-storage");
    }

    // Redirect to home page
    router.push("/");
  };

  /**
   * Get redirect path based on user role
   */
  const getRedirectPath = (role) => {
    switch (role) {
      case "admin":
        return "/admin-dashboard";
      case "provider":
        return "/provider-dashboard";
      case "consumer":
      default:
        return "/consumer-dashboard";
    }
  };

  /**
   * Navigate to role-appropriate dashboard
   */
  const goToDashboard = () => {
    if (user?.role) {
      router.push(getRedirectPath(user.role));
    }
  };

  /**
   * Check if user can access a specific route
   */
  const canAccessRoute = (requiredRole) => {
    if (!isAuthenticated) return false;
    if (requiredRole === "any") return true;
    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(userRole);
    }
    return userRole === requiredRole;
  };

  /**
   * Redirect to login if not authenticated
   */
  const requireAuth = (redirectTo = "/login") => {
    if (!isAuthenticated) {
      router.push(redirectTo);
      return false;
    }
    return true;
  };

  /**
   * Initialize authentication from localStorage (useful for SSR)
   */
  const initializeAuth = () => {
    if (typeof window !== "undefined") {
      const storedToken = localStorage.getItem("authToken");
      if (storedToken && !token) {
        // Note: In a real app, you'd want to validate the token with the server
        // For now, we'll just assume it's valid if it exists
        console.log("Token found in localStorage, user should be logged in");
      }
    }
  };

  return {
    // State
    user,
    token,
    isAuthenticated,
    isLoggedIn,
    isLoading,
    userRole,

    // Role checks
    isAdmin: isAdmin(),
    isConsumer: isConsumer(),
    isProvider: isProvider(),
    isVerifiedProvider: isVerifiedProvider(),
    hasRole,

    // Actions
    login,
    register,
    logout,
    goToDashboard,

    // Utilities
    canAccessRoute,
    requireAuth,
    initializeAuth,
    getRedirectPath,
  };
};

export default useAuth;
