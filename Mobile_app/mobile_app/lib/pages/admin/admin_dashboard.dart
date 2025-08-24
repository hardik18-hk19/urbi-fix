import 'package:flutter/material.dart';

class AdminDashboard extends StatelessWidget {
  const AdminDashboard({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Admin Dashboard")),
      body: GridView.count(
        padding: const EdgeInsets.all(16),
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        children: [
          _buildCard(context, "View Issues", Icons.report, "/admin/issues"),
          _buildCard(context, "Manage Helpers", Icons.people, "/provider/list"),
          _buildCard(context, "Bookings", Icons.book_online, "/bookings"),
          _buildCard(context, "Forum Posts", Icons.forum, "/forum"),
        ],
      ),
    );
  }

  Widget _buildCard(BuildContext ctx, String title, IconData icon, String route) {
    return InkWell(
      onTap: () => Navigator.pushNamed(ctx, route),
      child: Card(
        color: Colors.pinkAccent.withOpacity(0.1),
        child: Center(
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Icon(icon, size: 40, color: Colors.pinkAccent),
            const SizedBox(height: 10),
            Text(title, style: Theme.of(ctx).textTheme.bodyLarge),
          ]),
        ),
      ),
    );
  }
}
