import 'package:flutter/material.dart';
import '../config/theme.dart';

class BookingCard extends StatelessWidget {
  final String title;
  final String date;
  final String status;
  final VoidCallback onTap;

  const BookingCard({
    Key? key,
    required this.title,
    required this.date,
    required this.status,
    required this.onTap,
  }) : super(key: key);

  Color _statusBg() {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'accepted':
        return AppColors.yellow.withOpacity(0.25);
      case 'requested':
        return AppColors.lightPink.withOpacity(0.25);
      default:
        return Colors.white12;
    }
  }

  Color _statusFg() {
    switch (status.toLowerCase()) {
      case 'confirmed':
      case 'accepted':
        return AppColors.yellow;
      case 'requested':
        return AppColors.lightPink;
      default:
        return Colors.white70;
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListTile(
      onTap: onTap,
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Text(date),
      trailing: Chip(
        label: Text(status, style: TextStyle(color: _statusFg())),
        backgroundColor: _statusBg(),
      ),
    );
  }
}