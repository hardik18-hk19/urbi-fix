import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/booking_service.dart';
import '../../services/forum_service.dart';

class ConsumerProfilePage extends StatefulWidget {
  const ConsumerProfilePage({super.key});

  @override
  State<ConsumerProfilePage> createState() => _ConsumerProfilePageState();
}

class _ConsumerProfilePageState extends State<ConsumerProfilePage> with SingleTickerProviderStateMixin {
  final _bookingService = BookingService();
  final _forumService = ForumService();

  bool _loading = false;
  String? _error;
  List<dynamic> _bookings = [];
  List<dynamic> _issues = [];

  late TabController _tabController;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _load();
    _timer = Timer.periodic(const Duration(seconds: 8), (_) => _load());
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final bookings = await _bookingService.getBookings();
      final issues = await _forumService.getIssues();
      setState(() {
        _bookings = bookings;
        _issues = issues;
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Activity'),
        bottom: const TabBar(
          tabs: [
            Tab(text: 'Service History'),
            Tab(text: 'Forum Posts'),
          ],
        ),
      ),
      body: Column(
        children: [
          if (_loading) const LinearProgressIndicator(),
          if (_error != null) Padding(padding: const EdgeInsets.all(8), child: Text(_error!, style: const TextStyle(color: Colors.red))),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildBookings(),
                  _buildIssues(),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBookings() {
    if (_bookings.isEmpty && !_loading) {
      return const Center(child: Text('No service requests yet'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _bookings.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final b = _bookings[i] as Map<String, dynamic>;
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('#${b['id']} — ${b['service_category'] ?? 'General'}', style: Theme.of(context).textTheme.titleMedium),
                  _statusChip((b['status'] ?? '').toString()),
                ],
              ),
              const SizedBox(height: 6),
              Text(b['notes'] ?? '-', style: Theme.of(context).textTheme.bodyMedium),
            ],
          ),
        );
      },
    );
  }

  Widget _buildIssues() {
    if (_issues.isEmpty && !_loading) {
      return const Center(child: Text('No forum posts yet'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(12),
      itemCount: _issues.length,
      separatorBuilder: (_, __) => const SizedBox(height: 8),
      itemBuilder: (_, i) {
        final it = _issues[i] as Map<String, dynamic>;
        return Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surface,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: Colors.white10),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(it['title'] ?? 'Untitled', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 6),
              Text(it['description'] ?? '-', style: Theme.of(context).textTheme.bodyMedium),
              if (it['ai'] != null) ...[
                const SizedBox(height: 8),
                Text('AI: ${it['ai'].toString()}', style: const TextStyle(color: Color(0xFFFFC1E3), fontSize: 12)),
              ]
            ],
          ),
        );
      },
    );
  }

  Widget _statusChip(String status) {
    Color color;
    switch (status) {
      case 'requested': color = const Color(0xFFFFD600); break;
      case 'accepted': color = const Color(0xFFFFC1E3); break;
      case 'on_the_way': color = const Color(0xFFFFD600); break;
      case 'arrived': color = const Color(0xFFFFC1E3); break;
      case 'started': color = const Color(0xFFFFD600); break;
      case 'completed': color = const Color(0xFF43e97b); break;
      default: color = Colors.grey; break;
    }
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.15),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withOpacity(0.6)),
      ),
      child: Text(status, style: TextStyle(color: color, fontWeight: FontWeight.w600, fontSize: 12)),
    );
  }
}