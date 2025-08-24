import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../state/provider_state.dart';
import '../../utils/location_helper.dart' as loc;
import '../../services/booking_service.dart';
import '../../config/theme.dart';

class ProviderListPage extends StatefulWidget {
  final String? preselectedCategory;
  final String? handoffNote; // optional note from negotiation handoff

  const ProviderListPage({super.key, this.preselectedCategory, this.handoffNote});

  @override
  State<ProviderListPage> createState() => _ProviderListPageState();
}

class _ProviderListPageState extends State<ProviderListPage> {
  final categories = const [
    'Cleaning',
    'Plumbing',
    'Electrical',
    'Cooking',
    'Gardening',
    'Babysitting',
    'Elderly Care',
    'Tutoring',
    'Pet Care',
    'Carpentry',
    'Painting',
  ];
  String? selectedCategory;
  // Removed free-text details to keep flow simple per requirement
  final bookingService = BookingService();

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Preselect category and carry handoff note if provided
    if (widget.preselectedCategory != null && selectedCategory == null) {
      setState(() {
        selectedCategory = widget.preselectedCategory;
      });
    }
  }
  double? _myLat;
  double? _myLng;
  final Set<int> _requestedProviderIds = {};

  Timer? _pollTimer;

  @override
  void initState() {
    super.initState();
    _load();
    _pollTimer = Timer.periodic(const Duration(seconds: 6), (_) {
      if (!mounted) return;
      _load(skill: selectedCategory?.toLowerCase());
    });
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    super.dispose();
  }

  Future<void> _load({String? skill}) async {
    final data = await loc.LocationHelper.getCurrentLocation();
    if (data == null) return;
    _myLat = data.latitude;
    _myLng = data.longitude;
    await Provider.of<ProviderState>(context, listen: false)
        .fetchNearbyProviders(
          data.latitude!,
          data.longitude!,
          skill: skill,
        );
    // Also sync requested state from existing bookings so the label persists
    await _syncRequestedFromBookings();
  }

  bool _isActiveStatus(String? status) {
    if (status == null) return false;
    switch (status) {
      case 'requested':
      case 'accepted':
      case 'on_the_way':
      case 'arrived':
      case 'started':
      case 'scheduled':
        return true;
      default:
        return false; // completed, canceled, declined, etc.
    }
  }

  Future<void> _syncRequestedFromBookings() async {
    try {
      final bookings = await bookingService.getBookings();
      final ids = <int>{};
      for (final b in bookings) {
        final pid = (b['provider_id'] as num?)?.toInt();
        final status = b['status'] as String?;
        if (pid != null && _isActiveStatus(status)) {
          ids.add(pid);
        }
      }
      if (mounted) {
        setState(() {
          _requestedProviderIds
            ..clear()
            ..addAll(ids);
        });
      }
    } catch (_) {
      // ignore sync failures silently
    }
  }

  Future<void> _book(Map<String, dynamic> provider) async {
    // Manual booking to a specific provider
    final pid = provider['id'] as int;
    setState(() {
      _requestedProviderIds.add(pid);
    });
    try {
      final data = await loc.LocationHelper.getCurrentLocation();
      final baseNote = 'Instant help request: ${selectedCategory ?? ''}';
      final note = [baseNote, if (widget.handoffNote?.isNotEmpty == true) widget.handoffNote].join('\n');
      final res = await bookingService.createBooking({
        'provider_id': pid,
        'service_category': selectedCategory,
        'notes': note,
        if (data != null) 'consumer_lat': data.latitude,
        if (data != null) 'consumer_lng': data.longitude,
      });
      if (!mounted) return;
      Navigator.pushNamed(context, '/booking_status', arguments: res['id']);
    } catch (e) {
      // Revert button state if booking fails
      setState(() {
        _requestedProviderIds.remove(pid);
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create booking: $e')),
      );
    }
  }

  Future<void> _autoBook() async {
    // Require a category selection
    if (selectedCategory == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select what you need help with')),
      );
      return;
    }

    // Auto-assign to any available provider matching the selected skill (backend filters by skill)
    final data = await loc.LocationHelper.getCurrentLocation();
    if (data == null || data.latitude == null || data.longitude == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Location permission required to auto-assign')),
      );
      return;
    }
    final note = 'Instant help request: ${selectedCategory ?? ''}';
    try {
      final res = await bookingService.createAutoBooking(
        consumerLat: data.latitude!,
        consumerLng: data.longitude!,
        serviceCategory: selectedCategory,
        notes: note,
        withinKm: 5.0,
      );
      if (!mounted) return;
      Navigator.pushNamed(context, '/booking_status', arguments: res['id']);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No providers available nearby or failed to create booking: $e')),
      );
    }
  }

  String _distanceLabel(Map<String, dynamic> p) {
    final plat = (p['lat'] as num?)?.toDouble();
    final plng = (p['lng'] as num?)?.toDouble();
    if (_myLat == null || _myLng == null || plat == null || plng == null) return 'Nearby';
    final d = _haversineKm(_myLat!, _myLng!, plat, plng);
    final km = d.toStringAsFixed(1);
    final etaMin = ((d / 30.0) * 60).ceil(); // assume 30 km/h avg city speed
    return '${km} km • ~${etaMin} min';
  }

  double _haversineKm(double lat1, double lon1, double lat2, double lon2) {
    const R = 6371.0; // km
    final dLat = _deg2rad(lat2 - lat1);
    final dLon = _deg2rad(lon2 - lon1);
    final a =
        math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(_deg2rad(lat1)) * math.cos(_deg2rad(lat2)) *
        math.sin(dLon / 2) * math.sin(dLon / 2);
    final c = 2 * math.asin(math.sqrt(a));
    return R * c;
  }

  double _deg2rad(double deg) => deg * (math.pi / 180.0);

  @override
  Widget build(BuildContext context) {
    final state = Provider.of<ProviderState>(context);

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
                    const Expanded(
                      child: Text(
                        'Find Nearby Helpers',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.2),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.location_on_rounded,
                        color: Colors.white,
                        size: 20,
                      ),
                    ),
                  ],
                ),
              ),
              
              // Categories + Details Section (wrapped to avoid overflow)
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: SingleChildScrollView(
                  scrollDirection: Axis.vertical,
                  physics: const BouncingScrollPhysics(),
                  child: Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white.withOpacity(0.2)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'What do you need help with?',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          height: 40,
                          child: ListView.separated(
                            scrollDirection: Axis.horizontal,
                            itemBuilder: (_, i) => _buildCategoryChip(categories[i]),
                            separatorBuilder: (_, __) => const SizedBox(width: 8),
                            itemCount: categories.length,
                          ),
                        ),
                        const SizedBox(height: 12),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton.icon(
                            onPressed: _autoBook,
                            icon: const Icon(Icons.flash_on_rounded),
                            label: const Text('Request nearest helper'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.yellow,
                              foregroundColor: Colors.black,
                              padding: const EdgeInsets.symmetric(vertical: 14),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              
              const SizedBox(height: 20),
              
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
                  child: Column(
                    children: [
                      if (state.isLoading)
                        Container(
                          margin: const EdgeInsets.all(20),
                          child: const LinearProgressIndicator(
                            backgroundColor: Colors.white24,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.yellow),
                          ),
                        ),
                      
                      Expanded(
                        child: RefreshIndicator(
                          onRefresh: () => _load(skill: selectedCategory?.toLowerCase()),
                          child: state.providers.isEmpty && !state.isLoading
                              ? _buildEmptyState()
                              : ListView.builder(
                                  padding: const EdgeInsets.all(20),
                                  itemCount: state.providers.length,
                                  itemBuilder: (context, index) {
                                    // Sort by distance if we have user location
                                    final list = List<Map<String, dynamic>>.from(state.providers.cast<Map<String, dynamic>>());
                                    if (_myLat != null && _myLng != null) {
                                      list.sort((a, b) {
                                        final da = _haversineKm(
                                          _myLat!, _myLng!,
                                          (a['lat'] as num?)?.toDouble() ?? 0.0,
                                          (a['lng'] as num?)?.toDouble() ?? 0.0,
                                        );
                                        final db = _haversineKm(
                                          _myLat!, _myLng!,
                                          (b['lat'] as num?)?.toDouble() ?? 0.0,
                                          (b['lng'] as num?)?.toDouble() ?? 0.0,
                                        );
                                        return da.compareTo(db);
                                      });
                                    }
                                    final p = list[index];
                                    return _buildProviderCard(p, index);
                                  },
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildCategoryChip(String category) {
    final isSelected = selectedCategory == category;
    return GestureDetector(
      onTap: () {
        setState(() => selectedCategory = isSelected ? null : category);
        _load(skill: isSelected ? null : category.toLowerCase());
      },
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? AppColors.yellow : Colors.white.withOpacity(0.1),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? Colors.transparent : Colors.white24,
          ),
        ),
        child: Text(
          category,
          style: TextStyle(
            color: isSelected ? Colors.black : Colors.white,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            fontSize: 14,
          ),
        ),
      ),
    );
  }

  Widget _buildProviderCard(Map<String, dynamic> provider, int index) {
    return TweenAnimationBuilder<double>(
      duration: Duration(milliseconds: 300 + (index * 100)),
      tween: Tween(begin: 0.0, end: 1.0),
      builder: (context, value, child) {
        return Transform.translate(
          offset: Offset(0, 50 * (1 - value)),
          child: Opacity(
            opacity: value,
            child: Container(
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.05),
                    blurRadius: 15,
                    offset: const Offset(0, 5),
                  ),
                ],
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Avatar
                      Container(
                        width: 60,
                        height: 60,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(colors: [AppColors.yellow, AppColors.lightPink]),
                          borderRadius: BorderRadius.circular(15),
                        ),
                        child: const Icon(Icons.person_rounded, color: Colors.white, size: 30),
                      ),
                      const SizedBox(width: 16),
                      // Info
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              (provider['display_name'] as String?) ?? 'Helper #${provider['id']}',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF2D3748),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Skills: ${provider['skills'] ?? 'General Help'}',
                              style: const TextStyle(
                                fontSize: 14,
                                color: Color(0xFF4A5568),
                              ),
                              maxLines: 3,
                              overflow: TextOverflow.ellipsis,
                              softWrap: true,
                            ),
                            const SizedBox(height: 8),
                            Wrap(
                              alignment: WrapAlignment.start,
                              crossAxisAlignment: WrapCrossAlignment.center,
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                const Icon(Icons.star_rounded, color: AppColors.yellow, size: 16),
                                Text(
                                  (((provider['rating'] as num?)?.toDouble() ?? 0.0).toStringAsFixed(1)),
                                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.white70),
                                ),
                                Text(
                                  '(${(provider['jobs_done'] ?? 0)} jobs)',
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF6B7280)),
                                ),
                                const Icon(Icons.location_on_rounded, color: AppColors.lightPink, size: 16),
                                Text(
                                  _distanceLabel(provider),
                                  style: const TextStyle(fontSize: 12, color: Color(0xFF4A5568)),
                                  overflow: TextOverflow.ellipsis,
                                  softWrap: true,
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      // Negotiate button (always enabled)
                      SizedBox(
                        width: 130,
                        child: OutlinedButton.icon(
                          onPressed: () {
                            final pid = (provider['id'] as num?)?.toInt();
                            final name = (provider['display_name'] as String?) ?? 'Service';
                            Navigator.pushNamed(
                              context,
                              '/negotiation',
                              arguments: {
                                'productId': pid ?? 0,
                                'productName': name,
                                'listPrice': 1000, // demo defaults; adjust if you have provider pricing
                                'minPrice': 700,
                                'intelligent': true,
                                'providerId': pid,
                                'serviceCategory': selectedCategory?.toLowerCase(),
                              },
                            );
                          },
                          icon: const Icon(Icons.price_change_rounded, size: 18),
                          label: const FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text('Negotiate', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                          ),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                            side: const BorderSide(color: AppColors.lightPink),
                            foregroundColor: AppColors.lightPink,
                          ),
                        ),
                      ),
                      const Spacer(),
                      SizedBox(
                        width: 120,
                        child: Builder(
                          builder: (context) {
                            final pid = provider['id'] as int?;
                            final isRequested = pid != null && _requestedProviderIds.contains(pid);
                            if (isRequested) {
                              // Show a clear, visible disabled state when already requested
                              return ElevatedButton.icon(
                                onPressed: null,
                                icon: const Icon(Icons.check_circle_rounded, size: 18),
                                label: const Text(
                                  'Requested',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                                style: ElevatedButton.styleFrom(
                                  disabledBackgroundColor: AppColors.lightPink.withOpacity(0.25),
                                  disabledForegroundColor: AppColors.lightPink,
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                                  elevation: 0,
                                ),
                              );
                            }
                            return ElevatedButton(
                              onPressed: () => _book(provider),
                              style: ElevatedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(15)),
                                backgroundColor: AppColors.yellow,
                                foregroundColor: Colors.black,
                                elevation: 4,
                              ),
                              child: const FittedBox(
                                fit: BoxFit.scaleDown,
                                child: Text(
                                  'Request',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.charcoal,
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Icon(
              Icons.search_off_rounded,
              size: 60,
              color: Colors.white54,
            ),
          ),
          const SizedBox(height: 20),
          const Text(
            'No helpers found',
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.white,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Try selecting a different category or\ncheck your location settings',
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: 14,
              color: Colors.white70,
            ),
          ),
        ],
      ),
    );
  }
}
