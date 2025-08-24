import 'dart:async';
import 'package:flutter/material.dart';
import '../../../services/booking_service.dart';

class AutoAssignmentStatus extends StatefulWidget {
  final Map<String, dynamic> issueData;
  final VoidCallback? onStatusUpdate;

  const AutoAssignmentStatus({
    super.key,
    required this.issueData,
    this.onStatusUpdate,
  });

  @override
  State<AutoAssignmentStatus> createState() => _AutoAssignmentStatusState();
}

class _AutoAssignmentStatusState extends State<AutoAssignmentStatus> {
  final BookingService _bookingService = BookingService();
  Map<String, dynamic>? bookingData;
  Map<String, dynamic>? providerData;
  bool loading = true;
  String? error;

  // Periodic polling to keep status dynamic
  Timer? _pollTimer;
  final Set<String> _terminalStatuses = {'completed', 'canceled'};

  @override
  void initState() {
    super.initState();
    _loadAssignmentStatus();
  }

  @override
  void didUpdateWidget(covariant AutoAssignmentStatus oldWidget) {
    super.didUpdateWidget(oldWidget);
    final oldId = oldWidget.issueData['assigned_booking_id'] as int?;
    final newId = widget.issueData['assigned_booking_id'] as int?;
    if (oldId != newId) {
      _loadAssignmentStatus();
    }
  }

  @override
  void dispose() {
    _stopPolling();
    super.dispose();
  }

  void _startPolling() {
    _stopPolling();
    final assignedBookingId = widget.issueData['assigned_booking_id'] as int?;
    final status = (bookingData?['status'] as String?) ?? '';

    if (assignedBookingId == null) return;
    if (_terminalStatuses.contains(status)) return;

    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) async {
      await _refreshBookingStatus(assignedBookingId);
    });
  }

  void _stopPolling() {
    _pollTimer?.cancel();
    _pollTimer = null;
  }

  Future<void> _refreshBookingStatus(int bookingId) async {
    try {
      final latest = await _bookingService.getBookingById(bookingId);
      final prevStatus = bookingData?['status'];
      bookingData = latest;

      // Extract provider from booking payload (fallback values included)
      final providerId = latest['provider_id'] as int?;
      if (providerId != null) {
        providerData = {
          'id': providerId,
          'name': latest['provider_name'] ?? 'Provider #$providerId',
          'rating': (latest['provider_rating'] as num?)?.toDouble() ?? 0.0,
          'phone': latest['provider_phone'],
        };
      }

      final newStatus = latest['status'] as String?;
      if (newStatus != prevStatus) {
        widget.onStatusUpdate?.call();
      }

      if (newStatus != null && _terminalStatuses.contains(newStatus)) {
        _stopPolling();
      }

      if (mounted) setState(() {});
    } catch (e) {
      // Do not break polling on transient errors
      error = e.toString();
      if (mounted) setState(() {});
    }
  }

  Future<void> _loadAssignmentStatus() async {
    setState(() {
      loading = true;
      error = null;
    });

    try {
      final assignedBookingId = widget.issueData['assigned_booking_id'] as int?;
      bookingData = null;
      providerData = null;

      if (assignedBookingId != null) {
        // Get booking details
        final data = await _bookingService.getBookingById(assignedBookingId);
        bookingData = data;

        // Get provider details if available (from booking payload)
        final providerId = data['provider_id'] as int?;
        if (providerId != null) {
          providerData = {
            'id': providerId,
            'name': data['provider_name'] ?? 'Provider #$providerId',
            'rating': (data['provider_rating'] as num?)?.toDouble() ?? 0.0,
            'phone': data['provider_phone'],
          };
        }
      }
    } catch (e) {
      error = e.toString();
    } finally {
      setState(() => loading = false);
      _startPolling();
    }
  }

  @override
  Widget build(BuildContext context) {
    final assignedBookingId = widget.issueData['assigned_booking_id'] as int?;

    if (loading) {
      return _panel(
        color: Colors.blue,
        child: const Row(
          children: [
            SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)),
            SizedBox(width: 12),
            Expanded(child: Text('Loading status...')),
          ],
        ),
      );
    }

    if (error != null) {
      return _panel(
        color: Colors.red,
        child: Row(
          children: [
            const Icon(Icons.error, color: Colors.red, size: 20),
            const SizedBox(width: 12),
            Expanded(child: Text('Error: $error')),
            IconButton(onPressed: _loadAssignmentStatus, icon: const Icon(Icons.refresh)),
          ],
        ),
      );
    }

    if (assignedBookingId == null) {
      // No booking assigned yet (pure request-to-provider flow)
      return _panel(
        color: Colors.orange,
        child: const Row(
          children: [
            Icon(Icons.hourglass_top, color: Colors.orange, size: 20),
            SizedBox(width: 12),
            Expanded(
              child: Text(
                'Request sent. Waiting for a local helper to accept.',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
            ),
          ],
        ),
      );
    }

    // Assignment exists - show status
    final status = (bookingData?['status'] as String?) ?? 'unknown';
    final providerName = providerData?['name'] as String? ?? 'Local helper';
    final providerRating = (providerData?['rating'] as num?)?.toDouble() ?? 0.0;
    final etaMinutes = bookingData?['eta_minutes'] as int?;
    final priceAmount = (bookingData?['price_amount'] as num?)?.toDouble();

    Color statusColor;
    IconData statusIcon;
    String statusText;

    switch (status) {
      case 'requested':
      case 'auto_assigned':
        statusColor = Colors.blue;
        statusIcon = Icons.assignment_ind;
        statusText = 'Waiting for provider response';
        break;
      case 'accepted':
        statusColor = Colors.green;
        statusIcon = Icons.check_circle;
        statusText = 'Accepted — en route soon';
        break;
      case 'on_the_way':
        statusColor = Colors.purple;
        statusIcon = Icons.directions_car;
        statusText = 'On the way';
        break;
      case 'arrived':
        statusColor = Colors.teal;
        statusIcon = Icons.location_on;
        statusText = 'Arrived at your location';
        break;
      case 'started':
        statusColor = Colors.indigo;
        statusIcon = Icons.build;
        statusText = 'Work in progress';
        break;
      case 'declined':
        statusColor = Colors.red;
        statusIcon = Icons.cancel;
        statusText = 'Declined — finding another helper';
        break;
      case 'completed':
        statusColor = Colors.green;
        statusIcon = Icons.done_all;
        statusText = 'Completed';
        break;
      default:
        statusColor = Colors.grey;
        statusIcon = Icons.help_outline;
        statusText = 'Status: $status';
    }

    return _panel(
      color: statusColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(statusIcon, color: statusColor, size: 20),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  statusText,
                  style: TextStyle(fontWeight: FontWeight.w700, color: statusColor),
                ),
              ),
              IconButton(
                onPressed: () {
                  _loadAssignmentStatus();
                  widget.onStatusUpdate?.call();
                },
                icon: const Icon(Icons.refresh, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 12),

          // Contextual tips
          if (status == 'requested' || status == 'auto_assigned')
            _tip(
              color: Colors.blue,
              icon: Icons.assignment_turned_in,
              text: 'Your request is with nearby helpers. We\'ll update as soon as someone responds.',
            ),
          if (status == 'accepted')
            _tip(
              color: Colors.green,
              icon: Icons.check_circle,
              text: 'Accepted. We\'ll show ETA once available.',
            ),
          if (status == 'declined')
            _tip(
              color: Colors.orange,
              icon: Icons.search,
              text: 'Searching for another helper...',
            ),

          // Provider + details
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.08),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.person, size: 16),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        providerName,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                      ),
                    ),
                    if (providerRating > 0) ...[
                      const Icon(Icons.star, color: Colors.amber, size: 16),
                      const SizedBox(width: 4),
                      Text(providerRating.toStringAsFixed(1),
                          style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ],
                ),
                if (etaMinutes != null && (status == 'accepted' || status == 'on_the_way'))
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Row(
                      children: [
                        const Icon(Icons.access_time, size: 16),
                        const SizedBox(width: 8),
                        Text('ETA: $etaMinutes min'),
                      ],
                    ),
                  ),
                if (priceAmount != null)
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: Row(
                      children: [
                        const Icon(Icons.currency_rupee, size: 16),
                        const SizedBox(width: 8),
                        Text('Price: ₹${priceAmount.toStringAsFixed(0)}'),
                      ],
                    ),
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  // Styled panels for consistent look
  Widget _panel({required Color color, required Widget child}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: child,
    );
  }

  Widget _tip({required Color color, required IconData icon, required String text}) {
    return Container(
      padding: const EdgeInsets.all(10),
      margin: const EdgeInsets.only(bottom: 8),
      decoration: BoxDecoration(
        color: color.withOpacity(0.08),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(
        children: [
          Icon(icon, color: color, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
            ),
          ),
        ],
      ),
    );
  }
}