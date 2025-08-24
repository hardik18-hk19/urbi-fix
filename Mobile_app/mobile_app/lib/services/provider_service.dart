import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

class ProviderService {
  final AuthService _authService = AuthService();

  Future<List<dynamic>> getNearbyProviders(
    double lat,
    double lng, {
    double withinKm = 5.0,
    String? skill,
    String? queryText,
  }) async {
    final headers = await _authService.getAuthHeaders();

    final query = StringBuffer("${ApiConfig.providers}/nearby?lat=$lat&lng=$lng&within_km=$withinKm");
    if (skill != null && skill.isNotEmpty) {
      query.write("&skill=${Uri.encodeQueryComponent(skill)}");
    }
    if (queryText != null && queryText.isNotEmpty) {
      query.write("&query=${Uri.encodeQueryComponent(queryText)}");
    }

    final res = await http.get(
      Uri.parse(query.toString()),
      headers: headers,
    );

    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 401) {
      throw Exception("Unauthorized access");
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Failed to fetch providers");
    }
  }

  Future<Map<String, dynamic>> getMyProvider() async {
    final headers = await _authService.getAuthHeaders();
    final res = await http.get(Uri.parse("${ApiConfig.providers}/me"), headers: headers);
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 404) {
      throw Exception("Provider profile not found");
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Failed to fetch provider profile");
    }
  }

  Future<Map<String, dynamic>> createProviderProfile(Map<String, dynamic> providerData) async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.post(
      Uri.parse(ApiConfig.providers),
      headers: headers,
      body: jsonEncode(providerData),
    );
    
    if (res.statusCode == 200 || res.statusCode == 201) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 400) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Provider profile already exists");
    } else if (res.statusCode == 401) {
      throw Exception("Unauthorized access");
    } else if (res.statusCode == 422) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Invalid input data");
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Failed to create provider profile");
    }
  }

  Future<Map<String, dynamic>> updateProviderProfile(int providerId, Map<String, dynamic> providerData) async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.patch(
      Uri.parse("${ApiConfig.providers}/$providerId"),
      headers: headers,
      body: jsonEncode(providerData),
    );
    
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 404) {
      throw Exception("Provider not found");
    } else if (res.statusCode == 401) {
      throw Exception("Unauthorized access");
    } else if (res.statusCode == 422) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Invalid input data");
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Failed to update provider profile");
    }
  }
}
