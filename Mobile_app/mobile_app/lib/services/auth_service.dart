import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../config/api_config.dart';

class AuthService {
  static const String _tokenKey = 'auth_token';

  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final uri = Uri.parse(ApiConfig.login);

      final res = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'password': password}),
          )
          .timeout(const Duration(seconds: 12));

      final Map<String, dynamic> data = _safeJson(res.body);

      if (res.statusCode == 200) {
        if (data['token'] != null) {
          await _storeToken(data['token'] as String);
        }
        return data;
      }

      // error mapping
      throw Exception(_extractErrorMessage(res.statusCode, data));
    } on SocketException {
      throw Exception('Network error. Check Wi-Fi/Hotspot and IP.');
    } on HttpException {
      throw Exception('HTTP error communicating with server.');
    } on FormatException {
      throw Exception('Invalid server response.');
    }
  }

  Future<Map<String, dynamic>> signup(Map<String, dynamic> userData) async {
    try {
      // Ensure role is something backend accepts ("user" is OK and mapped server-side)
      final payload = Map<String, dynamic>.from(userData);
      payload['role'] = (payload['role'] ?? 'user').toString().toLowerCase();

      final uri = Uri.parse(ApiConfig.signup);

      final res = await http
          .post(
            uri,
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 12));

      final Map<String, dynamic> data = _safeJson(res.body);

      if (res.statusCode == 200 || res.statusCode == 201) {
        if (data['token'] != null) {
          await _storeToken(data['token'] as String);
        }
        return data;
      }

      // error mapping
      throw Exception(_extractErrorMessage(res.statusCode, data));
    } on SocketException {
      throw Exception('Network error. Check Wi-Fi/Hotspot and IP.');
    } on HttpException {
      throw Exception('HTTP error communicating with server.');
    } on FormatException {
      throw Exception('Invalid server response.');
    }
  }

  Future<void> logout() async {
    await _removeToken();
  }

  Future<String?> getToken() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString(_tokenKey);
  }

  Future<bool> isLoggedIn() async {
    final token = await getToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> _storeToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
  }

  Future<void> _removeToken() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }

  Future<Map<String, String>> getAuthHeaders() async {
    final token = await getToken();
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  // ---------- user profile ----------

  Future<Map<String, dynamic>> getMe() async {
    final headers = await getAuthHeaders();
    final res = await http.get(Uri.parse(ApiConfig.me), headers: headers);
    final data = _safeJson(res.body);
    if (res.statusCode == 200) return data;
    throw Exception(_extractErrorMessage(res.statusCode, data));
  }

  Future<Map<String, dynamic>> updateMe(Map<String, dynamic> patch) async {
    final headers = await getAuthHeaders();
    final res = await http.patch(
      Uri.parse(ApiConfig.me),
      headers: headers,
      body: jsonEncode(patch),
    );
    final data = _safeJson(res.body);
    if (res.statusCode == 200) return data;
    throw Exception(_extractErrorMessage(res.statusCode, data));
  }

  Future<Map<String, dynamic>> uploadAvatar(File file) async {
    final token = await getToken();
    final request = http.MultipartRequest('POST', Uri.parse(ApiConfig.meAvatar));
    if (token != null) request.headers['Authorization'] = 'Bearer $token';
    final mime = 'image/${file.path.split('.').last}';
    request.files.add(await http.MultipartFile.fromPath('file', file.path, contentType: MediaType.parse(mime)));
    final streamed = await request.send();
    final res = await http.Response.fromStream(streamed);
    final data = _safeJson(res.body);
    if (res.statusCode == 200) return data;
    throw Exception(_extractErrorMessage(res.statusCode, data));
  }

  // ---------- helpers ----------

  Map<String, dynamic> _safeJson(String body) {
    try {
      final decoded = jsonDecode(body);
      if (decoded is Map<String, dynamic>) return decoded;
      return {'message': 'Unexpected response'};
    } catch (_) {
      return {'message': body.isEmpty ? 'Empty response' : body};
    }
  }

  String _extractErrorMessage(int status, Map<String, dynamic> data) {
    final detail = (data['detail'] ?? data['message'] ?? data['error'] ?? '').toString();

    switch (status) {
      case 400:
        return detail.isNotEmpty ? detail : 'Bad request';
      case 401:
        return detail.isNotEmpty ? detail : 'Invalid credentials';
      case 409:
        return detail.isNotEmpty ? detail : 'User already exists';
      case 422:
        return detail.isNotEmpty ? detail : 'Invalid input data';
      default:
        if (status >= 500) return 'Server error. Please try again later.';
        return detail.isNotEmpty ? detail : 'Request failed ($status)';
    }
  }
}
