import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:location/location.dart';
import '../../services/booking_service.dart';

class ProviderJobMapPage extends StatefulWidget {
  const ProviderJobMapPage({super.key});

  @override
  State<ProviderJobMapPage> createState() => _ProviderJobMapPageState();
}

class _ProviderJobMapPageState extends State<ProviderJobMapPage> {
  final MapController _mapController = MapController();
  final Location _location = Location();
  StreamSubscription<LocationData>? _sub;
  LatLng? _liveProvider;
  final bookingService = BookingService();
  late final double? _initialConsumerLat;
  late final double? _initialConsumerLng;
  late final String _title;
  bool _readonly = false;
  int? _bookingId;
  Map<String, dynamic>? _booking;
  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    // Delay initialization to access ModalRoute arguments safely
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
      _bookingId = args?['bookingId'] as int?;
      _initialConsumerLat = args?['consumerLat'] as double?;
      _initialConsumerLng = args?['consumerLng'] as double?;
      _title = (args?['title'] as String?) ?? 'Job Map';
      _readonly = (args?['readonly'] as bool?) ?? false;
      final double? pLat = args?['providerLat'] as double?;
      final double? pLng = args?['providerLng'] as double?;
      if (pLat != null && pLng != null) {
        setState(() { _liveProvider = LatLng(pLat, pLng); });
      }
      _startPolling();
      if (!_readonly) {
        _startListening();
      }
    });
  }

  Future<void> _startListening() async {
    try {
      bool enabled = await _location.serviceEnabled();
      if (!enabled) {
        enabled = await _location.requestService();
        if (!enabled) return;
      }
      var perm = await _location.hasPermission();
      if (perm == PermissionStatus.denied) {
        perm = await _location.requestPermission();
        if (perm != PermissionStatus.granted) return;
      }
      _sub = _location.onLocationChanged.listen((loc) async {
        final lat = loc.latitude; final lng = loc.longitude;
        if (lat == null || lng == null) return;
        if (!mounted) return;
        setState(() { _liveProvider = LatLng(lat, lng); });
        // Update backend with latest provider location for this booking
        if (!_readonly && _bookingId != null) {
          try { await bookingService.updateProviderLocation(_bookingId!, lat: lat, lng: lng); } catch (_) {}
        }
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _sub?.cancel();
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _updateStatus(String status) async {
    if (_bookingId == null) return;
    try {
      await bookingService.updateBookingStatus(_bookingId!, {'status': status});
      await _fetchBooking();
    } catch (_) {}
  }

  void _startPolling() {
    if (_bookingId == null) return;
    // Initial fetch
    _fetchBooking();
    _pollTimer?.cancel();
    _pollTimer = Timer.periodic(const Duration(seconds: 5), (_) => _fetchBooking());
  }

  Future<void> _fetchBooking() async {
    if (_bookingId == null) return;
    try {
      final b = await bookingService.getBookingById(_bookingId!);
      if (!mounted) return;
      setState(() {
        _booking = b;
        final pLat = (b['provider_live_lat'] as num?)?.toDouble();
        final pLng = (b['provider_live_lng'] as num?)?.toDouble();
        if (pLat != null && pLng != null) {
          _liveProvider = LatLng(pLat, pLng);
        }
      });
    } catch (_) {
      // ignore transient errors
    }
  }

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final double? consumerLat = _initialConsumerLat ?? args?['consumerLat'] as double?;
    final double? consumerLng = _initialConsumerLng ?? args?['consumerLng'] as double?;
    final String title = _title.isNotEmpty ? _title : (args?['title'] as String? ?? 'Job Map');
    final double? providerLat = _liveProvider?.latitude ?? args?['providerLat'] as double?;
    final double? providerLng = _liveProvider?.longitude ?? args?['providerLng'] as double?;

    // Fallback center: prefer provider, otherwise consumer, else a default
    LatLng center = LatLng(0, 0);
    if (providerLat != null && providerLng != null) {
      center = LatLng(providerLat, providerLng);
    } else if (consumerLat != null && consumerLng != null) {
      center = LatLng(consumerLat, consumerLng);
    }

    final status = (_booking?['status'] ?? '').toString();
    final eta = _booking?['eta_minutes'] as int?;
    final price = (_booking?['price_amount'] as num?)?.toDouble();
    final currency = (_booking?['price_currency'] as String?) ?? 'INR';
    double? km;
    if (providerLat != null && providerLng != null && consumerLat != null && consumerLng != null) {
      km = Distance().as(
        LengthUnit.Kilometer,
        LatLng(providerLat, providerLng),
        LatLng(consumerLat, consumerLng),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(title), actions: [
        if (!_readonly) PopupMenuButton<String>(
          onSelected: (v) => _updateStatus(v),
          itemBuilder: (_) => const [
            PopupMenuItem(value: 'on_the_way', child: Text('Mark on the way')),
            PopupMenuItem(value: 'arrived', child: Text('Mark arrived')),
            PopupMenuItem(value: 'started', child: Text('Mark started')),
            PopupMenuItem(value: 'completed', child: Text('Mark completed')),
            PopupMenuItem(value: 'canceled', child: Text('Cancel job')),
          ],
        ),
      ]),
      body: Stack(
        children: [
          FlutterMap(
            mapController: _mapController,
            options: MapOptions(
              center: center,
              zoom: 15,
              interactiveFlags: InteractiveFlag.pinchZoom | InteractiveFlag.drag | InteractiveFlag.doubleTapZoom,
            ),
            children: [
              TileLayer(
                urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                subdomains: const ['a', 'b', 'c'],
                userAgentPackageName: 'com.urbifix.app',
              ),
              MarkerLayer(
                markers: [
                  if (consumerLat != null && consumerLng != null)
                    Marker(
                      width: 44,
                      height: 44,
                      point: LatLng(consumerLat, consumerLng),
                      builder: (context) => _ConsumerMarker(),
                    ),
                  if (providerLat != null && providerLng != null)
                    Marker(
                      width: 36,
                      height: 36,
                      point: LatLng(providerLat, providerLng),
                      builder: (context) => _ProviderMarker(),
                    ),
                ],
              ),
            ],
          ),

          // Top status + details overlay
          Positioned(
            top: 12,
            left: 12,
            right: 12,
            child: Column(
              children: [
                // Top pill
                Material(
                  color: Colors.white,
                  elevation: 3,
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: _statusColor(status).withOpacity(0.15),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(children: [
                            Icon(_statusIcon(status), color: _statusColor(status), size: 18),
                            const SizedBox(width: 6),
                            Text(_statusLabel(status), style: TextStyle(color: _statusColor(status), fontWeight: FontWeight.w600)),
                          ]),
                        ),
                        const Spacer(),
                        if (eta != null) ...[
                          const Icon(Icons.schedule_rounded, size: 18),
                          const SizedBox(width: 4),
                          Text('$eta min'),
                          const SizedBox(width: 12),
                        ],
                        if (price != null) ...[
                          const Icon(Icons.currency_rupee_rounded, size: 18),
                          const SizedBox(width: 2),
                          Text('${price.toStringAsFixed(0)} $currency'),
                        ],
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                // Bottom sheet style full description
                Material(
                  color: Colors.white,
                  elevation: 3,
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.directions_walk_rounded, size: 18),
                            const SizedBox(width: 6),
                            Text(_statusDetailLine(status)),
                            const Spacer(),
                            if (km != null) Text('${km.toStringAsFixed(1)} km away'),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.schedule_rounded, size: 18),
                            const SizedBox(width: 6),
                            Text(eta != null ? 'ETA: $eta min' : 'ETA: --'),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            const Icon(Icons.currency_rupee_rounded, size: 18),
                            const SizedBox(width: 6),
                            Text(price != null ? 'Price: ${price.toStringAsFixed(0)} $currency' : 'Price: --'),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _arrivalWindowText(eta),
                          style: const TextStyle(color: Colors.black54),
                        ),
                        const SizedBox(height: 12),
                        if (!_readonly) Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: [
                            ElevatedButton(
                              onPressed: () => _updateStatus('on_the_way'),
                              child: const Text('On the way'),
                            ),
                            ElevatedButton(
                              onPressed: () => _updateStatus('arrived'),
                              child: const Text('Arrived'),
                            ),
                            ElevatedButton(
                              onPressed: () => _updateStatus('started'),
                              child: const Text('Started'),
                            ),
                            ElevatedButton(
                              onPressed: () => _updateStatus('completed'),
                              child: const Text('Completed'),
                            ),
                            OutlinedButton.icon(
                              onPressed: () => _updateStatus('canceled'),
                              icon: const Icon(Icons.cancel, size: 18, color: Colors.red),
                              label: const Text('Cancel'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.red,
                                side: const BorderSide(color: Colors.red),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
      floatingActionButton: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (!_readonly && providerLat != null && providerLng != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12.0),
              child: FloatingActionButton.extended(
                heroTag: 'recenterProvider',
                onPressed: () {
                  _mapController.move(LatLng(providerLat, providerLng), 16);
                },
                icon: const Icon(Icons.directions_walk_rounded, color: Colors.black),
                label: const Text('Me'),
              ),
            ),
          if (consumerLat != null && consumerLng != null)
            FloatingActionButton.extended(
              heroTag: 'recenterConsumer',
              onPressed: () {
                _mapController.move(LatLng(consumerLat, consumerLng), 16);
              },
              icon: const Icon(Icons.person_pin_circle_rounded, color: Colors.black),
              label: const Text('Customer'),
            ),
        ],
      ),
    );
  }
  Color _statusColor(String status) {
    switch (status) {
      case 'accepted':
      case 'on_the_way':
        return const Color(0xFF667eea);
      case 'arrived':
        return const Color(0xFFFFC1E3);
      case 'started':
        return const Color(0xFFFFD600);
      case 'completed':
        return const Color(0xFF43e97b);
      default:
        return Colors.grey;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case 'accepted':
      case 'on_the_way':
        return Icons.directions_walk_rounded;
      case 'arrived':
        return Icons.room_rounded;
      case 'started':
        return Icons.build_rounded;
      case 'completed':
        return Icons.done_all_rounded;
      default:
        return Icons.hourglass_bottom_rounded;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'accepted':
        return 'Accepted';
      case 'on_the_way':
        return 'On the way';
      case 'arrived':
        return 'Arrived';
      case 'started':
        return 'Started';
      case 'completed':
        return 'Completed';
      default:
        return 'Requested';
    }
  }

  String _statusDetailLine(String status) {
    switch (status) {
      case 'accepted':
        return 'Proceed to the customer';
      case 'on_the_way':
        return 'En route to the customer';
      case 'arrived':
        return 'Arrived at location. Meet the customer';
      case 'started':
        return 'Service in progress';
      case 'completed':
        return 'Job completed';
      default:
        return 'Awaiting acceptance';
    }
  }
  String _arrivalWindowText(int? eta) {
    if (eta == null || eta <= 0) return 'Arrival window unavailable';
    final now = DateTime.now();
    final start = now.add(const Duration(minutes: 0));
    final end = now.add(Duration(minutes: eta + 5));
    String two(int v) => v.toString().padLeft(2, '0');
    return 'Arriving around ${two(start.hour)}:${two(start.minute)} - ${two(end.hour)}:${two(end.minute)}';
  }
}

class _ProviderMarker extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFF00E5FF),
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.3),
            blurRadius: 6,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: const Center(
        child: Icon(Icons.directions_walk_rounded, size: 20, color: Colors.black),
      ),
    );
  }
}

class _ConsumerMarker extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFFFFD600),
        border: Border.all(color: const Color(0xFFFFC1E3), width: 3),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 6,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: const Center(
        child: Icon(Icons.person_pin_circle_rounded, size: 20, color: Colors.black),
      ),
    );
  }
}