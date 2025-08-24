import 'dart:convert';
import 'dart:typed_data';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import '../models/issue.dart';
import 'auth_service.dart';

class IssueService {
  final AuthService _authService = AuthService();

  Future<Issue?> createIssue({
    required String title,
    required String description,
    required double lat,
    required double lng,
    Uint8List? imageBytes,
    bool analyze = true,
  }) async {
    final token = await _authService.getToken();
    
    if (imageBytes != null) {
      // Use multipart for image upload
      var request = http.MultipartRequest(
        'POST',
        Uri.parse("${ApiConfig.issues}/with-image"),
      );
      
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }
      
      request.fields['title'] = title;
      request.fields['description'] = description;
      request.fields['lat'] = lat.toString();
      request.fields['lng'] = lng.toString();
      request.fields['analyze'] = analyze.toString();
      request.files.add(http.MultipartFile.fromBytes('file', imageBytes, filename: 'photo.jpg'));

      var streamed = await request.send();
      var res = await http.Response.fromStream(streamed);
      
      if (res.statusCode == 200 || res.statusCode == 201) {
        return Issue.fromJson(jsonDecode(res.body));
      } else {
        final responseData = jsonDecode(res.body);
        throw Exception(responseData['detail'] ?? "Failed to create issue");
      }
    } else {
      // Use JSON for text-only
      final headers = await _authService.getAuthHeaders();
      
      final res = await http.post(
        Uri.parse(ApiConfig.issues),
        headers: headers,
        body: jsonEncode({
          'title': title,
          'description': description,
          'lat': lat,
          'lng': lng,
          'analyze': analyze,
        }),
      );

      if (res.statusCode == 200 || res.statusCode == 201) {
        return Issue.fromJson(jsonDecode(res.body));
      } else {
        final responseData = jsonDecode(res.body);
        throw Exception(responseData['detail'] ?? "Failed to create issue");
      }
    }
  }

  Future<List<Issue>> getIssues() async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.get(
      Uri.parse(ApiConfig.issues),
      headers: headers,
    );
    
    if (res.statusCode == 200) {
      List data = jsonDecode(res.body);
      return data.map((j) => Issue.fromJson(j)).toList();
    } else if (res.statusCode == 401) {
      throw Exception("Unauthorized access");
    } else {
      final responseData = jsonDecode(res.body);
      throw Exception(responseData['detail'] ?? "Failed to fetch issues");
    }
  }
}
