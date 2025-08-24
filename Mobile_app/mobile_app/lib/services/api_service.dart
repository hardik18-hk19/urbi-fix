import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

class ApiService {
  final AuthService _authService = AuthService();

  Future<dynamic> get(String endpoint, {bool requireAuth = true}) async {
    try {
      final headers = requireAuth 
          ? await _authService.getAuthHeaders()
          : {'Content-Type': 'application/json'};

      final res = await http.get(
        Uri.parse("${ApiConfig.baseUrl}$endpoint"),
        headers: headers,
      );

      final responseData = jsonDecode(res.body);

      if (res.statusCode == 200) {
        return responseData;
      } else if (res.statusCode == 401) {
        throw Exception(responseData['message'] ?? "Unauthorized access");
      } else if (res.statusCode == 403) {
        throw Exception(responseData['message'] ?? "Access forbidden");
      } else if (res.statusCode == 404) {
        throw Exception(responseData['message'] ?? "Resource not found");
      } else if (res.statusCode >= 500) {
        throw Exception("Server error. Please try again later.");
      } else {
        throw Exception(responseData['message'] ?? "GET request failed: $endpoint");
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Network error. Please check your connection.");
    }
  }

  Future<dynamic> post(String endpoint, Map<String, dynamic> body, {bool requireAuth = true}) async {
    try {
      final headers = requireAuth 
          ? await _authService.getAuthHeaders()
          : {'Content-Type': 'application/json'};

      final res = await http.post(
        Uri.parse("${ApiConfig.baseUrl}$endpoint"),
        headers: headers,
        body: jsonEncode(body),
      );

      final responseData = jsonDecode(res.body);

      if (res.statusCode == 200 || res.statusCode == 201) {
        return responseData;
      } else if (res.statusCode == 401) {
        throw Exception(responseData['message'] ?? "Unauthorized access");
      } else if (res.statusCode == 403) {
        throw Exception(responseData['message'] ?? "Access forbidden");
      } else if (res.statusCode == 422) {
        throw Exception(responseData['message'] ?? "Invalid input data");
      } else if (res.statusCode >= 500) {
        throw Exception("Server error. Please try again later.");
      } else {
        throw Exception(responseData['message'] ?? "POST request failed: $endpoint");
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Network error. Please check your connection.");
    }
  }

  Future<dynamic> put(String endpoint, Map<String, dynamic> body, {bool requireAuth = true}) async {
    try {
      final headers = requireAuth 
          ? await _authService.getAuthHeaders()
          : {'Content-Type': 'application/json'};

      final res = await http.put(
        Uri.parse("${ApiConfig.baseUrl}$endpoint"),
        headers: headers,
        body: jsonEncode(body),
      );

      final responseData = jsonDecode(res.body);

      if (res.statusCode == 200) {
        return responseData;
      } else if (res.statusCode == 401) {
        throw Exception(responseData['message'] ?? "Unauthorized access");
      } else if (res.statusCode == 403) {
        throw Exception(responseData['message'] ?? "Access forbidden");
      } else if (res.statusCode == 404) {
        throw Exception(responseData['message'] ?? "Resource not found");
      } else if (res.statusCode >= 500) {
        throw Exception("Server error. Please try again later.");
      } else {
        throw Exception(responseData['message'] ?? "PUT request failed: $endpoint");
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Network error. Please check your connection.");
    }
  }

  Future<dynamic> delete(String endpoint, {bool requireAuth = true}) async {
    try {
      final headers = requireAuth 
          ? await _authService.getAuthHeaders()
          : {'Content-Type': 'application/json'};

      final res = await http.delete(
        Uri.parse("${ApiConfig.baseUrl}$endpoint"),
        headers: headers,
      );

      if (res.statusCode == 200 || res.statusCode == 204) {
        return res.body.isNotEmpty ? jsonDecode(res.body) : null;
      } else {
        final responseData = jsonDecode(res.body);
        if (res.statusCode == 401) {
          throw Exception(responseData['message'] ?? "Unauthorized access");
        } else if (res.statusCode == 403) {
          throw Exception(responseData['message'] ?? "Access forbidden");
        } else if (res.statusCode == 404) {
          throw Exception(responseData['message'] ?? "Resource not found");
        } else if (res.statusCode >= 500) {
          throw Exception("Server error. Please try again later.");
        } else {
          throw Exception(responseData['message'] ?? "DELETE request failed: $endpoint");
        }
      }
    } catch (e) {
      if (e is Exception) rethrow;
      throw Exception("Network error. Please check your connection.");
    }
  }
}
