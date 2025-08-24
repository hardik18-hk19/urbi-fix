import 'dart:async';
import 'dart:convert' as json;
import 'dart:io' as io;
import 'package:flutter/material.dart';
import '../../config/theme.dart';
import '../../config/api_config.dart';
import '../../services/booking_service.dart';
import '../../services/funding_service.dart';
import 'widgets/funding_tabs.dart';

class BookingStatusPage extends StatefulWidget {
  final int bookingId;
  const BookingStatusPage({super.key, required this.bookingId});

  @override
  State<BookingStatusPage> createState() => _BookingStatusPageState();
}

class _BookingStatusPageState extends State<BookingStatusPage>
    with TickerProviderStateMixin {
  final service = BookingService();
  final fundingService = FundingService();
  Map<String, dynamic>? booking;
  bool _isContributing = false;
  Timer? timer;
  // Optional WebSocket for realtime updates (fallback to polling)
  dynamic _ws;
  Timer? _wsRetryTimer;
  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;
  bool _mapOpened = false;
  String? _lastStatus;
  bool _showedPollError = false; // avoid spamming SnackBars
  bool _wsConnectedOnce = false; // simple WS diagnostics

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    );
    _pulseAnimation = Tween<double>(
      begin: 1.0,
      end: 1.2,
    ).animate(CurvedAnimation(
      parent: _pulseController,
      curve: Curves.easeInOut,
    ));
    _pulseController.repeat(reverse: true);

    _load();
    _connectWs();
    timer = Timer.periodic(const Duration(seconds: 5), (_) => _load());
  }

  void _connectWs() async {
    try {
      final base = ApiConfig.baseUrl.replaceFirst('http', 'ws');
      final url = Uri.parse('$base/api/bookings/ws/${widget.bookingId}');
      _ws = await io.WebSocket.connect(url.toString());
      if (mounted && !_wsConnectedOnce) {
        _wsConnectedOnce = true;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Live updates connected')),
        );
      }
      _ws.listen((data) {
        try {
          final map = json.jsonDecode(data);
          if (mounted) {
            setState(() {
              booking = map;
            });
            _notifyOnStatusChange();
          }
        } catch (_) {}
      }, onError: (_) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Live updates disconnected, retrying...')),
          );
        }
        _scheduleWsRetry();
      }, onDone: () {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Live updates disconnected, retrying...')),
          );
        }
        _scheduleWsRetry();
      });
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Live updates unavailable, using polling')),
        );
      }
      _scheduleWsRetry();
    }
  }

  void _scheduleWsRetry() {
    if (!mounted) return;
    _wsRetryTimer?.cancel();
    _wsRetryTimer = Timer(const Duration(seconds: 10), () {
      if (!mounted) return;
      _connectWs();
    });
  }

  Future<void> _load() async {
    try {
      final b = await service.getBookingById(widget.bookingId);
      if (mounted) {
        setState(() => booking = b);
        _notifyOnStatusChange();
      }
    } catch (e) {
      if (mounted && !_showedPollError) {
        _showedPollError = true;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Sync failed, retrying periodically: $e')),
        );
      }
      // Keep previous state if fetch fails (e.g., network hiccup)
    }
  }

  bool _ratingAsked = false;

  @override
  void dispose() {
    timer?.cancel();
    try { _ws?.close(); } catch (_) {}
    _wsRetryTimer?.cancel();
    _pulseController.dispose();
    super.dispose();
  }

  Future<void> _maybeAskRating() async {
    if (_ratingAsked || booking == null) return;
    _ratingAsked = true;
    final result = await showDialog<_RatingResult>(
      context: context,
      barrierDismissible: false,
      builder: (ctx) => _RatingDialog(),
    );
    if (result != null) {
      try {
        final updated = await service.rateBooking(
          widget.bookingId,
          stars: result.stars,
          comment: result.comment,
        );
        if (mounted) setState(() => booking = updated);
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to submit rating: $e')),
        );
      }
    }
  }

  Future<void> _contributeFunding(double amount) async {
    if (_isContributing) return;
    
    setState(() => _isContributing = true);
    
    try {
      final updated = await fundingService.contributeFunding(widget.bookingId, amount);
      if (mounted) {
        setState(() => booking = updated);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Contributed ₹${amount.toStringAsFixed(0)}! Thank you!')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to contribute: $e')),
      );
    } finally {
      if (mounted) setState(() => _isContributing = false);
    }
  }

  void _notifyOnStatusChange() {
    final status = (booking?['status'] ?? '').toString();
    if (_lastStatus == status || status.isEmpty) return;
    final ctx = context;
    _lastStatus = status;
    if (!mounted) return;
    if (status == 'accepted') {
      ScaffoldMessenger.of(ctx).showSnackBar(
        const SnackBar(content: Text('Your request was accepted!')),
      );
    }
    if (status == 'auto_assigned') {
      ScaffoldMessenger.of(ctx).showSnackBar(
        const SnackBar(content: Text('Funding complete! Auto-assigned to best provider!')),
      );
    }
    if (status == 'accepted' || status == 'auto_assigned') {
      // Auto-open map once when accepted
      if (!_mapOpened && booking != null) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (!mounted) return;
          final consumerLat = (booking!['consumer_lat'] as num?)?.toDouble();
          final consumerLng = (booking!['consumer_lng'] as num?)?.toDouble();
          final providerLat = (booking!['provider_live_lat'] as num?)?.toDouble();
          final providerLng = (booking!['provider_live_lng'] as num?)?.toDouble();
          _mapOpened = true;
          Navigator.pushNamed(ctx, '/provider_job_map', arguments: {
            'title': 'Live Map',
            'bookingId': widget.bookingId,
            'consumerLat': consumerLat,
            'consumerLng': consumerLng,
            'providerLat': providerLat,
            'providerLng': providerLng,
            'readonly': true,
          }).then((_) { _mapOpened = false; });
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final status = (booking?['status'] ?? 'requested').toString();

    // If completed and not rated yet, prompt for rating once
    if (status == 'completed' && (booking?['rating_stars'] == null)) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _maybeAskRating());
    }
    
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [
              AppColors.black,
              AppColors.charcoal,
            ],
          ),
        ),
        child: SafeArea(
          child: Column(
            children: [
              // Custom App Bar
              Padding(
                padding: const EdgeInsets.all(20.0),
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back_rounded, color: Colors.white),
                      onPressed: () => Navigator.pop(context),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Booking #${widget.bookingId}',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              
              // Main Content
              Expanded(
                child: Container(
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      topLeft: Radius.circular(30),
                      topRight: Radius.circular(30),
                    ),
                  ),
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(24.0),
                    child: Column(
                      children: [
                        const SizedBox(height: 40),
                        
                        // Status Animation
                        AnimatedBuilder(
                          animation: _pulseAnimation,
                          builder: (context, child) {
                            return Transform.scale(
                              scale: status == 'requested' ? _pulseAnimation.value : 1.0,
                              child: Container(
                                width: 120,
                                height: 120,
                                decoration: BoxDecoration(
                                  gradient: _getStatusGradient(status),
                                  borderRadius: BorderRadius.circular(60),
                                  boxShadow: [
                                    BoxShadow(
                                      color: _getStatusColor(status).withOpacity(0.3),
                                      blurRadius: 20,
                                      offset: const Offset(0, 10),
                                    ),
                                  ],
                                ),
                                child: Icon(
                                  _getStatusIcon(status),
                                  size: 60,
                                  color: Colors.white,
                                ),
                              ),
                            );
                          },
                        ),
                        
                        const SizedBox(height: 30),
                        
                        // Status Title
                        Text(
                          _getStatusTitle(status),
                          style: const TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF2D3748),
                          ),
                          textAlign: TextAlign.center,
                        ),
                        
                        const SizedBox(height: 12),
                        
                        // Status Description
                        Text(
                          _getStatusDescription(status),
                          style: const TextStyle(
                            fontSize: 16,
                            color: Color(0xFF4A5568),
                          ),
                          textAlign: TextAlign.center,
                        ),

                        const SizedBox(height: 12),

                        // Offer details when accepted
                        if (status == 'accepted' || status == 'on_the_way' || status == 'arrived' || status == 'started') ...[
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              if (booking?['eta_minutes'] != null) ...[
                                const Icon(Icons.schedule_rounded, size: 18, color: Color(0xFF4A5568)),
                                const SizedBox(width: 6),
                                Text(
                                  '${booking!['eta_minutes']} min ETA',
                                  style: const TextStyle(fontSize: 14, color: Color(0xFF4A5568)),
                                ),
                              ],
                              if (booking?['eta_minutes'] != null && booking?['price_amount'] != null) const SizedBox(width: 16),
                              if (booking?['price_amount'] != null) ...[
                                const Icon(Icons.currency_rupee_rounded, size: 18, color: Color(0xFF4A5568)),
                                const SizedBox(width: 2),
                                Text(
                                  '${(booking!['price_amount'] as num).toStringAsFixed(0)} ${booking!['price_currency'] ?? 'INR'}',
                                  style: const TextStyle(fontSize: 14, color: Color(0xFF4A5568)),
                                ),
                              ],
                            ],
                          ),
                        ],

                        const SizedBox(height: 20),

                        // Live Location (if available and meaningful)
                        if (status != 'requested' && booking?['provider_live_lat'] != null && booking?['provider_live_lng'] != null) ...[
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              const Icon(Icons.my_location, size: 16, color: Color(0xFF4A5568)),
                              const SizedBox(width: 6),
                              Text(
                                'Provider is sharing location',
                                style: const TextStyle(fontSize: 12, color: Color(0xFF4A5568)),
                              )
                            ],
                          ),
                        ],
                        
                        const SizedBox(height: 20),
                        
                        // Progress Steps
                        _buildProgressSteps(status),
                        
                        const SizedBox(height: 20),
                        
                        // Funding Tabs (only show for requested status)
                        if (status == 'requested' && booking != null) ...[
                          FundingTabs(
                            currentAmount: (booking!['funding_current'] as num?)?.toDouble() ?? 0.0,
                            goalAmount: (booking!['funding_goal'] as num?)?.toDouble() ?? 1000.0,
                            onContribute: _contributeFunding,
                            isLoading: _isContributing,
                          ),
                          const SizedBox(height: 20),
                        ],
                        
                        // Action Buttons (lean layout)
                        if (status == 'requested') ...[
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: () async {
                                    try {
                                      await service.updateBookingStatus(widget.bookingId, {'status': 'canceled'});
                                      if (!mounted) return;
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Request canceled')),
                                      );
                                      Navigator.pop(context);
                                    } catch (e) {
                                      if (!mounted) return;
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(content: Text('Failed to cancel: $e')),
                                      );
                                    }
                                  },
                                  child: const Text('Cancel'),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton.icon(
                                  onPressed: () {
                                    final consumerLat = booking?['consumer_lat'] as double?;
                                    final consumerLng = booking?['consumer_lng'] as double?;
                                    final providerLat = booking?['provider_live_lat'] as double?;
                                    final providerLng = booking?['provider_live_lng'] as double?;
                                    Navigator.pushNamed(context, '/provider_job_map', arguments: {
                                      'title': 'Live Map',
                                      'bookingId': widget.bookingId,
                                      'consumerLat': consumerLat,
                                      'consumerLng': consumerLng,
                                      'providerLat': providerLat,
                                      'providerLng': providerLng,
                                      'readonly': true,
                                    });
                                  },
                                  icon: const Icon(Icons.map_rounded),
                                  label: const Text('View live map'),
                                ),
                              ),
                            ],
                          ),
                        ] else if (status == 'auto_assigned') ...[
                          Container(
                            width: double.infinity,
                            height: 56,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF43e97b), Color(0xFF38f9d7)],
                              ),
                              borderRadius: BorderRadius.circular(15),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF43e97b).withOpacity(0.3),
                                  blurRadius: 15,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent,
                                shadowColor: Colors.transparent,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                              ),
                              onPressed: () {
                                final consumerLat = booking?['consumer_lat'] as double?;
                                final consumerLng = booking?['consumer_lng'] as double?;
                                final providerLat = booking?['provider_live_lat'] as double?;
                                final providerLng = booking?['provider_live_lng'] as double?;
                                Navigator.pushNamed(context, '/provider_job_map', arguments: {
                                  'title': 'Live Map',
                                  'bookingId': widget.bookingId,
                                  'consumerLat': consumerLat,
                                  'consumerLng': consumerLng,
                                  'providerLat': providerLat,
                                  'providerLng': providerLng,
                                  'readonly': true,
                                });
                              },
                              icon: const Icon(Icons.map_rounded, color: Colors.white),
                              label: const Text(
                                'View Provider Location',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ] else if (status == 'completed') ...[
                          Container(
                            width: double.infinity,
                            height: 56,
                            decoration: BoxDecoration(
                              gradient: const LinearGradient(
                                colors: [Color(0xFF43e97b), Color(0xFF38f9d7)],
                              ),
                              borderRadius: BorderRadius.circular(15),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF43e97b).withOpacity(0.3),
                                  blurRadius: 15,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: ElevatedButton(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.transparent,
                                shadowColor: Colors.transparent,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                              ),
                              onPressed: () => Navigator.pop(context),
                              child: const Text(
                                'Done',
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ),
                        ],
                        
                        const SizedBox(height: 20),
                      ],
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProgressSteps(String status) {
    final steps = ['requested', 'accepted', 'on_the_way', 'arrived', 'started', 'completed'];
    // Treat auto_assigned as accepted for progress display
    final displayStatus = status == 'auto_assigned' ? 'accepted' : status;
    final currentIndex = steps.indexOf(displayStatus);

    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFFF7FAFC),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Column(
        children: [
          const Text(
            'Progress',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Color(0xFF2D3748),
            ),
          ),
          const SizedBox(height: 20),
          Row(
            children: steps.asMap().entries.map((entry) {
              final index = entry.key;
              final isActive = index <= (currentIndex < 0 ? 0 : currentIndex);
              final isLast = index == steps.length - 1;

              return Expanded(
                child: Row(
                  children: [
                    Container(
                      width: 30,
                      height: 30,
                      decoration: BoxDecoration(
                        color: isActive ? const Color(0xFFFFD600) : Colors.grey[300],
                        borderRadius: BorderRadius.circular(15),
                      ),
                      child: Icon(
                        isActive ? Icons.check_rounded : Icons.circle,
                        color: isActive ? Colors.black : Colors.white,
                        size: 16,
                      ),
                    ),
                    if (!isLast)
                      Expanded(
                        child: Container(
                          height: 2,
                          color: isActive ? const Color(0xFFFFD600) : Colors.grey[300],
                        ),
                      ),
                  ],
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          const Wrap(
            alignment: WrapAlignment.spaceBetween,
            children: [
              Text('Requested', style: TextStyle(fontSize: 12, color: Color(0xFF4A5568))),
              Text('Accepted', style: TextStyle(fontSize: 12, color: Color(0xFF4A5568))),
              Text('On the way', style: TextStyle(fontSize: 12, color: Color(0xFF4A5568))),
              Text('Arrived', style: TextStyle(fontSize: 12, color: Color(0xFF4A5568))),
              Text('Started', style: TextStyle(fontSize: 12, color: Color(0xFF4A5568))),
              Text('Completed', style: TextStyle(fontSize: 12, color: Color(0xFF4A5568))),
            ],
          ),
        ],
      ),
    );
  }

  LinearGradient _getStatusGradient(String status) {
    switch (status) {
      case 'requested':
        return const LinearGradient(colors: [Color(0xFFFFD600), Color(0xFFFFC1E3)]);
      case 'accepted':
      case 'auto_assigned':
        return const LinearGradient(colors: [Color(0xFFFFC1E3), Color(0xFFFFD600)]);
      case 'on_the_way':
        return const LinearGradient(colors: [Color(0xFFFFD600), Color(0xFF000000)]);
      case 'arrived':
        return const LinearGradient(colors: [Color(0xFFFFC1E3), Color(0xFF000000)]);
      case 'started':
        return const LinearGradient(colors: [Color(0xFFFFD600), Color(0xFFFFC1E3)]);
      case 'completed':
        return const LinearGradient(colors: [Color(0xFF43e97b), Color(0xFF38f9d7)]);
      default:
        return const LinearGradient(colors: [Color(0xFF9CA3AF), Color(0xFF6B7280)]);
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'requested':
        return const Color(0xFFFFD600);
      case 'accepted':
      case 'auto_assigned':
        return const Color(0xFFFFC1E3);
      case 'on_the_way':
        return const Color(0xFFFFD600);
      case 'arrived':
        return const Color(0xFFFFC1E3);
      case 'started':
        return const Color(0xFFFFD600);
      case 'completed':
        return const Color(0xFF43e97b);
      default:
        return const Color(0xFF9CA3AF);
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'requested':
        return Icons.access_time_rounded;
      case 'accepted':
        return Icons.check_circle_rounded;
      case 'auto_assigned':
        return Icons.auto_awesome_rounded;
      case 'on_the_way':
        return Icons.directions_walk_rounded;
      case 'arrived':
        return Icons.place_rounded;
      case 'started':
        return Icons.build_rounded;
      case 'completed':
        return Icons.done_all_rounded;
      default:
        return Icons.help_rounded;
    }
  }

  String _getStatusTitle(String status) {
    switch (status) {
      case 'requested':
        return 'Request Sent!';
      case 'accepted':
        return 'Request Accepted!';
      case 'auto_assigned':
        return 'Auto-Assigned!';
      case 'on_the_way':
        return 'Provider is on the way';
      case 'arrived':
        return 'Provider has arrived';
      case 'started':
        return 'Work started';
      case 'completed':
        return 'Service Completed!';
      default:
        return 'Unknown Status';
    }
  }

  String _getStatusDescription(String status) {
    switch (status) {
      case 'requested':
        return 'Waiting for a provider to accept your request.\nThis usually takes a few minutes.';
      case 'accepted':
        return 'Great! A provider has accepted your request.\nThey will contact you soon.';
      case 'auto_assigned':
        return 'Funding complete! We\'ve automatically assigned\nthe best-rated provider to your request.';
      case 'on_the_way':
        return 'Your provider is en route to your location.';
      case 'arrived':
        return 'Your provider has arrived at your location.';
      case 'started':
        return 'The work has started.';
      case 'completed':
        return 'Your service has been completed successfully.\nThank you for using Hackademia!';
      default:
        return 'Please wait while we update your request status.';
    }
  }
}

class _RatingResult {
  final int stars;
  final String? comment;
  _RatingResult(this.stars, this.comment);
}

class _RatingDialog extends StatefulWidget {
  @override
  State<_RatingDialog> createState() => _RatingDialogState();
}

class _RatingDialogState extends State<_RatingDialog> {
  int _stars = 5;
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Rate your service'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) {
              final idx = i + 1;
              return IconButton(
                icon: Icon(idx <= _stars ? Icons.star : Icons.star_border, color: Colors.amber),
                onPressed: () => setState(() => _stars = idx),
              );
            }),
          ),
          TextField(
            controller: _controller,
            decoration: const InputDecoration(
              hintText: 'Leave a comment (optional)'
            ),
            maxLines: 3,
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Later'),
        ),
        ElevatedButton(
          onPressed: () => Navigator.pop(context, _RatingResult(_stars, _controller.text.trim())),
          child: const Text('Submit'),
        )
      ],
    );
  }
}