import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:location/location.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import '../../state/booking_state.dart';
import '../../services/booking_service.dart';
import '../../services/provider_service.dart';

class ProviderDashboard extends StatefulWidget {
  const ProviderDashboard({super.key});

  @override
  State<ProviderDashboard> createState() => _ProviderDashboardState();
}

class _ProviderDashboardState extends State<ProviderDashboard> {
  final bookingService = BookingService();
  final providerService = ProviderService();
  bool _loading = false;
  String? _error;

  // Availability state
  bool _available = true;
  int? _providerId;

  // Polling for incoming requests to show popups
  Timer? _timer;
  final Set<int> _knownRequestIds = {};

  // Live location streaming
  final Location _location = Location();
  StreamSubscription<LocationData>? _locationSub;
  int? _locationBookingId;
  LatLng? _currentLatLng;

  Future<void> _loadAvailability() async {
    try {
      final me = await providerService.getMyProvider();
      setState(() {
        _available = (me['active'] ?? true) as bool;
        _providerId = me['id'] as int;
      });
    } catch (e) {
      print('Error loading provider profile: $e');
      // If provider profile doesn't exist, show error
      setState(() {
        _error = 'Provider profile not found. Please complete your profile setup.';
      });
    }
  }

  Future<void> _toggleAvailability(bool v) async {
    setState(() => _available = v);
    if (_providerId == null) return;
    try {
      await providerService.updateProviderProfile(_providerId!, {'active': v});
    } catch (e) {
      setState(() => _available = !v);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to update availability: $e')),
      );
    }
  }

  Future<void> _refresh() async {
    setState(() { _loading = true; _error = null; });
    try {
      await Provider.of<BookingState>(context, listen: false).fetchBookings();
    } catch (e) {
      _error = e.toString();
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<Map<String, dynamic>?> _promptOffer(Map<String, dynamic> booking) async {
    final category = (booking['service_category'] ?? '').toString().toLowerCase();
    // Estimate distance if we can
    double? consumerLat = (booking['consumer_lat'] as num?)?.toDouble();
    double? consumerLng = (booking['consumer_lng'] as num?)?.toDouble();

    // Try to get current provider location for better estimate
    try {
      final loc = await _location.getLocation();
      _currentLatLng = LatLng(loc.latitude ?? 0, loc.longitude ?? 0);
    } catch (_) {}

    double? km;
    if (_currentLatLng != null && consumerLat != null && consumerLng != null) {
      km = Distance().as(LengthUnit.Kilometer,
        LatLng(_currentLatLng!.latitude, _currentLatLng!.longitude),
        LatLng(consumerLat, consumerLng),
      );
    }

    // Heuristics for realistic ETA and price in INR
    // ETA: assume avg 25 km/h => minutes = km/25*60, clamp 10..60
    int defaultEta = 15;
    if (km != null && km > 0) {
      defaultEta = (km / 25.0 * 60.0).ceil().clamp(10, 60);
    }

    // Base price by category
    double base = 300; // general
    if (category.contains('plumb')) base = 450;
    else if (category.contains('electric')) base = 450;
    else if (category.contains('clean')) base = 300;
    else if (category.contains('cook')) base = 300;
    else if (category.contains('elder') || category.contains('baby')) base = 350;
    else if (category.contains('tutor')) base = 400;
    else if (category.contains('carp') || category.contains('paint')) base = 400;

    // Distance component: 50 INR per km beyond first 2 km
    double distanceFee = 0;
    if (km != null && km > 2) distanceFee = (km - 2) * 50.0;
    double suggested = (base + distanceFee).clamp(250.0, 5000.0);

    final etaCtrl = TextEditingController(text: defaultEta.toString());
    final priceCtrl = TextEditingController(text: suggested.toStringAsFixed(0));

    return await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) {
        return AlertDialog(
          title: const Text('Confirm Offer'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: etaCtrl,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'ETA (minutes)',
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: priceCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(
                  labelText: 'Price (INR)',
                  prefixText: '₹ ',
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                final eta = int.tryParse(etaCtrl.text.trim());
                final price = double.tryParse(priceCtrl.text.trim());
                if (eta == null || eta <= 0 || price == null || price <= 0) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Enter valid ETA and price')),
                  );
                  return;
                }
                Navigator.pop(context, {
                  'eta_minutes': eta,
                  'price_amount': price,
                  'price_currency': 'INR',
                });
              },
              child: const Text('Send Offer'),
            ),
          ],
        );
      },
    );
  }

  Future<void> _acceptWithOffer(Map<String, dynamic> booking) async {
    final offer = await _promptOffer(booking);
    if (offer == null) return; // user cancelled
    final bookingId = booking['id'] as int;
    setState(() { _loading = true; _error = null; });
    try {
      final payload = {
        'status': 'accepted',
        'eta_minutes': offer['eta_minutes'],
        'price_amount': offer['price_amount'],
        'price_currency': offer['price_currency'],
      };
      await bookingService.updateBookingStatus(bookingId, payload);
      await _refresh();
      _startLocationStreaming(bookingId);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _decline(int bookingId) async {
    setState(() { _loading = true; _error = null; });
    try {
      await bookingService.updateBookingStatus(bookingId, {'status': 'declined'});
      await _refresh();
      _stopLocationStreaming();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _updateStatus(int bookingId, String status) async {
    setState(() { _loading = true; _error = null; });
    try {
      await bookingService.updateBookingStatus(bookingId, {'status': status});
      await _refresh();
      if (status == 'started' || status == 'on_the_way') {
        _startLocationStreaming(bookingId);
      }
      if (status == 'completed' || status == 'canceled') {
        _stopLocationStreaming();
      }
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  void _checkForNewRequests(List<dynamic> requested) {
    for (final r in requested) {
      final id = r['id'] as int;
      if (!_knownRequestIds.contains(id)) {
        _knownRequestIds.add(id);
        // Show popup
        showDialog(
          context: context,
          builder: (_) {
            return AlertDialog(
              backgroundColor: Theme.of(context).colorScheme.surface,
              title: const Text('New Request', style: TextStyle(color: Colors.white)),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Type: ${r['service_category'] ?? 'General'}', style: const TextStyle(color: Colors.white70)),
                  const SizedBox(height: 8),
                  Text('Notes: ${r['notes'] ?? '-'}', style: const TextStyle(color: Colors.white70)),
                  if (r['consumer_lat'] != null && r['consumer_lng'] != null) ...[
                    const SizedBox(height: 8),
                    const Text('Location shared', style: TextStyle(color: Colors.white54)),
                  ]
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () { Navigator.pop(context); _decline(id); },
                  child: const Text('Decline'),
                ),
                ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(context);
                    final m = r as Map<String, dynamic>;
                    await _acceptWithOffer(m);
                    try {
                      Navigator.pushNamed(context, '/provider_job_map', arguments: {
                        'title': 'Job #${m['id']} Map',
                        'bookingId': m['id'],
                        'consumerLat': (m['consumer_lat'] as num?)?.toDouble(),
                        'consumerLng': (m['consumer_lng'] as num?)?.toDouble(),
                        'readonly': false,
                      });
                    } catch (_) {}
                  },
                  child: const Text('Accept'),
                ),
              ],
            );
          },
        );
      }
    }
  }

  @override
  void initState() {
    super.initState();
    _loadAvailability();
    _refresh();
    _timer = Timer.periodic(const Duration(seconds: 4), (_) async {
      if (!mounted) return;
      await _refresh();
      final state = Provider.of<BookingState>(context, listen: false);
      final requested = state.bookings.where((b) => b['status'] == 'requested').toList();
      _checkForNewRequests(requested);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _stopLocationStreaming();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final bookingState = Provider.of<BookingState>(context);
    final requested = bookingState.bookings.where((b) => b['status'] == 'requested').toList();
    final accepted = bookingState.bookings.where((b) => b['status'] == 'accepted' || b['status'] == 'on_the_way' || b['status'] == 'arrived' || b['status'] == 'started').toList();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Provider Dashboard'),
        actions: [
          IconButton(
            onPressed: () => Navigator.pushNamed(context, '/profile'),
            icon: const Icon(Icons.person_rounded),
            tooltip: 'My Profile',
          ),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'toggle_availability') {
                _toggleAvailability(!_available);
              } else if (value == 'refresh') {
                _refresh();
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem<String>(
                value: 'toggle_availability',
                child: Row(
                  children: [
                    Icon(_available ? Icons.toggle_on : Icons.toggle_off),
                    const SizedBox(width: 8),
                    Text(_available ? 'Go Offline' : 'Go Online'),
                  ],
                ),
              ),
              const PopupMenuItem<String>(
                value: 'refresh',
                child: Row(
                  children: [
                    Icon(Icons.refresh),
                    SizedBox(width: 8),
                    Text('Refresh'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: SafeArea(
        child: Column(children: [
          if (_loading) const LinearProgressIndicator(),
          if (_error != null) 
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.red.withOpacity(0.1),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.red.withOpacity(0.3)),
              ),
              child: Text(
                _error!, 
                style: const TextStyle(color: Colors.red),
                maxLines: 3,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _refresh,
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                children: [
                  if (requested.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.fromLTRB(8, 12, 8, 8),
                      child: Text(
                        'Incoming Requests', 
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontSize: 20,
                        ),
                      ),
                    ),
                    ...requested.map((rb) => _requestCard(context, rb as Map<String, dynamic>)).toList(),
                  ],
                  if (accepted.isNotEmpty) ...[
                    Padding(
                      padding: const EdgeInsets.fromLTRB(8, 16, 8, 8),
                      child: Text(
                        'Active Jobs', 
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                          fontSize: 20,
                        ),
                      ),
                    ),
                    ...accepted.map((ab) => _activeJobCard(context, ab as Map<String, dynamic>)).toList(),
                  ],
                  if (requested.isEmpty && accepted.isEmpty && _error == null)
                    Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        children: [
                          Icon(
                            Icons.work_outline,
                            size: 64,
                            color: Colors.grey.withOpacity(0.5),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'No bookings yet',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: Colors.grey,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'New requests will appear here',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey,
                            ),
                          ),
                        ],
                      ),
                    ),
                  if (_error != null && _error!.contains('Provider profile not found'))
                    Padding(
                      padding: const EdgeInsets.all(32),
                      child: Column(
                        children: [
                          Icon(
                            Icons.person_add_outlined,
                            size: 64,
                            color: Colors.orange.withOpacity(0.7),
                          ),
                          const SizedBox(height: 16),
                          Text(
                            'Complete Your Profile',
                            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                              color: Colors.orange,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            'Set up your provider profile to start receiving booking requests',
                            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.grey,
                            ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton.icon(
                            onPressed: () {
                              Navigator.pushNamed(context, '/provider_profile');
                            },
                            icon: const Icon(Icons.edit),
                            label: const Text('Setup Profile'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            ),
                          ),
                        ],
                      ),
                    ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
          )
        ]),
      ),
    );
  }

  Widget _requestCard(BuildContext context, Map<String, dynamic> b) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Request #${b['id']}', 
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.white10),
                ),
                child: Text(
                  (b['service_category'] ?? 'General').toString(),
                  style: const TextStyle(
                    color: Color(0xFFFFD600), 
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.description_rounded, size: 16, color: Colors.white70),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  b['notes'] ?? 'No additional notes',
                  style: Theme.of(context).textTheme.bodySmall,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          if (b['consumer_lat'] != null && b['consumer_lng'] != null) ...[
            const SizedBox(height: 8),
            Row(children: [
              const Icon(Icons.location_on_rounded, size: 16, color: Color(0xFFFFC1E3)),
              const SizedBox(width: 8),
              Text(
                'Location shared', 
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: const Color(0xFFFFC1E3),
                ),
              ),
            ]),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: () => _acceptWithOffer(b), 
                  style: ElevatedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('Accept'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: () => _decline(b['id'] as int), 
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  child: const Text('Decline'),
                ),
              ),
            ],
          )
        ],
      ),
    );
  }

  Widget _activeJobCard(BuildContext context, Map<String, dynamic> b) {
    final hasCoords = b['consumer_lat'] != null && b['consumer_lng'] != null;

    // Ensure streaming is on for active bookings to keep consumer updated
    // Only start if current booking is not the same as already streaming
    if ((b['status'] == 'accepted' || b['status'] == 'on_the_way' || b['status'] == 'arrived' || b['status'] == 'started')) {
      if (_locationBookingId != b['id']) {
        _startLocationStreaming(b['id'] as int);
      }
    }

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).colorScheme.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  'Booking #${b['id']}', 
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                    fontWeight: FontWeight.bold,
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              if (hasCoords) ...[
                const SizedBox(width: 8),
                TextButton.icon(
                  onPressed: () {
                    Navigator.pushNamed(context, '/map', arguments: {
                      'lat': b['consumer_lat'] as double?,
                      'lng': b['consumer_lng'] as double?,
                      'title': 'Customer Location',
                    });
                  },
                  icon: const Icon(Icons.map_rounded, color: Color(0xFFFFC1E3), size: 18),
                  label: const Text(
                    'Map',
                    style: TextStyle(fontSize: 12),
                  ),
                  style: TextButton.styleFrom(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.description_rounded, size: 16, color: Colors.white70),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  b['notes'] ?? 'No additional notes',
                  style: Theme.of(context).textTheme.bodySmall,
                  maxLines: 3,
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          if (hasCoords || _currentLatLng != null) ...[
            const SizedBox(height: 12),
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                height: 160,
                child: FlutterMap(
                  options: MapOptions(
                    center: _currentLatLng ?? LatLng(
                      (b['consumer_lat'] as double?) ?? 0,
                      (b['consumer_lng'] as double?) ?? 0,
                    ),
                    zoom: 14,
                    interactiveFlags: InteractiveFlag.none, // preview only
                  ),
                  children: [
                    TileLayer(
                      urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                      subdomains: const ['a', 'b', 'c'],
                      userAgentPackageName: 'com.urbifix.app',
                    ),
                    MarkerLayer(
                      markers: [
                        if (_currentLatLng != null)
                          Marker(
                            width: 36,
                            height: 36,
                            point: _currentLatLng!,
                            builder: (context) => const _ProviderDot(),
                          ),
                        if (hasCoords)
                          Marker(
                            width: 44,
                            height: 44,
                            point: LatLng(b['consumer_lat'] as double, b['consumer_lng'] as double),
                            builder: (context) => const _ConsumerDot(),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: Wrap(
                  spacing: 6,
                  runSpacing: 6,
                  children: [
                    _buildStatusButton('On the way', () => _updateStatus(b['id'] as int, 'on_the_way')),
                    _buildStatusButton('Arrived', () => _updateStatus(b['id'] as int, 'arrived')),
                    _buildStatusButton('Started', () => _updateStatus(b['id'] as int, 'started')),
                    _buildStatusButton('Completed', () => _updateStatus(b['id'] as int, 'completed')),
                    OutlinedButton.icon(
                      onPressed: () => _updateStatus(b['id'] as int, 'canceled'),
                      style: OutlinedButton.styleFrom(
                        foregroundColor: Colors.red,
                        side: const BorderSide(color: Colors.red),
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        minimumSize: Size.zero,
                        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                      ),
                      icon: const Icon(Icons.cancel, size: 16),
                      label: const Text('Cancel', style: TextStyle(fontSize: 12)),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              if (hasCoords || _currentLatLng != null)
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.pushNamed(
                      context,
                      '/provider_job_map',
                      arguments: {
                        'title': 'Job #${b['id']} Map',
                        'bookingId': b['id'], // Pass bookingId so map can update status/location
                        'consumerLat': b['consumer_lat'] as double?,
                        'consumerLng': b['consumer_lng'] as double?,
                        'providerLat': _currentLatLng?.latitude,
                        'providerLng': _currentLatLng?.longitude,
                      },
                    );
                  },
                  icon: const Icon(Icons.fullscreen_rounded, size: 18),
                  label: const Text('Full Map'),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStatusButton(String text, VoidCallback onPressed) {
    return ElevatedButton(
      onPressed: onPressed,
      style: ElevatedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        minimumSize: Size.zero,
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
      ),
      child: Text(
        text,
        style: const TextStyle(fontSize: 12),
      ),
    );
  }

  // Location streaming helpers
  Future<void> _startLocationStreaming(int bookingId) async {
    try {
      // If already streaming for a different booking, stop first
      if (_locationSub != null && _locationBookingId != bookingId) {
        await _locationSub?.cancel();
        _locationSub = null;
      }

      // Request permissions if needed
      bool serviceEnabled = await _location.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await _location.requestService();
        if (!serviceEnabled) return;
      }
      PermissionStatus permissionGranted = await _location.hasPermission();
      if (permissionGranted == PermissionStatus.denied) {
        permissionGranted = await _location.requestPermission();
        if (permissionGranted != PermissionStatus.granted) return;
      }

      _location.changeSettings(
        accuracy: LocationAccuracy.high,
        interval: 5000, // 5s
        distanceFilter: 10, // meters
      );

      _locationBookingId = bookingId;
      _locationSub ??= _location.onLocationChanged.listen((loc) async {
        final lat = loc.latitude;
        final lng = loc.longitude;
        if (lat == null || lng == null) return;
        // Update local state for map preview
        if (mounted) {
          setState(() {
            _currentLatLng = LatLng(lat, lng);
          });
        }
        try {
          await bookingService.updateProviderLocation(bookingId, lat: lat, lng: lng);
        } catch (e) {
          // Ignore transient network errors
        }
      });
    } catch (e) {
      // Silently ignore to avoid breaking UI
    }
  }

  Future<void> _stopLocationStreaming() async {
    try {
      await _locationSub?.cancel();
    } catch (_) {}
    _locationSub = null;
    _locationBookingId = null;
  }
}

class _ProviderDot extends StatelessWidget {
  const _ProviderDot();
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
        child: Icon(Icons.directions_walk_rounded, size: 18, color: Colors.black),
      ),
    );
  }
}

class _ConsumerDot extends StatelessWidget {
  const _ConsumerDot();
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
        child: Icon(Icons.person_pin_circle_rounded, size: 18, color: Colors.black),
      ),
    );
  }
}