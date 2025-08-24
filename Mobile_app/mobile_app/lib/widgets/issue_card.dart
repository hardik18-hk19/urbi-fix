import 'package:flutter/material.dart';
import '../models/issue.dart';
import '../config/theme.dart';

class IssueCard extends StatelessWidget {
  final Issue issue;
  final VoidCallback onTap;

  const IssueCard({Key? key, required this.issue, required this.onTap})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      child: ListTile(
        onTap: onTap,
        title: Text(issue.title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(
          issue.description,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Chip(
          label: Text(issue.status),
          backgroundColor: AppColors.lightPink.withOpacity(0.25),
          labelStyle: const TextStyle(color: AppColors.lightPink),
        ),
      ),
    );
  }
}