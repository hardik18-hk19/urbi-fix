import 'dart:typed_data';
import 'package:flutter/material.dart';
import '../services/ai_service.dart';
import '../models/ai_result.dart';

class AIState extends ChangeNotifier {
  final AIService _aiService = AIService();
  AIResult? _result;
  bool _loading = false;

  AIResult? get result => _result;
  bool get isLoading => _loading;

  Future<void> analyzeText(String text) async {
    _loading = true;
    notifyListeners();

    final res = await _aiService.autoTagText(text);
    _result = AIResult.fromJson(res);

    _loading = false;
    notifyListeners();
  }

  Future<void> analyzeImage(String text, Uint8List image, String fileName) async {
    _loading = true;
    notifyListeners();

    final res = await _aiService.autoTagWithImage(text, image, fileName);
    _result = AIResult.fromJson(res);

    _loading = false;
    notifyListeners();
  }
}
