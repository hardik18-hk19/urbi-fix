import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../utils/location_helper.dart';
import '../../state/auth_state.dart';

class SplashPage extends StatefulWidget {
  const SplashPage({super.key});

  @override
  State<SplashPage> createState() => _SplashPageState();
}

class _SplashPageState extends State<SplashPage> {
  @override
  void initState() {
    super.initState();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    // Prompt for location early to improve UX for both consumers and providers.
    // If denied, we still continue to app; user can allow later from profile.
    await LocationHelper.getCurrentLocation();

    // Check auth token and route accordingly
    final auth = Provider.of<AuthState>(context, listen: false);
    await auth.checkAuthStatus();

    if (!mounted) return;

    Future.delayed(const Duration(milliseconds: 200), () {
      if (!mounted) return;
      if (auth.isLoggedIn && auth.user != null) {
        final role = auth.user!.role.toLowerCase();
        if (role == 'provider') {
          Navigator.pushReplacementNamed(context, '/provider_dashboard');
        } else {
          Navigator.pushReplacementNamed(context, '/consumer_dashboard');
        }
      } else {
        Navigator.pushReplacementNamed(context, '/role');
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.black, AppColors.charcoal],
          ),
        ),
        child: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Try to show a logo image if available, otherwise fallback to text
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  color: AppColors.charcoal,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: AppColors.lightPink),
                ),
                child: Image.asset(
                  'assets/images/logo_urbifix.png',
                  width: 120,
                  height: 120,
                  errorBuilder: (context, error, stack) => const Icon(
                    Icons.home_work_rounded,
                    size: 60,
                    color: AppColors.yellow,
                  ),
                ),
              ),
              const SizedBox(height: 16),
              const Text(
                "UrbiFix",
                style: TextStyle(
                  color: AppColors.white,
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                ),
              ),
              const SizedBox(height: 8),
              const Chip(
                label: Text('Community Helper'),
                backgroundColor: AppColors.yellow,
                labelStyle: TextStyle(color: Colors.black, fontWeight: FontWeight.bold),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
