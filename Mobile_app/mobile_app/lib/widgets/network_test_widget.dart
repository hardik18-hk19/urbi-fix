import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../config/api_config.dart';

class NetworkTestWidget extends StatefulWidget {
  const NetworkTestWidget({super.key});

  @override
  State<NetworkTestWidget> createState() => _NetworkTestWidgetState();
}

class _NetworkTestWidgetState extends State<NetworkTestWidget> {
  String _status = 'Not tested';
  bool _isLoading = false;

  Future<void> _testConnection() async {
    setState(() {
      _isLoading = true;
      _status = 'Testing connection...';
    });

    try {
      // Test health endpoint
      print('🧪 Testing connection to: ${ApiConfig.baseUrl}');
      final response = await http.get(
        Uri.parse('${ApiConfig.baseUrl}/'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));

      print('📥 Response status: ${response.statusCode}');
      print('📥 Response body: ${response.body}');

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data['status'] == 'ok') {
          setState(() {
            _status = '✅ Connection successful!\nBackend is running and accessible.';
          });
        } else {
          setState(() {
            _status = '⚠️ Backend responded but status is not OK: ${data['status']}';
          });
        }
      } else {
        setState(() {
          _status = '❌ Backend responded with error: ${response.statusCode}\n${response.body}';
        });
      }
    } catch (e) {
      print('❌ Connection test failed: $e');
      setState(() {
        _status = '❌ Connection failed: $e\n\nTroubleshooting:\n'
            '• Check if backend is running\n'
            '• Verify IP address: ${ApiConfig.baseUrl}\n'
            '• For emulator, try: http://10.0.2.2:8000\n'
            '• For device, ensure same WiFi network';
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.all(16),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Network Connection Test',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Backend URL: ${ApiConfig.baseUrl}',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _isLoading ? null : _testConnection,
              child: _isLoading
                  ? const Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        ),
                        SizedBox(width: 8),
                        Text('Testing...'),
                      ],
                    )
                  : const Text('Test Connection'),
            ),
            const SizedBox(height: 16),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey[100],
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.grey[300]!),
              ),
              child: Text(
                _status,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ),
          ],
        ),
      ),
    );
  }
}