import 'package:flutter/material.dart';
import '../config/theme.dart';

class ProviderCard extends StatelessWidget {
  final String name;
  final String service;
  final double rating;
  final VoidCallback onTap;

  const ProviderCard({
    Key? key,
    required this.name,
    required this.service,
    required this.rating,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: ListTile(
        onTap: onTap,
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(service),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.star, color: AppColors.yellow, size: 18),
            const SizedBox(width: 4),
            Text(rating.toStringAsFixed(1)),
          ],
        ),
      ),
    );
  }
}