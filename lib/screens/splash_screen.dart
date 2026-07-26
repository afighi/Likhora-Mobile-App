import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../services/local_storage_service.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import 'preference_wizard_screen.dart';
import 'app_scaffold_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late AnimationController _animController;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    );

    _fadeAnim = CurvedAnimation(
      parent: _animController,
      curve: const Interval(0.0, 0.7, curve: Curves.easeIn),
    );

    _scaleAnim = Tween<double>(begin: 0.9, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.0, 0.8, curve: Curves.easeOutCubic),
      ),
    );

    _animController.forward();
    _checkAppRouting();
  }

  void _checkAppRouting() async {
    await Future.delayed(const Duration(milliseconds: 1800));

    final isOnboarded = await LocalStorageService.isOnboardingCompleted();
    final isAuth = await LocalStorageService.isAuthenticated();

    if (!mounted) return;

    final appState = Provider.of<AppStateProvider>(context, listen: false);

    if (isAuth) {
      await appState.authenticateUser(name: 'Filipino Entrepreneur', email: 'user@likhora.ph');
    }

    if (!isOnboarded) {
      Navigator.pushReplacement(
        context,
        PageRouteBuilder(
          pageBuilder: (ctx, anim1, anim2) => const PreferenceWizardScreen(),
          transitionsBuilder: (ctx, anim, anim2, child) =>
              FadeTransition(opacity: anim, child: child),
        ),
      );
    } else {
      Navigator.pushReplacement(
        context,
        PageRouteBuilder(
          pageBuilder: (ctx, anim1, anim2) => const AppScaffoldScreen(),
          transitionsBuilder: (ctx, anim, anim2, child) =>
              FadeTransition(opacity: anim, child: child),
        ),
      );
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // Pure white #FFFFFF
      body: Center(
        child: FadeTransition(
          opacity: _fadeAnim,
          child: ScaleTransition(
            scale: _scaleAnim,
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Serif Brand Wordmark
                Text(
                  'Likhora',
                  style: AppTypography.displayHero(
                    color: AppColors.aubergine,
                  ).copyWith(fontSize: 48.0, letterSpacing: -1.0),
                ),
                const SizedBox(height: 8.0),
                Text(
                  'Your Connected Business Launchpad',
                  style: AppTypography.body(
                    color: AppColors.textMuted,
                    fontSize: 14.0,
                  ),
                ),
                const SizedBox(height: 32.0),
                const SizedBox(
                  width: 24.0,
                  height: 24.0,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(AppColors.aubergine),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
