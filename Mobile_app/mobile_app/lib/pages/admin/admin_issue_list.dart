import 'package:flutter/material.dart';

class AdminIssueList extends StatelessWidget {
  const AdminIssueList({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO: Replace with API fetched issues
    return Scaffold(
      appBar: AppBar(title: const Text("All Reported Issues")),
      body: ListView.builder(
        itemCount: 8,
        itemBuilder: (_, i) {
          return ListTile(
            leading: const Icon(Icons.report, color: Colors.pinkAccent),
            title: Text("Issue #${i + 1}"),
            subtitle: const Text("Pending"),
            trailing: IconButton(
              icon: const Icon(Icons.check_circle, color: Colors.green),
              onPressed: () {},
            ),
          );
        },
      ),
    );
  }
}
