class AppConstants {
  static const String appName = "Hackademia";
  static const String defaultProfileImage = "assets/images/default_user.png";

  // Booking Status
  static const List<String> bookingStatus = ["pending", "accepted", "completed", "cancelled"];

  // Issue Categories
  static const List<String> issueCategories = [
    "Water Leakage",
    "Electrical Fault",
    "Waste Management",
    "Road Repair",
    "Street Light"
  ];

  // Roles
  static const String roleUser = "user";
  static const String roleProvider = "provider";
  static const String roleAdmin = "admin";
}
