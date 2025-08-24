import 'package:flutter/material.dart';

class IssueDetailPage extends StatelessWidget {
  final String title;
  final String description;
  final String status;
  final String? imageUrl;
  final double lat;
  final double lng;

  const IssueDetailPage({
    super.key,
    required this.title,
    required this.description,
    required this.status,
    this.imageUrl,
    required this.lat,
    required this.lng,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Issue Details"),
        backgroundColor: Colors.black,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (imageUrl != null && imageUrl!.isNotEmpty)
              ClipRRect(
                borderRadius: BorderRadius.circular(12),
                child: Image.network(
                  imageUrl!,
                  width: double.infinity,
                  height: 200,
                  fit: BoxFit.cover,
                ),
              ),
            const SizedBox(height: 16),
            Text(
              title,
              style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Colors.pinkAccent,
                  ),
            ),
            const SizedBox(height: 8),
            Chip(
              label: Text(
                status.toUpperCase(),
                style: const TextStyle(color: Colors.white),
              ),
              backgroundColor: status == "open" ? Colors.orange : Colors.green,
            ),
            const SizedBox(height: 16),
            Text(
              description,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.5,
                    color: Colors.grey[200],
                  ),
            ),
            const SizedBox(height: 20),
            const Divider(),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.location_on, color: Colors.pinkAccent),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    "Lat: $lat, Lng: $lng",
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: Colors.grey[400],
                        ),
                  ),
                ),
                IconButton(
                  onPressed: () {
                    // TODO: Open map view
                  },
                  icon: const Icon(Icons.map, color: Colors.pinkAccent),
                ),
              ],
            ),
            const SizedBox(height: 30),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () {
                  // TODO: Mark issue as resolved
                },
                icon: const Icon(Icons.check_circle, color: Colors.white),
                label: const Text(
                  "Mark as Resolved",
                  style: TextStyle(color: Colors.white),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.pinkAccent,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
          ],
        ),
      ),
      backgroundColor: Colors.black,
    );
  }
}
