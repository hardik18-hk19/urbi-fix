import 'package:flutter/material.dart';
import '../provider/provider_list_page.dart';
import '../bookings/forum_feed_page.dart';
import '../../services/booking_service.dart';
import '../../config/theme.dart';

class ConsumerDashboard extends StatefulWidget {
  const ConsumerDashboard({super.key});

  @override
  State<ConsumerDashboard> createState() => _ConsumerDashboardState();
}

class _ConsumerDashboardState extends State<ConsumerDashboard>
    with TickerProviderStateMixin {
  late AnimationController _animationController;
  late Animation<double> _fadeAnimation;
  late Animation<Offset> _slideAnimation;

  @override
  void initState() {
    super.initState();
    _animationController = AnimationController(
      duration: const Duration(milliseconds: 1000),
      vsync: this,
    );
    
    _fadeAnimation = Tween<double>(
      begin: 0.0,
      end: 1.0,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.easeInOut,
    ));
    
    _slideAnimation = Tween<Offset>(
      begin: const Offset(0, 0.2),
      end: Offset.zero,
    ).animate(CurvedAnimation(
      parent: _animationController,
      curve: Curves.elasticOut,
    ));
    
    _animationController.forward();
  }

  @override
  void dispose() {
    _animationController.dispose();
    super.dispose();
  }

  // Navigate to most recent active booking; if multiple, let user pick
  Future<void> _openCurrentBooking() async {
    try {
      final service = BookingService();
      final bookings = await service.getBookings();
      final active = <Map<String, dynamic>>[];
      for (final b in bookings) {
        final status = (b['status'] ?? '').toString();
        switch (status) {
          case 'requested':
          case 'accepted':
          case 'on_the_way':
          case 'arrived':
          case 'started':
          case 'scheduled':
            active.add(Map<String, dynamic>.from(b as Map));
            break;
          default:
            break;
        }
      }

      if (!mounted) return;

      if (active.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('No active bookings right now')),
        );
        return;
      }

      // Sort by id desc as a proxy for most recent
      active.sort((a, b) => ((b['id'] as num?)?.toInt() ?? 0).compareTo((a['id'] as num?)?.toInt() ?? 0));

      if (active.length == 1) {
        final id = (active.first['id'] as num).toInt();
        Navigator.pushNamed(context, '/booking_status', arguments: id);
        return;
      }

      // Multiple active bookings: let the user pick one
      final picked = await showModalBottomSheet<Map<String, dynamic>>(
        context: context,
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
        ),
        builder: (ctx) {
          return SafeArea(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const SizedBox(height: 8),
                const Text('Choose a booking', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
                const SizedBox(height: 8),
                Flexible(
                  child: ListView.separated(
                    shrinkWrap: true,
                    itemCount: active.length,
                    separatorBuilder: (_, __) => const Divider(height: 1),
                    itemBuilder: (_, i) {
                      final b = active[i];
                      final id = (b['id'] as num?)?.toInt() ?? 0;
                      final cat = (b['service_category'] ?? 'General').toString();
                      final status = (b['status'] ?? '').toString();
                      final eta = (b['eta_minutes'] as num?)?.toInt();
                      final price = (b['price_amount'] as num?)?.toDouble();
                      final curr = (b['price_currency'] ?? '').toString();
                      return ListTile(
                        leading: const Icon(Icons.assignment_rounded),
                        title: Text('Booking #$id • $cat'),
                        subtitle: Text(status),
                        trailing: Wrap(
                          spacing: 8,
                          children: [
                            if (eta != null)
                              Chip(
                                label: Text('~${eta}m'),
                                visualDensity: VisualDensity.compact,
                                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                            if (price != null)
                              Chip(
                                label: Text('${curr.isNotEmpty ? curr : ''} ${price.toStringAsFixed(0)}'.trim()),
                                visualDensity: VisualDensity.compact,
                                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                          ],
                        ),
                        onTap: () => Navigator.pop(ctx, b),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 8),
              ],
            ),
          );
        },
      );

      if (picked != null) {
        final id = (picked['id'] as num).toInt();
        Navigator.pushNamed(context, '/booking_status', arguments: id);
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not fetch bookings: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
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
          child: FadeTransition(
            opacity: _fadeAnimation,
            child: SlideTransition(
              position: _slideAnimation,
              child: Column(
                children: [
                  // Custom App Bar
                  Padding(
                    padding: const EdgeInsets.all(20.0),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(15),
                          ),
                          child: const Icon(
                            Icons.person_rounded,
                            color: Colors.white,
                            size: 24,
                          ),
                        ),
                        const SizedBox(width: 16),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Welcome back!',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 14,
                                ),
                              ),
                              Text(
                                'Consumer Dashboard',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.person_rounded, color: Colors.white),
                          onPressed: () => Navigator.pushNamed(context, '/profile'),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          icon: const Icon(Icons.history_rounded, color: Colors.white),
                          tooltip: 'My Activity',
                          onPressed: () => Navigator.pushNamed(context, '/consumer_profile'),
                        ),
                      ],
                    ),
                  ),
                  
                  Expanded(
                    child: Container(
                      decoration: const BoxDecoration(
                        color: AppColors.black, 
                        borderRadius: BorderRadius.only(
                          topLeft: Radius.circular(30),
                          topRight: Radius.circular(30),
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.all(24.0),
                        child: SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const SizedBox(height: 20),
                              
                              Text(
                                'What can we help you with today?',
                                style: TextStyle(
                                  fontSize: MediaQuery.of(context).size.width < 350 ? 18 : 22,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white, // light text on dark bg
                                ),
                                textAlign: TextAlign.center,
                              ),
                              
                              const SizedBox(height: 30),
                              
                              // Instant Help Card
                              _buildFeatureCard(
                                title: 'Get Instant Help',
                                subtitle: 'Find nearby providers for cleaning, cooking, repairs, and more',
                                icon: Icons.flash_on_rounded,
                                gradient: const LinearGradient(
                                  colors: [AppColors.yellow, AppColors.lightPink],
                                ),
                                onTap: () => Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const ProviderListPage()),
                                ),
                              ),
                              
                              const SizedBox(height: 16),
                              
                              // Community Forum Card
                              _buildFeatureCard(
                                title: 'Community Forum',
                                subtitle: 'Report neighborhood issues and connect with your community',
                                icon: Icons.forum_rounded,
                                gradient: const LinearGradient(
                                  colors: [AppColors.lightPink, AppColors.yellow],
                                ),
                                onTap: () => Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const ForumFeedPage()),
                                ),
                              ),
                              
                              const SizedBox(height: 16),

                              const SizedBox(height: 20),

                              // Current Booking button
                              SizedBox(
                                width: double.infinity,
                                child: ElevatedButton.icon(
                                  onPressed: _openCurrentBooking,
                                  icon: const Icon(Icons.assignment_turned_in_rounded),
                                  label: const Text('Current Booking Status'),
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

                              const SizedBox(height: 30),
                              
                              // Quick Stats
                              Container(
                                padding: const EdgeInsets.all(16),
                                decoration: BoxDecoration(
                                  color: AppColors.charcoal,
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(color: Colors.white24),
                                ),
                                child: Column(
                                  children: [
                                    const Text(
                                      'Quick Access',
                                      style: TextStyle(
                                        fontSize: 16,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.white,
                                      ),
                                    ),
                                    const SizedBox(height: 16),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                                      children: [
                                        Flexible(
                                          child: _buildQuickStat(
                                            icon: Icons.history_rounded,
                                            label: 'Recent\nBookings',
                                            color: AppColors.yellow,
                                          ),
                                        ),
                                        Flexible(
                                          child: _buildQuickStat(
                                            icon: Icons.star_rounded,
                                            label: 'Favorite\nProviders',
                                            color: AppColors.lightPink,
                                          ),
                                        ),
                                        Flexible(
                                          child: _buildQuickStat(
                                            icon: Icons.notifications_rounded,
                                            label: 'Community\nUpdates',
                                            color: AppColors.lightPink,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                              ),
                              
                              const SizedBox(height: 20),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFeatureCard({
    required String title,
    required String subtitle,
    required IconData icon,
    required Gradient gradient,
    required VoidCallback onTap,
  }) {
    return TweenAnimationBuilder<double>(
      duration: const Duration(milliseconds: 200),
      tween: Tween(begin: 1.0, end: 1.0),
      builder: (context, scale, child) {
        return Transform.scale(
          scale: scale,
          child: GestureDetector(
            onTapDown: (_) => setState(() {}),
            onTapUp: (_) => setState(() {}),
            onTapCancel: () => setState(() {}),
            onTap: onTap,
            child: Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: gradient,
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withOpacity(0.1),
                    blurRadius: 20,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Icon(
                      icon,
                      size: 28,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          subtitle,
                          style: const TextStyle(
                            fontSize: 13,
                            color: Colors.white70,
                            fontWeight: FontWeight.w400,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(
                    Icons.arrow_forward_ios_rounded,
                    color: Colors.white70,
                    size: 18,
                  ),
                ],
              ),
            ),
          ),
        );
      },
    );
  }

  Widget _buildQuickStat({
    required IconData icon,
    required String label,
    required Color color,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Icon(
            icon,
            color: color,
            size: 24,
          ),
        ),
        const SizedBox(height: 8),
        Text(
          label,
          textAlign: TextAlign.center,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w500,
            color: Colors.white70,
          ),
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ],
    );
  }
}