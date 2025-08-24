import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';
import 'auth_service.dart';

class NegotiationService {
  final AuthService _auth = AuthService();

  Future<Map<String, dynamic>> startSession({
    required String sessionId,
    required int productId,
    required String productName,
    required double listPrice,
    required double minPrice,
    String currency = 'INR',
    bool intelligent = false,
  }) async {
    final headers = await _auth.getAuthHeaders();
    final endpoint = intelligent
        ? ApiConfig.aiNegotiationStart
        : ApiConfig.negotiationStart;

    final res = await http.post(
      Uri.parse(endpoint),
      headers: headers,
      body: jsonEncode({
        'session_id': sessionId,
        'product_id': productId,
        'product_name': productName,
        'list_price': listPrice,
        'min_price': minPrice,
        'currency': currency,
      }),
    );

    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to start negotiation: ${res.body}');
  }

  Future<Map<String, dynamic>> chat({
    required String sessionId,
    required String userMessage,
    double? buyerBudget,
    bool intelligent = false,
  }) async {
    final headers = await _auth.getAuthHeaders();
    final endpoint = intelligent
        ? ApiConfig.aiNegotiationChat
        : ApiConfig.negotiationChat;

    final res = await http.post(
      Uri.parse(endpoint),
      headers: headers,
      body: jsonEncode({
        'session_id': sessionId,
        'user_message': userMessage,
        if (buyerBudget != null) 'buyer_budget': buyerBudget,
      }),
    );

    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Chat failed: ${res.body}');
  }

  Future<Map<String, dynamic>> getState({
    required String sessionId,
    bool intelligent = false,
  }) async {
    final headers = await _auth.getAuthHeaders();
    final base = intelligent
        ? ApiConfig.aiNegotiationState
        : ApiConfig.negotiationState;

    final res = await http.get(
      Uri.parse('$base/$sessionId'),
      headers: headers,
    );

    if (res.statusCode == 200) {
      return jsonDecode(res.body) as Map<String, dynamic>;
    }
    throw Exception('Failed to fetch session state: ${res.body}');
  }
}