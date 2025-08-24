import 'package:flutter/material.dart';
import '../../services/forum_service.dart';
import '../../services/auth_service.dart';
import '../../config/theme.dart';
import 'create_post_page.dart';
import 'forum_posts_page.dart';

class ForumFeedPage extends StatefulWidget {
  const ForumFeedPage({super.key});

  @override
  State<ForumFeedPage> createState() => _ForumFeedPageState();
}

class _ForumFeedPageState extends State<ForumFeedPage> {
  final service = ForumService();
  final _auth = AuthService();
  List<dynamic> issues = [];
  bool loading = false;
  String sortBy = 'recent';

  // Dynamic category filters derived from AI classification
  List<String> categories = [];
  String selectedCategory = 'All';
  int? myUserId;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      // load my profile to know my user id for client-side permission UI
      try {
        final me = await _auth.getMe();
        myUserId = (me['id'] as num?)?.toInt();
      } catch (_) {}

      issues = await service.getIssues(sort: sortBy == 'trending' ? 'trending' : null);
      // Build categories from AI classification
      final set = <String>{};
      for (final it in issues) {
        if (it is Map<String, dynamic>) {
          final ai = it['ai'];
          if (ai is Map<String, dynamic>) {
            final c = ai['classification'];
            if (c is String && c.trim().isNotEmpty) set.add(c.trim());
            if (c is Map<String, dynamic>) {
              final cat = (c['category'] as String?)?.trim();
              if (cat != null && cat.isNotEmpty) set.add(cat);
            }
          }
        }
      }
      final built = ['All', ...set.toList()..sort()];
      categories = built;
      if (!categories.contains(selectedCategory)) selectedCategory = 'All';
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => loading = false);
    }
  }

  Future<void> _vote(int issueId, int value) async {
    try {
      await service.voteIssue(issueId, value);
      await _load(); // Refresh to show updated scores
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Vote failed: $e')),
      );
    }
  }

  Future<void> _deleteIssue(int issueId) async {
    try {
      await service.deleteIssue(issueId);
      await _load();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Issue marked completed and removed.')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Delete failed: $e')),
        );
      }
    }
  }

  Future<void> _startFundraiser(int issueId) async {
    try {
      final f = await service.startFundraiserForIssue(issueId);
      final qr = f['qr_image_url']?.toString() ?? '';
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fundraiser started. QR saved at: $qr')),
        );
        await _load(); // Refresh to show updated data
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Fundraiser failed: $e')),
        );
      }
    }
  }




  Future<void> _openEscalateSheet(Map<String, dynamic> issue) async {
    final id = (issue['id'] as num?)?.toInt();
    if (id == null) return;
    final draftText = (issue['complaint_draft'] as String?) ?? '';

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) {
        final draftController = TextEditingController(text: draftText);
        bool sending = false;
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                bottom: MediaQuery.of(context).viewInsets.bottom,
                left: 16,
                right: 16,
                top: 16,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Complaint Draft',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Review and edit before sending to the concerned authority.',
                    style: TextStyle(color: Colors.black54),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: draftController,
                    maxLines: 12,
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: sending
                              ? null
                              : () async {
                                  setModalState(() => sending = true);
                                  try {
                                    final res = await service.escalateIssue(id, draft: draftController.text);
                                    // Optimistically update current list without waiting for reload
                                    if (mounted) {
                                      setState(() {
                                        final idx = issues.indexWhere((it) => (it as Map<String, dynamic>)['id'] == id);
                                        if (idx != -1) {
                                          final updated = Map<String, dynamic>.from(issues[idx] as Map<String, dynamic>);
                                          updated['escalated'] = true;
                                          updated['escalated_to'] = res['escalated_to'];
                                          updated['escalated_at'] = res['escalated_at'];
                                          updated['complaint_draft'] = res['complaint_draft'] ?? draftController.text;
                                          issues[idx] = updated;
                                        }
                                      });
                                    }
                                    if (context.mounted) {
                                      Navigator.of(context).pop();
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Complaint sent to authority.')),
                                      );
                                      // Also refresh from server in background
                                      // ignore: use_build_context_synchronously
                                      _load();
                                    }
                                  } catch (e) {
                                    setModalState(() => sending = false);
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Failed to send: $e')),
                                      );
                                    }
                                  }
                                },
                          icon: const Icon(Icons.send),
                          label: Text(sending ? 'Sending...' : 'Send to Authority'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Community Forum"),
        actions: [
          IconButton(
            tooltip: 'Forum Posts',
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const ForumPostsPage()),
            ),
            icon: const Icon(Icons.forum),
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              setState(() => sortBy = value);
              _load();
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'recent', child: Text('Recent')),
              const PopupMenuItem(value: 'trending', child: Text('Trending')),
            ],
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(56),
          child: Container(
            alignment: Alignment.centerLeft,
            padding: const EdgeInsets.fromLTRB(12, 0, 12, 8),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [AppColors.black, AppColors.charcoal],
              ),
            ),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  ...categories.map((cat) {
                    final selected = cat == selectedCategory;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: ChoiceChip(
                        label: Text(cat),
                        selected: selected,
                        onSelected: (_) => setState(() => selectedCategory = cat),
                      ),
                    );
                  }).toList(),
                ],
              ),
            ),
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => Navigator.push(
          context,
          MaterialPageRoute(builder: (_) => const CreatePostPage()),
        ).then((_) => _load()),
        child: const Icon(Icons.add),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.separated(
                padding: const EdgeInsets.all(12),
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemCount: issues
                    .where((it) {
                      if (selectedCategory == 'All') return true;
                      final ai = (it as Map<String, dynamic>)['ai'];
                      if (ai is Map<String, dynamic>) {
                        final c = ai['classification'];
                        if (c is String) return c == selectedCategory;
                        if (c is Map<String, dynamic>) return c['category'] == selectedCategory;
                      }
                      return false;
                    })
                    .length,
                itemBuilder: (_, i) {
                  final filtered = issues.where((it) {
                    if (selectedCategory == 'All') return true;
                    final ai = (it as Map<String, dynamic>)['ai'];
                    if (ai is Map<String, dynamic>) {
                      final c = ai['classification'];
                      if (c is String) return c == selectedCategory;
                      if (c is Map<String, dynamic>) return c['category'] == selectedCategory;
                    }
                    return false;
                  }).toList();
                  final issue = filtered[i] as Map<String, dynamic>;
                  final ai = issue['ai'];
                  String? classificationText;
                  if (ai is Map<String, dynamic>) {
                    final classification = ai['classification'];
                    if (classification is String) {
                      classificationText = classification;
                    } else if (classification is Map<String, dynamic>) {
                      classificationText = classification['category'] as String?;
                    }
                  }
                  final score = (issue['score'] as num?)?.toInt() ?? 0;
                  final author = (issue['author'] as String?) ?? 'Anonymous';
                  
                  final escalated = issue['escalated'] == true;
                  final escalatedTo = issue['escalated_to'] as String?;
                  final escalatedAt = issue['escalated_at'] as String?;

                  return Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(14, 12, 12, 12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Vote rail
                          Column(
                            children: [
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                onPressed: () => _vote(issue['id'], 1),
                                icon: const Icon(Icons.keyboard_arrow_up_rounded),
                              ),
                              Text('$score', style: const TextStyle(fontWeight: FontWeight.bold)),
                              IconButton(
                                visualDensity: VisualDensity.compact,
                                onPressed: () => _vote(issue['id'], -1),
                                icon: const Icon(Icons.keyboard_arrow_down_rounded),
                              ),
                            ],
                          ),
                          const SizedBox(width: 8),
                          // Content
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    Expanded(
                                      child: Text(
                                        issue['title'] ?? '',
                                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                        maxLines: 2,
                                        overflow: TextOverflow.ellipsis,
                                      ),
                                    ),
                                    if (classificationText != null)
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: Colors.blue.withOpacity(0.15),
                                          borderRadius: BorderRadius.circular(12),
                                          border: Border.all(color: Colors.blue.withOpacity(0.2)),
                                        ),
                                        child: Text(
                                          classificationText,
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                Text(
                                  issue['description'] ?? '',
                                  maxLines: 3,
                                  overflow: TextOverflow.ellipsis,
                                ),
                                const SizedBox(height: 10),
                                if (escalated)
                                  Wrap(
                                    crossAxisAlignment: WrapCrossAlignment.center,
                                    spacing: 8,
                                    runSpacing: 4,
                                    children: [
                                      Container(
                                        decoration: BoxDecoration(
                                          color: Colors.green.withOpacity(0.15),
                                          borderRadius: BorderRadius.circular(16),
                                          border: Border.all(color: Colors.green.withOpacity(0.2)),
                                        ),
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        child: Row(
                                          mainAxisSize: MainAxisSize.min,
                                          children: const [
                                            Icon(Icons.check_circle, size: 14, color: Colors.green),
                                            SizedBox(width: 6),
                                            Text(
                                              'Sent',
                                              style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.green,
                                                fontWeight: FontWeight.w600,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      if (escalatedTo != null)
                                        Text(
                                          'to $escalatedTo',
                                          style: const TextStyle(fontSize: 12, color: Colors.white70),
                                          overflow: TextOverflow.ellipsis,
                                          maxLines: 1,
                                        ),
                                      if (escalatedAt != null)
                                        Text(
                                          'on ${DateTime.tryParse(escalatedAt)?.toLocal().toString().split('.').first ?? escalatedAt}',
                                          style: const TextStyle(fontSize: 12, color: Colors.white38),
                                        ),
                                    ],
                                  )
                                else ...[
                                  const SizedBox(height: 8),
                                  Align(
                                    alignment: Alignment.centerLeft,
                                    child: Builder(builder: (context) {
                                      final ownerId = (issue['user_id'] as num?)?.toInt();
                                      // Only allow the creator to escalate
                                      if (ownerId != null) {
                                        // TODO: if we have current user id in app state, compare here.
                                        // For now, still show button; backend protects.
                                      }
                                      final canEscalate = myUserId == null || ownerId == null || myUserId == ownerId;
                                      return TextButton.icon(
                                        onPressed: canEscalate ? () => _openEscalateSheet(issue) : null,
                                        icon: const Icon(Icons.outgoing_mail),
                                        label: const Text('Send to Authority'),
                                      );
                                    }),
                                  ),
                                ],
                                const SizedBox(height: 10),
                                Row(
                                  children: [
                                    Icon(Icons.person, size: 14, color: Colors.white54),
                                    const SizedBox(width: 4),
                                    Text(author, style: const TextStyle(fontSize: 12, color: Colors.white70)),
                                    const Spacer(),
                                    Text('#${issue['id']}', style: const TextStyle(fontSize: 12, color: Colors.white38)),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                // Action buttons - wrap to avoid horizontal overflow on narrow screens
                                Wrap(
                                  alignment: WrapAlignment.end,
                                  spacing: 8,
                                  runSpacing: 8,
                                  children: [
                                    TextButton.icon(
                                      onPressed: () => _deleteIssue(issue['id'] as int),
                                      icon: const Icon(Icons.check_circle_outline),
                                      label: const Text('Completed'),
                                    ),
                                    ElevatedButton.icon(
                                      onPressed: () => _startFundraiser(issue['id'] as int),
                                      icon: const Icon(Icons.qr_code),
                                      label: const Text('Fundraiser'),
                                    ),
                                  ],
                                ),
                              ],
                            ),
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
