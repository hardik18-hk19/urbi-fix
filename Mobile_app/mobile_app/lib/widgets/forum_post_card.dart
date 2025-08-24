import 'package:flutter/material.dart';
import '../config/theme.dart';

class ForumPostCard extends StatelessWidget {
  final String author;
  final String content;
  final String date;
  final VoidCallback onTap;

  const ForumPostCard({
    Key? key,
    required this.author,
    required this.content,
    required this.date,
    required this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      child: ListTile(
        onTap: onTap,
        title: Text(author, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(content, maxLines: 2, overflow: TextOverflow.ellipsis),
        trailing: Text(date, style: Theme.of(context).textTheme.bodySmall),
        iconColor: AppColors.yellow,
      ),
    );
  }
}