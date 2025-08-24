import 'package:flutter/material.dart';

class ScheduleSuggestionPage extends StatelessWidget {
  const ScheduleSuggestionPage({super.key});

  @override
  Widget build(BuildContext context) {
    // TODO: AI suggests schedule for booking
    return Scaffold(
      appBar: AppBar(title: const Text("AI Schedule Suggestion")),
      body: Center(
        child: Text(
          "AI will suggest best available time slots here",
          style: Theme.of(context).textTheme.bodyLarge,
        ),
      ),
    );
  }
}
