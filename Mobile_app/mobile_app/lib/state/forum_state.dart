import 'package:flutter/material.dart';
import '../services/forum_service.dart';

class ForumState extends ChangeNotifier {
  final ForumService _forumService = ForumService();
  List<dynamic> _posts = [];
  bool _loading = false;

  List<dynamic> get posts => _posts;
  bool get isLoading => _loading;

  Future<void> fetchPosts() async {
    _loading = true;
    notifyListeners();

    _posts = await _forumService.getIssues();

    _loading = false;
    notifyListeners();
  }

  Future<void> createPost(Map<String, dynamic> postData) async {
    _loading = true;
    notifyListeners();

    await _forumService.createIssue(postData);
    await fetchPosts();

    _loading = false;
    notifyListeners();
  }
}
