import 'package:flutter/material.dart';
import '../../services/forum_service.dart';
import '../../services/forum_funding_service.dart';
// import '../../config/api_config.dart';
import 'widgets/post_content_with_qr.dart';

class ForumPostsPage extends StatefulWidget {
  const ForumPostsPage({super.key});

  @override
  State<ForumPostsPage> createState() => _ForumPostsPageState();
}

class _ForumPostsPageState extends State<ForumPostsPage> {
  final service = ForumService();
  final fundingService = ForumFundingService();
  bool loading = false;
  List<dynamic> posts = [];
  Map<int, bool> contributingStates = {};

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => loading = true);
    try {
      // Load forum posts, which include fundraiser start/update posts containing QR and payment link
      posts = await service.getForumPosts();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load forum posts: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  Future<void> _contributeFunding(int issueId, double amount) async {
    if (contributingStates[issueId] == true) return;
    
    setState(() => contributingStates[issueId] = true);
    
    try {
      final result = await fundingService.contributeFunding(issueId, amount);
      if (mounted) {
        // Update the post data with new funding info
        final postIndex = posts.indexWhere((p) => (p['issue_id'] ?? p['id']) == issueId);
        if (postIndex != -1) {
          final updatedIssue = result['issue'] as Map<String, dynamic>;
          // Update the post with the latest issue data
          final currentPost = Map<String, dynamic>.from(posts[postIndex] as Map<String, dynamic>);
          currentPost['funding_current'] = updatedIssue['funding_current'];
          currentPost['funding_goal'] = updatedIssue['funding_goal'];
          currentPost['funding_contributions'] = updatedIssue['funding_contributions'];
          currentPost['assigned_booking_id'] = updatedIssue['assigned_booking_id'];
          posts[postIndex] = currentPost;
        }
        
        setState(() {});
        
        final percentage = result['funding_percentage'] as double? ?? 0.0;
        final autoAssigned = result['auto_assigned'] == true;
        
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(
              autoAssigned 
                ? 'Contribution successful! Funding complete - auto-assigning provider...'
                : 'Contributed ₹${amount.toStringAsFixed(0)}! ${percentage.toStringAsFixed(1)}% funded',
            ),
            backgroundColor: autoAssigned ? Colors.green : null,
          ),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to contribute: $e')),
      );
    } finally {
      if (mounted) setState(() => contributingStates[issueId] = false);
    }
  }

  Future<void> _refreshIssueData(int issueId) async {
    try {
      final updatedIssue = await service.getIssueById(issueId);
      setState(() {
        final postIndex = posts.indexWhere((p) => (p['issue_id'] ?? p['id']) == issueId);
        if (postIndex != -1) {
          final currentPost = Map<String, dynamic>.from(posts[postIndex] as Map<String, dynamic>);
          currentPost['funding_current'] = updatedIssue['funding_current'];
          currentPost['funding_goal'] = updatedIssue['funding_goal'];
          currentPost['funding_contributions'] = updatedIssue['funding_contributions'];
          currentPost['assigned_booking_id'] = updatedIssue['assigned_booking_id'];
          posts[postIndex] = currentPost;
        }
      });
    } catch (e) {
      // Silent fail for background refresh
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Forum Posts'),
      ),
      body: loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView.separated(
                padding: const EdgeInsets.all(12),
                itemCount: posts.length,
                separatorBuilder: (_, __) => const SizedBox(height: 8),
                itemBuilder: (_, i) {
                  final p = posts[i] as Map<String, dynamic>;
                  final title = (p['title'] as String?) ?? 'Untitled';
                  final content = (p['content'] as String?) ?? '';
                  final author = (p['author_name'] as String?) ?? 'System';
                  final category = (p['category'] as String?) ?? 'general';
                  final createdAt = (p['created_at'] as String?) ?? '';
                  final issueId = p['issue_id'] ?? p['id'];
                  final fundraiserId = p['fundraiser_id'];

                  return Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: ListTile(
                      contentPadding: const EdgeInsets.all(12),
                      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const SizedBox(height: 6),
                          // Show content but convert QR line to image when possible
                          PostContentWithQr(
                            content: content,
                            issueData: p,
                            onContribute: issueId != null ? (amount) => _contributeFunding(issueId, amount) : null,
                            isLoading: contributingStates[issueId] ?? false,
                            onStatusUpdate: issueId != null ? () => _refreshIssueData(issueId) : null,
                          ),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            children: [
                              Chip(label: Text(category)),
                              if (createdAt.isNotEmpty) Chip(label: Text(createdAt)),
                              Chip(label: Text('by $author')),
                              if (issueId != null) Chip(label: Text('Issue #$issueId')),
                              if (fundraiserId != null) Chip(label: Text('Fundraiser #$fundraiserId')),
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