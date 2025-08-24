import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

class BookingService {
  final AuthService _authService = AuthService();

  Future<List<dynamic>> getBookings() async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.get(
      Uri.parse(ApiConfig.bookings),
      headers: headers,
    );
    
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 401) {
      throw Exception("Unauthorized access");
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Failed to fetch bookings");
    }
  }

  Future<Map<String, dynamic>> getBookingById(int bookingId) async {
    final headers = await _authService.getAuthHeaders();
    final res = await http.get(
      Uri.parse("${ApiConfig.bookings}/$bookingId"),
      headers: headers,
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 404) {
      throw Exception("Booking not found");
    } else if (res.statusCode == 401) {
      throw Exception("Unauthorized access");
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Failed to fetch booking");
    }
  }

  Future<Map<String, dynamic>> createBooking(Map<String, dynamic> bookingData) async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.post(
      Uri.parse(ApiConfig.bookings),
      headers: headers,
      body: jsonEncode(bookingData),
    );
    
    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 404) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Provider not found");
    } else if (res.statusCode == 401) {
      throw Exception("Unauthorized access");
    } else if (res.statusCode == 422) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Invalid input data");
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Booking creation failed");
    }
  }

  // Auto-assign to nearest available provider matching the category within radius
  Future<Map<String, dynamic>> createAutoBooking({
    required double consumerLat,
    required double consumerLng,
    String? serviceCategory,
    String? notes,
    double withinKm = 5.0,
  }) async {
    final headers = await _authService.getAuthHeaders();
    final res = await http.post(
      Uri.parse("${ApiConfig.bookings}/auto"),
      headers: headers,
      body: jsonEncode({
        'service_category': serviceCategory,
        'notes': notes ?? '',
        'consumer_lat': consumerLat,
        'consumer_lng': consumerLng,
        'within_km': withinKm,
      }),
    );

    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 404) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "No providers available nearby");
    } else if (res.statusCode == 401) {
      throw Exception("Unauthorized access");
    } else if (res.statusCode == 422) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Invalid input data");
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Auto booking creation failed");
    }
  }

  Future<Map<String, dynamic>> updateBookingStatus(int bookingId, Map<String, dynamic> updateData) async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.patch(
      Uri.parse("${ApiConfig.bookings}/$bookingId"),
      headers: headers,
      body: jsonEncode(updateData),
    );
    
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 404) {
      throw Exception("Booking not found");
    } else if (res.statusCode == 403) {
      throw Exception("Not allowed to update this booking");
    } else if (res.statusCode == 401) {
      throw Exception("Unauthorized access");
    } else if (res.statusCode == 422) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Invalid input data");
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Failed to update booking");
    }
  }
  
  Future<Map<String, dynamic>> rateBooking(int bookingId, {required int stars, String? comment}) async {
    final headers = await _authService.getAuthHeaders();
    final res = await http.post(
      Uri.parse("${ApiConfig.bookings}/$bookingId/rating"),
      headers: headers,
      body: jsonEncode({
        'stars': stars,
        'comment': comment ?? '',
      }),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Failed to submit rating");
    }
  }
  
  Future<Map<String, dynamic>> updateProviderLocation(int bookingId, {required double lat, required double lng}) async {
    final headers = await _authService.getAuthHeaders();
    final res = await http.post(
      Uri.parse("${ApiConfig.bookings}/$bookingId/location"),
      headers: headers,
      body: jsonEncode({
        'lat': lat,
        'lng': lng,
      }),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Failed to update location");
    }
  }
}