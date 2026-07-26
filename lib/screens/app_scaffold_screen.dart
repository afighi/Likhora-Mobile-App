import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../widgets/floating_glass_tab_bar.dart';
import 'home_screen.dart';
import 'roadmap_screen.dart';
import 'pricing_calculator_screen.dart';
import 'progress_tracker_screen.dart';
import 'supplier_directory_screen.dart';

class AppScaffoldScreen extends StatelessWidget {
  const AppScaffoldScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);

    final screens = const [
      HomeScreen(),
      RoadmapScreen(),
      PricingCalculatorScreen(),
      ProgressTrackerScreen(),
      SupplierDirectoryScreen(),
    ];

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          // Current Tab View
          Positioned.fill(
            child: IndexedStack(
              index: appState.currentTabIndex.clamp(0, 4),
              children: screens,
            ),
          ),

          // Translucent Frosted Floating Glass Navigation Bar (5 tabs)
          FloatingGlassTabBar(
            currentIndex: appState.currentTabIndex.clamp(0, 4),
            onTap: (index) {
              appState.setTabIndex(index);
            },
          ),
        ],
      ),
    );
  }
}
