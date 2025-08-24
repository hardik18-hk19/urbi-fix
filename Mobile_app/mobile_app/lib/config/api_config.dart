class ApiConfig {
  
  // static const String baseUrl = "http://192.168.1.222:8000";
  // static const String baseUrl = "http://192.168.1.37:8000";
  static const String baseUrl = "http://10.231.229.192:8000";
  

  // Auth
  static const String login = "$baseUrl/api/auth/login";
  static const String signup = "$baseUrl/api/auth/signup";

  // Issues
  static const String issues = "$baseUrl/api/issues";

  // Bookings
  static const String bookings = "$baseUrl/api/bookings";

  // Providers
  static const String providers = "$baseUrl/api/providers";

  // AI
  static const String aiAutoTag = "$baseUrl/api/ai/auto-tag";
  static const String aiAutoTagWithImage = "$baseUrl/api/ai/auto-tag-with-image";
  static const String aiSchedule = "$baseUrl/api/ai/schedule";

  // Forum
  static const String forumPosts = "$baseUrl/api/forum";

  // Negotiation
  static const String negotiationStart = "$baseUrl/api/negotiation/start";
  static const String negotiationChat = "$baseUrl/api/negotiation/chat";
  static const String negotiationState = "$baseUrl/api/negotiation/session";
  static const String aiNegotiationStart = "$baseUrl/api/negotiation/intelligent/start";
  static const String aiNegotiationChat = "$baseUrl/api/negotiation/intelligent/chat";
  static const String aiNegotiationState = "$baseUrl/api/negotiation/intelligent/session";

  // User
  static const String me = "$baseUrl/api/auth/me";
  static const String meAvatar = "$baseUrl/api/auth/me/avatar";
}
