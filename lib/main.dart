import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'providers/app_state_provider.dart';
import 'screens/splash_screen.dart';
import 'theme/app_colors.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const LikhoraApp());
}

class LikhoraApp extends StatelessWidget {
  const LikhoraApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AppStateProvider(),
      child: MaterialApp(
        title: 'Likhora - Negosyo Roadmap & Pricing',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          scaffoldBackgroundColor: AppColors.background, // Pure white #FFFFFF
          colorScheme: ColorScheme.fromSeed(
            seedColor: AppColors.aubergine,
            surface: AppColors.background,
            primary: AppColors.aubergine,
            secondary: AppColors.yellow,
          ),
          appBarTheme: const AppBarTheme(
            backgroundColor: AppColors.background,
            elevation: 0,
            scrolledUnderElevation: 0,
            iconTheme: IconThemeData(color: AppColors.textDark),
          ),
        ),
        home: const SplashScreen(),
      ),
    );
  }
}
