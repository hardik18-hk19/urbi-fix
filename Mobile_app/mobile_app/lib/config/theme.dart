import 'package:flutter/material.dart';

// App color palette (Yellow - Pink - Black)
class AppColors {
  static const Color black = Color(0xFF0B0B0B);
  static const Color charcoal = Color(0xFF171717);
  static const Color yellow = Color(0xFFFFD600); // primary accent
  static const Color lightPink = Color(0xFFFFC1E3); // secondary accent
  static const Color white = Colors.white;
  static const Color textPrimary = Colors.white;
  static const Color textSecondary = Colors.white70;
}

final ThemeData appTheme = ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: AppColors.black,
  primaryColor: AppColors.yellow,
  colorScheme: const ColorScheme.dark(
    primary: AppColors.yellow,
    secondary: AppColors.lightPink,
    surface: AppColors.charcoal,
    background: AppColors.black,
    onPrimary: Colors.black,
    onSecondary: Colors.black,
    onSurface: Colors.white,
  ),
  appBarTheme: const AppBarTheme(
    backgroundColor: AppColors.black,
    elevation: 0,
    titleTextStyle: TextStyle(
      color: AppColors.white,
      fontSize: 20,
      fontWeight: FontWeight.bold,
    ),
    iconTheme: IconThemeData(color: AppColors.white),
  ),
  cardTheme: CardTheme(
    color: AppColors.charcoal,
    elevation: 2,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
    margin: const EdgeInsets.symmetric(vertical: 6, horizontal: 0),
  ),
  listTileTheme: const ListTileThemeData(
    iconColor: AppColors.white,
    textColor: AppColors.white,
  ),
  textTheme: const TextTheme(
    bodyLarge: TextStyle(color: AppColors.textPrimary, fontSize: 16),
    bodyMedium: TextStyle(color: AppColors.textSecondary, fontSize: 14),
    titleLarge: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold, fontSize: 18),
    titleMedium: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.w600, fontSize: 16),
    labelLarge: TextStyle(color: AppColors.black, fontWeight: FontWeight.bold),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: AppColors.charcoal,
    border: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: BorderSide.none,
    ),
    hintStyle: const TextStyle(color: Colors.white54),
    labelStyle: const TextStyle(color: Colors.white70),
    enabledBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: Colors.white24),
    ),
    focusedBorder: OutlineInputBorder(
      borderRadius: BorderRadius.circular(12),
      borderSide: const BorderSide(color: AppColors.yellow, width: 2),
    ),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: AppColors.yellow,
      foregroundColor: Colors.black,
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      side: const BorderSide(color: AppColors.lightPink, width: 1.5),
      foregroundColor: AppColors.lightPink,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 20),
    ),
  ),
  chipTheme: const ChipThemeData(
    backgroundColor: AppColors.charcoal,
    selectedColor: AppColors.yellow,
    labelStyle: TextStyle(color: AppColors.white),
    secondaryLabelStyle: TextStyle(color: Colors.black),
    padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
    shape: StadiumBorder(),
    brightness: Brightness.dark,
  ),
  floatingActionButtonTheme: const FloatingActionButtonThemeData(
    backgroundColor: AppColors.yellow,
    foregroundColor: Colors.black,
  ),
  progressIndicatorTheme: const ProgressIndicatorThemeData(
    color: AppColors.yellow,
  ),
  snackBarTheme: const SnackBarThemeData(
    backgroundColor: AppColors.charcoal,
    contentTextStyle: TextStyle(color: AppColors.white),
    actionTextColor: AppColors.yellow,
    behavior: SnackBarBehavior.floating,
  ),
  dividerTheme: const DividerThemeData(color: Colors.white12, thickness: 1),
  bottomNavigationBarTheme: const BottomNavigationBarThemeData(
    backgroundColor: AppColors.black,
    selectedItemColor: AppColors.yellow,
    unselectedItemColor: Colors.white60,
    showUnselectedLabels: true,
  ),
  tabBarTheme: const TabBarTheme(
    labelColor: AppColors.yellow,
    unselectedLabelColor: Colors.white60,
    indicatorColor: AppColors.yellow,
  ),
);