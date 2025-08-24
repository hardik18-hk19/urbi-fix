import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

class ConsumerService {
  final AuthService _auth = AuthService();

  Future<Map<String, dynamic>> getMyConsumer() async {
    final headers = await _auth.getAuthHeaders();
    final res = await http.get(Uri.parse("${ApiConfig.baseUrl}/api/consumers/me"), headers: headers);
    final data = jsonDecode(res.body);
    if (res.statusCode == 200) return data;
    throw Exception(data['detail'] ?? 'Failed to fetch consumer profile');
  }

  Future<Map<String, dynamic>> saveConsumer(Map<String, dynamic> payload) async {
    final headers = await _auth.getAuthHeaders();
    final res = await http.post(
      Uri.parse("${ApiConfig.baseUrl}/api/consumers"),
      headers: headers,
      body: jsonEncode(payload),
    );
    final data = jsonDecode(res.body);
    if (res.statusCode == 200 || res.statusCode == 201) return data;
    throw Exception(data['detail'] ?? 'Failed to save consumer profile');
  }
}