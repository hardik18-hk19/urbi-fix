"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUserRole, initializeAuth } from "../store/userStore";

// Loading component
const DefaultLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    <span className="ml-3 text-lg text-gray-600">Loading...</span>
  </div>
);

// Unauthorized access component
const UnauthorizedAccess = ({ userRole, requiredRole, onRedirect }) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6 text-center">
      <div className="mb-4">
        <svg
          className="mx-auto h-16 w-16 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
      <p className="text-gray-600 mb-4">
        {userRole
          ? `Your role (${userRole}) doesn't have permission to access this page. Required role: ${requiredRole}`
          : "You need to be logged in to access this page."}
      </p>
      <button
        onClick={onRedirect}
        className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
      >
        {userRole ? "Go to Dashboard" : "Login"}
      </button>
    </div>
  </div>
);

// JWT token validation function
const isTokenValid = (token) => {
  if (!token) return false;

  try {
    // Decode JWT token (basic validation)
    const payload = JSON.parse(atob(token.split(".")[1]));
    const currentTime = Date.now() / 1000;

    // Check if token is expired
    if (payload.exp && payload.exp < currentTime) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Invalid token format:", error);
    return false;
  }
};

// Role-based access control
const hasRequiredRole = (userRole, requiredRole) => {
  if (!requiredRole || requiredRole === "any") return true;
  if (!userRole) return false;

  // Handle array of roles
  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(userRole);
  }

  return userRole === requiredRole;
};

// Get redirect path based on user role
const getRedirectPath = (user) => {
  if (!user) return "/login";

  switch (user.role) {
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

// Main ProtectedRoute component
export const ProtectedRoute = ({
  children,
  requiredRole,
  fallbackPath,
  adminOnly = false,
  loadingComponent = <DefaultLoader />,
}) => {
  const router = useRouter();
  const { user, token, isAuthenticated, isLoading } = useAuth();
  const { getUserRole, isAdmin } = useUserRole();
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize auth on component mount
  useEffect(() => {
    initializeAuth();
    setIsInitialized(true);
  }, []);

  // Handle authentication and authorization logic
  useEffect(() => {
    if (!isInitialized) return;

    // Check if token is valid
    const tokenValid = isTokenValid(token);

    if (!tokenValid && token) {
      // Invalid token - clear auth and redirect to login
      console.warn("Invalid or expired token detected");
      // Clear auth data
      localStorage.removeItem("authToken");
      router.push("/login");
      return;
    }

    // Check authentication
    if (!isAuthenticated || !user || !tokenValid) {
      const redirectPath = fallbackPath || "/login";
      console.log("Redirecting to login - not authenticated");
      router.push(redirectPath);
      return;
    }

    // Admin-only check
    if (adminOnly && !isAdmin()) {
      console.log("Access denied - admin only");
      const userDashboard = getRedirectPath(user);
      router.push(userDashboard);
      return;
    }

    // Role-based access control
    const userRole = getUserRole();
    if (!hasRequiredRole(userRole, requiredRole)) {
      console.log(
        `Access denied - required role: ${requiredRole}, user role: ${userRole}`
      );
      const userDashboard = getRedirectPath(user);
      router.push(userDashboard);
      return;
    }
  }, [
    isInitialized,
    isAuthenticated,
    user,
    token,
    requiredRole,
    adminOnly,
    router,
    fallbackPath,
    getUserRole,
    isAdmin,
  ]);

  // Show loading while initializing or checking auth
  if (!isInitialized || isLoading) {
    return loadingComponent;
  }

  // Check token validity
  if (!isTokenValid(token)) {
    return null; // Will redirect in useEffect
  }

  // Check authentication
  if (!isAuthenticated || !user) {
    return (
      <UnauthorizedAccess
        userRole={null}
        requiredRole={requiredRole || "authenticated"}
        onRedirect={() => router.push("/login")}
      />
    );
  }

  // Check admin-only access
  if (adminOnly && !isAdmin()) {
    return (
      <UnauthorizedAccess
        userRole={getUserRole()}
        requiredRole="admin"
        onRedirect={() => router.push(getRedirectPath(user))}
      />
    );
  }

  // Check role-based access
  const userRole = getUserRole();
  if (!hasRequiredRole(userRole, requiredRole)) {
    return (
      <UnauthorizedAccess
        userRole={userRole}
        requiredRole={requiredRole || "any"}
        onRedirect={() => router.push(getRedirectPath(user))}
      />
    );
  }

  // All checks passed - render protected content
  return <>{children}</>;
};

// HOC version for easier usage
export const withProtectedRoute = (Component, options = {}) => {
  const WrappedComponent = (props) => (
    <ProtectedRoute {...options}>
      <Component {...props} />
    </ProtectedRoute>
  );

  WrappedComponent.displayName = `withProtectedRoute(${
    Component.displayName || Component.name
  })`;
  return WrappedComponent;
};

// Utility hooks for permission checking
export const usePermissions = () => {
  const { user } = useAuth();
  const { isAdmin, isConsumer, isProvider } = useUserRole();

  return {
    canAccessAdmin: () => isAdmin(),
    canAccessConsumerFeatures: () => isConsumer() || isAdmin(),
    canAccessProviderFeatures: () => isProvider() || isAdmin(),
    canManageUsers: () => isAdmin(),
    canVerifyProviders: () => isAdmin(),
    canCreateIssues: () => isConsumer() || isAdmin(),
    canAcceptBookings: () => isProvider() || isAdmin(),
    canViewAllIssues: () => isAdmin(),
    canModerateContent: () => isAdmin(),
    isVerifiedProvider: () => {
      return isProvider() && user?.providerDetails?.verified === true;
    },
  };
};

export default ProtectedRoute;
