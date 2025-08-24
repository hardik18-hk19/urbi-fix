"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, useUserRole } from "../../store/userStore";
import { ProtectedRoute } from "../../components/ProtectedRoute";
import { Loader2 } from "lucide-react";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const { getUserRole } = useUserRole();

  useEffect(() => {
    if (isAuthenticated && user) {
      const userRole = getUserRole();

      // Redirect based on user role
      switch (userRole) {
        case "admin":
          router.push("/admin-dashboard");
          break;
        case "provider":
          router.push("/provider-dashboard");
          break;
        case "consumer":
          router.push("/consumer-dashboard");
          break;
        default:
          router.push("/");
      }
    }
  }, [isAuthenticated, user, getUserRole, router]);

  return (
    <ProtectedRoute requiredRole="any" fallbackPath="/login">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-300">
            Redirecting to your dashboard...
          </span>
        </div>
      </div>
    </ProtectedRoute>
  );
}
