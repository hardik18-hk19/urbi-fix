import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

class ForumService {
  final AuthService _authService = AuthService();

  Future<Map<String, dynamic>> createIssue(Map<String, dynamic> data) async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.post(
      Uri.parse(ApiConfig.issues),
      headers: headers,
      body: jsonEncode(data),
    );
    
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 401) {
      throw Exception('Unauthorized');
    } else {
      throw Exception('Failed to create issue: ${res.body}');
    }
  }

  Future<List<dynamic>> getIssues({String? sort}) async {
    final headers = await _authService.getAuthHeaders();
    
    final query = sort != null ? "?sort=$sort" : "";
    final res = await http.get(
      Uri.parse("${ApiConfig.issues}$query"),
      headers: headers,
    );
    
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 401) {
      throw Exception('Unauthorized');
    } else {
      throw Exception('Failed to fetch issues');
    }
  }

  Future<void> deleteIssue(int issueId) async {
    final headers = await _authService.getAuthHeaders();
    final res = await http.delete(
      Uri.parse("${ApiConfig.issues}/$issueId"),
      headers: headers,
    );
    if (res.statusCode != 200) {
      throw Exception('Failed to delete issue: ${res.body}');
    }
  }

  Future<Map<String, dynamic>> startFundraiserForIssue(int issueId, {double targetAmount = 1000, String currency = 'INR'}) async {
    final headers = await _authService.getAuthHeaders();
    final res = await http.post(
      Uri.parse("${ApiConfig.baseUrl}/api/fundraisers"),
      headers: headers,
      body: jsonEncode({
        'issue_id': issueId,
        'target_amount': targetAmount,
        'currency': currency,
      }),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else {
      throw Exception('Failed to start fundraiser: ${res.body}');
    }
  }

  Future<void> voteIssue(int issueId, int value) async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.post(
      Uri.parse("${ApiConfig.baseUrl}/api/votes/$issueId"),
      headers: headers,
      body: jsonEncode({'value': value}),
    );
    
    if (res.statusCode != 200) {
      throw Exception('Failed to vote');
    }
  }

  Future<Map<String, dynamic>> escalateIssue(int issueId, {String? draft}) async {
    final headers = await _authService.getAuthHeaders();
    final res = await http.post(
      Uri.parse("${ApiConfig.issues}/$issueId/escalate"),
      headers: headers,
      body: jsonEncode({'draft': draft}),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else {
      throw Exception('Failed to escalate: ${res.body}');
    }
  }

  // Forum posts (new)
  Future<List<dynamic>> getForumPosts() async {
    final headers = await _authService.getAuthHeaders();
    final res = await http.get(
      Uri.parse("${ApiConfig.forumPosts}/posts"),
      headers: headers,
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 401) {
      throw Exception('Unauthorized');
    } else {
      throw Exception('Failed to fetch forum posts');
    }
  }

  Future<Map<String, dynamic>> createForumPost({
    required String title,
    required String content,
    String category = 'general',
    int? issueId,
    int? fundraiserId,
  }) async {
    final headers = await _authService.getAuthHeaders();
    final body = {
      'title': title,
      'content': content,
      'category': category,
      if (issueId != null) 'issue_id': issueId,
      if (fundraiserId != null) 'fundraiser_id': fundraiserId,
    };

    final res = await http.post(
      Uri.parse("${ApiConfig.forumPosts}/posts"),
      headers: headers,
      body: jsonEncode(body),
    );
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 401) {
      throw Exception('Unauthorized');
    } else {
      throw Exception('Failed to create forum post: ${res.body}');
    }
  }

  Future<Map<String, dynamic>> contributeToIssue(int issueId, double amount) async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.post(
      Uri.parse("${ApiConfig.issues}/$issueId/contribute"),
      headers: headers,
      body: jsonEncode({'amount': amount}),
    );
    
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 401) {
      throw Exception('Unauthorized');
    } else {
      throw Exception('Failed to contribute: ${res.body}');
    }
  }

  Future<Map<String, dynamic>> getIssueById(int issueId) async {
    final headers = await _authService.getAuthHeaders();
    
    final res = await http.get(
      Uri.parse("${ApiConfig.issues}/$issueId"),
      headers: headers,
    );
    
    if (res.statusCode == 200) {
      return jsonDecode(res.body);
    } else if (res.statusCode == 401) {
      throw Exception('Unauthorized');
    } else {
      throw Exception('Failed to fetch issue: ${res.body}');
    }
  }
}