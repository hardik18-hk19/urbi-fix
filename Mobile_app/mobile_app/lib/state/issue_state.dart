import 'package:flutter/material.dart';
import '../models/issue.dart';
import '../services/issue_service.dart';

class IssueState extends ChangeNotifier {
  final IssueService _issueService = IssueService();
  List<Issue> _issues = [];
  bool _loading = false;

  List<Issue> get issues => _issues;
  bool get isLoading => _loading;

  Future<void> fetchIssues() async {
    _loading = true;
    notifyListeners();

    _issues = await _issueService.getIssues();

    _loading = false;
    notifyListeners();
  }

  Future<void> createIssue(Issue issue) async {
    _issues.insert(0, issue);
    notifyListeners();
  }
}
