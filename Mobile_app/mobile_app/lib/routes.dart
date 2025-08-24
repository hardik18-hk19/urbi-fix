import 'package:flutter/material.dart';
import 'pages/auth/splash_page.dart';
import 'pages/auth/login_page.dart';
import 'pages/auth/signup_page.dart';
import 'pages/auth/role_selector_page.dart';
import 'pages/home/home_page.dart';
import 'pages/home/map_view.dart';
import 'pages/consumer/consumer_dashboard.dart';
import 'pages/provider/provider_dashboard.dart';
import 'pages/consumer/booking_status_page.dart';
import 'pages/account/user_profile_page.dart';
import 'pages/consumer/consumer_profile_page.dart';
import 'pages/provider/provider_profile_page.dart';
import 'pages/auth/consumer_setup_page.dart';
import 'pages/provider/provider_job_map_page.dart';
import 'pages/bookings/forum_posts_page.dart';
import 'pages/bookings/negotiation_page.dart';

class Routes {
  static const splash = '/';
  static const roleSelect = '/role';
  static const login = '/login';
  static const signup = '/signup';
  static const home = '/home';
  static const map = '/map';
  static const consumerDashboard = '/consumer_dashboard';
  static const providerDashboard = '/provider_dashboard';
  static const bookingStatus = '/booking_status';
  static const profile = '/profile';
  static const consumerProfile = '/consumer_profile';
  static const providerProfile = '/provider_profile';
  static const consumerProfileSetup = '/consumer_profile_setup';
  static const providerProfileSetup = '/provider_profile_setup';
  static const providerJobMap = '/provider_job_map';
  static const forumPosts = '/forum_posts';
  static const negotiation = '/negotiation';

  static Map<String, WidgetBuilder> getRoutes() {
    return {
      splash: (_) => SplashPage(),
      roleSelect: (_) => const RoleSelectorPage(),
      login: (ctx) {
        final args = ModalRoute.of(ctx)?.settings.arguments;
        final role = args is String ? args : null;
        return LoginPage(roleHint: role);
      },
      signup: (ctx) {
        final args = ModalRoute.of(ctx)?.settings.arguments;
        final role = args is String ? args : null;
        return SignupPage(roleHint: role);
      },
      home: (_) => HomePage(),
      map: (_) => const MapViewPage(),
      consumerDashboard: (_) => const ConsumerDashboard(),
      providerDashboard: (_) => const ProviderDashboard(),
      bookingStatus: (ctx) {
        final id = ModalRoute.of(ctx)?.settings.arguments as int;
        return BookingStatusPage(bookingId: id);
      },
      profile: (_) => const UserProfilePage(),
      consumerProfile: (_) => const ConsumerProfilePage(),
      providerProfile: (_) => const ProviderProfilePage(),
      consumerProfileSetup: (_) => const ConsumerSetupPage(),
      providerProfileSetup: (_) => const ProviderProfilePage(setupMode: true),
      providerJobMap: (_) => const ProviderJobMapPage(),
      forumPosts: (_) => const ForumPostsPage(),
      negotiation: (ctx) {
        final args = ModalRoute.of(ctx)?.settings.arguments as Map<String, dynamic>?;
        return NegotiationPage(
          productId: args?['productId'] ?? 1,
          productName: args?['productName'] ?? 'Service',
          listPrice: (args?['listPrice'] as num?)?.toDouble() ?? 1000,
          minPrice: (args?['minPrice'] as num?)?.toDouble() ?? 700,
          intelligent: args?['intelligent'] ?? true,
          providerId: (args?['providerId'] as num?)?.toInt(),
          serviceCategory: args?['serviceCategory'] as String?,
        );
      },
    };
  }
}
