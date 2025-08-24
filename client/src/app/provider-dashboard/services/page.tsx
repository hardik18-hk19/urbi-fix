"use client";

import { ProtectedRoute } from "../../../components/ProtectedRoute";
import ProviderServicesManagement from "../../../components/services/ProviderServicesManagement";

export default function ProviderServicesPage() {
  return (
    <ProtectedRoute requiredRole="provider" fallbackPath="/login">
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Service Management
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300">
              Manage your service offerings and availability
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ProviderServicesManagement />
        </div>
      </div>
    </ProtectedRoute>
  );
}
