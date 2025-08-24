import 'package:flutter/material.dart';
import '../../services/forum_service.dart';
import '../../config/theme.dart';

class IssueListPage extends StatefulWidget {
  const IssueListPage({super.key});

  @override
  State<IssueListPage> createState() => _IssueListPageState();
}

class _IssueListPageState extends State<IssueListPage> {
  final ForumService _forum = ForumService();
  bool _loading = true;
  List<dynamic> _issues = [];
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final items = await _forum.getIssues();
      setState(() { _issues = items; });
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _loading = false; });
    }
  }

  Future<void> _markCompleted(int issueId) async {
    try {
      await _forum.deleteIssue(issueId);
      await _load();
    } catch (e) {
      if (!mounted) return; 
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  Future<void> _startFundraiser(int issueId) async {
    try {
      final f = await _forum.startFundraiserForIssue(issueId);
      if (!mounted) return;
      final qr = f['qr_image_url']?.toString() ?? '';
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Fundraiser ready. QR saved at: $qr')));
    } catch (e) {
      if (!mounted) return; 
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Reported Issues')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? Center(child: Text(_error!))
              : RefreshIndicator(
                  onRefresh: _load,
                  child: ListView.builder(
                    itemCount: _issues.length,
                    itemBuilder: (_, i) {
                      final it = _issues[i] as Map<String, dynamic>;
                      return Card(
                        color: Theme.of(context).colorScheme.surface,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        margin: const EdgeInsets.all(8),
                        child: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(it['title'] ?? 'Untitled', style: Theme.of(context).textTheme.titleMedium),
                              const SizedBox(height: 4),
                              Text(it['description'] ?? ''),
                              const SizedBox(height: 8),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.end,
                                children: [
                                  TextButton.icon(
                                    onPressed: () => _markCompleted(it['id'] as int),
                                    icon: const Icon(Icons.check_circle_outline),
                                    label: const Text('Completed'),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton.icon(
                                    onPressed: () => _startFundraiser(it['id'] as int),
                                    icon: const Icon(Icons.qr_code),
                                    label: const Text('Fundraiser'),
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: AppColors.yellow,
                                      foregroundColor: Colors.black,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
