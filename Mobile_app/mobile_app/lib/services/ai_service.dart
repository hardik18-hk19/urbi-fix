import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

class AIService {
  final AuthService _authService = AuthService();

  Future<Map<String, dynamic>> autoTagText(String text) async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.post(
      Uri.parse(ApiConfig.aiAutoTag),
      headers: headers,
      body: jsonEncode({'text': text}),
    );

    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 503) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "AI service unavailable");
    }
    throw Exception("AI text analysis failed");
  }

  Future<Map<String, dynamic>> autoTagWithImage(
      String text, Uint8List imageBytes, String fileName) async {
    final token = await _authService.getToken();
    
    var request = http.MultipartRequest(
      'POST',
      Uri.parse(ApiConfig.aiAutoTagWithImage),
    );
    
    if (token != null) {
      request.headers['Authorization'] = 'Bearer $token';
    }
    
    request.fields['text'] = text;
    request.files.add(http.MultipartFile.fromBytes('file', imageBytes, filename: fileName));

    var streamed = await request.send();
    var res = await http.Response.fromStream(streamed);

    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 503) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "AI service unavailable");
    }
    throw Exception("AI image analysis failed");
  }

  Future<Map<String, dynamic>> generateSchedule(String description, {String? location}) async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.post(
      Uri.parse(ApiConfig.aiSchedule),
      headers: headers,
      body: jsonEncode({
        'description': description,
        'location': location,
      }),
    );

    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 503) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "AI service unavailable");
    } else if (res.statusCode == 401) {
      throw Exception("Unauthorized access");
    } else if (res.statusCode == 422) {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Invalid input data");
    }
    throw Exception("AI schedule generation failed");
  }
}
