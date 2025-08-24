import 'package:flutter/material.dart';
import '../models/ai_result.dart';

class AIResultCard extends StatelessWidget {
  final AIResult result;

  const AIResultCard({Key? key, required this.result}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 4,
      margin: const EdgeInsets.symmetric(vertical: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text("Category: ${result.category}",
              style: Theme.of(context).textTheme.titleMedium),
          Text("Severity: ${result.severity}",
              style: Theme.of(context).textTheme.bodyMedium),
          Wrap(
            spacing: 8,
            children: result.tags.map((t) => Chip(label: Text(t))).toList(),
          ),
          const SizedBox(height: 8),
          ...result.reasons.map(
            (r) => Text("- $r", style: Theme.of(context).textTheme.bodySmall),
          ),
        ]),
      ),
    );
  }
}
