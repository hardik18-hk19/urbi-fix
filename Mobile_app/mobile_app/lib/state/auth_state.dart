import 'package:flutter/material.dart';
import '../services/auth_service.dart';
import '../models/user.dart';

class AuthState extends ChangeNotifier {
  final AuthService _authService = AuthService();
  User? _user;
  bool _loading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _loading;
  bool get isLoggedIn => _user != null;
  String? get error => _error;

  Future<bool> login(String email, String password) async {
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _authService.login(email, password);
      _user = User.fromJson(res['user']);
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      _error = e.toString().replaceFirst('Exception: ', '');
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<bool> signup(Map<String, dynamic> userData) async {
    print('🔄 AuthState: Starting signup process');
    _loading = true;
    _error = null;
    notifyListeners();

    try {
      final res = await _authService.signup(userData);
      print('✅ AuthState: Signup successful, creating user from: ${res['user']}');
      _user = User.fromJson(res['user']);
      _loading = false;
      notifyListeners();
      return true;
    } catch (e) {
      print('❌ AuthState: Signup failed with error: $e');
      _error = e.toString().replaceFirst('Exception: ', '');
      _loading = false;
      notifyListeners();
      return false;
    }
  }

  Future<void> logout() async {
    _loading = true;
    notifyListeners();

    try {
      await _authService.logout();
      _user = null;
      _error = null;
    } catch (e) {
      _error = "Logout failed";
    }

    _loading = false;
    notifyListeners();
  }

  Future<void> checkAuthStatus() async {
    _loading = true;
    notifyListeners();

    try {
      final hasToken = await _authService.isLoggedIn();
      if (hasToken) {
        // Fetch and set current user profile
        final me = await _authService.getMe();
        _user = User.fromJson(me);
        _error = null;
      } else {
        _user = null;
      }
    } catch (e) {
      // Token may be invalid/expired; clear it
      await _authService.logout();
      _user = null;
      _error = null;
    }

    _loading = false;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
