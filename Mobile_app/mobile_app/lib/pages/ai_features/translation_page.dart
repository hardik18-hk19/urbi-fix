import 'package:flutter/material.dart';

class TranslationPage extends StatelessWidget {
  const TranslationPage({super.key});

  @override
  Widget build(BuildContext context) {
    final controller = TextEditingController();

    return Scaffold(
      appBar: AppBar(title: const Text("AI Translation")),
      body: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            TextField(controller: controller, decoration: const InputDecoration(labelText: "Enter text")),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {},
              child: const Text("Translate"),
            ),
          ],
        ),
      ),
    );
  }
}
