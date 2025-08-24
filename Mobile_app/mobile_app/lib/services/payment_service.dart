import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class PaymentService {
  Future<Map<String, dynamic>> createPaymentIntent(double amount) async {
    final res = await http.post(
      Uri.parse("${ApiConfig.baseUrl}/payments/create-intent"),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'amount': amount}),
    );
    if (res.statusCode == 200) return jsonDecode(res.body);
    throw Exception("Payment initiation failed");
  }
}
