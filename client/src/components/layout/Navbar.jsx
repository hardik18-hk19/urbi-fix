"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserActions, useUserRole } from "../../store/userStore";
import useAuth from "../../hooks/useAuth";
import { useNotifications } from "../../contexts/NotificationContext";
import { useTheme } from "../../contexts/ThemeContext";
import { Button } from "../ui/button";
import ClientOnly from "../ClientOnly";
import NotificationPanel from "../notifications/NotificationPanel";
import {
  Menu,
  X,
  Sun,
  Moon,
  User,
  Settings,
  LogOut,
  Home,
  MapPin,
  Wrench,
  Shield,
  Bell,
  MessageCircle,
} from "lucide-react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const router = useRouter();

  const auth = useAuth();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    // Use the enhanced auth logout function
    auth.logout();

    // Close any open dropdowns
    setIsProfileOpen(false);
    setIsMenuOpen(false);
  };

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const toggleProfile = () => setIsProfileOpen(!isProfileOpen);

  // Navigation items based on user role
  const getNavItems = () => {
    if (!auth.isAuthenticated) {
      return [
        { href: "/", label: "Home", icon: Home },
        { href: "/about", label: "About", icon: null },
        { href: "/contact", label: "Contact", icon: null },
      ];
    }

    const baseItems = [
      { href: "/", label: "Home", icon: Home },
      { href: "/issues", label: "Issues", icon: Wrench },
      { href: "/forum", label: "Community Forum", icon: MessageCircle },
      { href: "/map", label: "Map View", icon: MapPin },
    ];

    if (auth.isAdmin) {
      return [
        ...baseItems,
        { href: "/admin-dashboard", label: "Admin Panel", icon: Shield },
        { href: "/admin-dashboard/users", label: "Manage Users", icon: User },
        { href: "/admin-dashboard/issues", label: "All Issues", icon: Wrench },
        {
          href: "/admin-dashboard/services",
          label: "Manage Services",
          icon: Settings,
        },
        { href: "/services", label: "Browse Services", icon: null },
      ];
    } else if (auth.isConsumer) {
      return [
        ...baseItems,
        { href: "/consumer-dashboard", label: "Dashboard", icon: User },
        {
          href: "/consumer-dashboard/issues",
          label: "My Issues",
          icon: Wrench,
        },
        {
          href: "/consumer-dashboard/bookings",
          label: "My Bookings",
          icon: null,
        },
        {
          href: "/consumer-dashboard/services",
          label: "Browse Services",
          icon: null,
        },
        { href: "/services", label: "All Services", icon: null },
      ];
    } else if (auth.isProvider) {
      return [
        ...baseItems,
        { href: "/provider-dashboard", label: "Dashboard", icon: User },
        {
          href: "/provider-dashboard/services",
          label: "My Services",
          icon: Wrench,
        },
        { href: "/provider-dashboard/bookings", label: "Bookings", icon: null },
        {
          href: "/provider-dashboard/issues",
          label: "Available Issues",
          icon: null,
        },
      ];
    }

    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white dark:bg-gray-900 shadow-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                URBI-FIX
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  {Icon && <Icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            {/* Theme Toggle */}
            <ClientOnly fallback={<div className="w-9 h-9" />}>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleTheme}
                className="w-9 h-9 p-0"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </Button>
            </ClientOnly>

            {/* Notifications (if authenticated) */}
            {auth.isAuthenticated && (
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-9 h-9 p-0 relative"
                  onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>

                {/* Notification Dropdown */}
                {isNotificationOpen && (
                  <div className="absolute right-0 top-full mt-2 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                      <NotificationPanel />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Authentication */}
            {auth.isAuthenticated ? (
              <div className="relative">
                <Button
                  variant="ghost"
                  onClick={toggleProfile}
                  className="flex items-center space-x-2"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {auth.user?.name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden sm:block text-gray-700 dark:text-gray-300">
                    {auth.user?.name}
                  </span>
                </Button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-50 border border-gray-200 dark:border-gray-700">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {auth.user?.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {auth.user?.email}
                      </p>
                      <span className="inline-block mt-1 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        {auth.user?.role}
                      </span>
                    </div>

                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>

                    <Link
                      href="/settings"
                      className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" asChild>
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Sign Up</Link>
                </Button>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
              className="md:hidden w-9 h-9 p-0"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-700 py-4">
            <div className="space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center space-x-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Click outside to close dropdowns */}
      {(isMenuOpen || isProfileOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsMenuOpen(false);
            setIsProfileOpen(false);
          }}
        />
      )}
    </nav>
  );
};

export default Navbar;
