import 'package:flutter/material.dart';

class IssueDetailPage extends StatelessWidget {
  const IssueDetailPage({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO: Display single issue details
    return Scaffold(
      appBar: AppBar(title: const Text("Issue Details")),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: const Text("Issue detail content here"),
      ),
    );
  }
}
