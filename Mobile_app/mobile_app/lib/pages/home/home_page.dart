import 'package:flutter/material.dart';
import '../provider/provider_dashboard.dart';
import '../consumer/consumer_dashboard.dart';
import '../bookings/forum_feed_page.dart';
import '../bookings/forum_posts_page.dart';
import '../../config/theme.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text("Hackademia")), // uses appTheme (yellow accents)
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.black, AppColors.charcoal],
          ),
        ),
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _buildCard(context, "Consumer Dashboard", Icons.person, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ConsumerDashboard()));
            }),
            _buildCard(context, "Provider Dashboard", Icons.handyman, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ProviderDashboard()));
            }),
            _buildCard(context, "Community Forum", Icons.people, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ForumFeedPage()));
            }),
            _buildCard(context, "Forum Posts (/api/forum)", Icons.forum, () {
              Navigator.push(context, MaterialPageRoute(builder: (_) => const ForumPostsPage()));
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildCard(BuildContext context, String title, IconData icon, VoidCallback onTap) {
    return Card(
      color: Theme.of(context).colorScheme.surface,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        leading: Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            gradient: const LinearGradient(colors: [AppColors.yellow, AppColors.lightPink]),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: Colors.black),
        ),
        title: Text(title, style: Theme.of(context).textTheme.bodyLarge),
        onTap: onTap,
      ),
    );
  }
}
