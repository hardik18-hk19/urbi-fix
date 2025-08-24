import 'package:flutter/material.dart';
import '../services/provider_service.dart';

class ProviderState extends ChangeNotifier {
  final ProviderService _providerService = ProviderService();
  List<dynamic> _providers = [];
  bool _loading = false;

  List<dynamic> get providers => _providers;
  bool get isLoading => _loading;

  Future<void> fetchNearbyProviders(
    double lat,
    double lng, {
    String? skill,
    String? queryText,
  }) async {
    _loading = true;
    notifyListeners();

    _providers = await _providerService.getNearbyProviders(
      lat,
      lng,
      skill: skill,
      queryText: queryText,
    );

    _loading = false;
    notifyListeners();
  }
}
