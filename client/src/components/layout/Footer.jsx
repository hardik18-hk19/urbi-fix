"use client";

import Link from "next/link";
import { useAuth, useUserRole } from "../../store/userStore";
import {
  Mail,
  Phone,
  MapPin,
  Github,
  Twitter,
  Linkedin,
  Heart,
  ExternalLink,
} from "lucide-react";

const Footer = () => {
  const { isAuthenticated } = useAuth();
  const { isAdmin, isConsumer, isProvider } = useUserRole();

  const footerLinks = {
    platform: [
      { label: "About URBI-FIX", href: "/about" },
      { label: "How It Works", href: "/how-it-works" },
      { label: "Features", href: "/features" },
      { label: "Pricing", href: "/pricing" },
    ],
    services: [
      { label: "Report Issues", href: "/report-issue" },
      { label: "Find Services", href: "/services" },
      { label: "Become Provider", href: "/become-provider" },
      { label: "Map View", href: "/map" },
    ],
    support: [
      { label: "Help Center", href: "/help" },
      { label: "Contact Us", href: "/contact" },
      { label: "FAQ", href: "/faq" },
      { label: "Community", href: "/community" },
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
      { label: "Guidelines", href: "/guidelines" },
    ],
  };

  // Quick actions based on user role
  const getQuickActions = () => {
    if (!isAuthenticated) return [];

    if (isAdmin()) {
      return [
        { label: "Admin Dashboard", href: "/admin-dashboard" },
        { label: "User Management", href: "/admin-dashboard/users" },
        { label: "System Reports", href: "/admin-dashboard/reports" },
      ];
    } else if (isConsumer()) {
      return [
        { label: "My Dashboard", href: "/consumer-dashboard" },
        { label: "Report New Issue", href: "/issues" },
        { label: "Track Issues", href: "/consumer-dashboard/issues" },
      ];
    } else if (isProvider()) {
      return [
        { label: "Provider Dashboard", href: "/provider-dashboard" },
        { label: "Manage Services", href: "/provider-dashboard/services" },
        { label: "View Bookings", href: "/provider-dashboard/bookings" },
      ];
    }

    return [];
  };

  const quickActions = getQuickActions();

  return (
    <footer className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">H</span>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">
                URBI-FIX
              </span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4 max-w-md">
              Your digital citizen helpdesk for smart cities. Connecting
              citizens, service providers, and municipal authorities on one
              unified platform.
            </p>

            {/* Contact Info */}
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>support@urbi-fix.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>+91 12345 67890</span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>Bangalore, Karnataka, India</span>
              </div>
            </div>

            {/* Social Links */}
            <div className="flex space-x-4 mt-6">
              <a
                href="https://github.com/NCJ-Hackademia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com/hackademia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://linkedin.com/company/hackademia"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Platform
            </h3>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Services Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Services
            </h3>
            <ul className="space-y-2">
              {footerLinks.services.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
              Support
            </h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Actions (Role-based) */}
          {quickActions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">
                Quick Actions
              </h3>
              <ul className="space-y-2">
                {quickActions.map((action) => (
                  <li key={action.href}>
                    <Link
                      href={action.href}
                      className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-sm flex items-center space-x-1"
                    >
                      <span>{action.label}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 pt-8 border-t border-gray-200 dark:border-gray-700">
          <div className="md:flex md:items-center md:justify-between">
            <div className="max-w-md">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Stay Updated
              </h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Get the latest updates about new features and city improvements.
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <form className="flex space-x-2">
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 min-w-0 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="bg-gray-100 dark:bg-gray-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="md:flex md:items-center md:justify-between">
            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
              <span>© 2025 HACKADEMIA. All rights reserved.</span>
              {footerLinks.legal.map((link, index) => (
                <span key={link.href} className="hidden md:inline">
                  {index > 0 && <span className="mx-2">•</span>}
                  <Link
                    href={link.href}
                    className="hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                  >
                    {link.label}
                  </Link>
                </span>
              ))}
            </div>

            <div className="mt-2 md:mt-0 flex items-center text-sm text-gray-600 dark:text-gray-400">
              <span>Made with</span>
              <Heart className="w-4 h-4 mx-1 text-red-500" />
              <span>for Smart Cities</span>
            </div>
          </div>

          {/* Mobile Legal Links */}
          <div className="md:hidden mt-3 flex flex-wrap gap-4">
            {footerLinks.legal.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
