import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 12.0, bottom: 100.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Bar Header (Title & Right Icons)
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const SizedBox(),
                  Row(
                    children: [
                      // Bell Icon with red dot
                      Stack(
                        children: [
                          Container(
                            width: 40.0,
                            height: 40.0,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.05),
                                  blurRadius: 10.0,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Icon(
                              CupertinoIcons.bell,
                              size: 20.0,
                              color: AppColors.textDark,
                            ),
                          ),
                          Positioned(
                            top: 8.0,
                            right: 8.0,
                            child: Container(
                              width: 8.0,
                              height: 8.0,
                              decoration: const BoxDecoration(
                                color: Color(0xFFEF4444),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 10.0),
                      // Woman User Avatar Circle Button
                      Container(
                        width: 40.0,
                        height: 40.0,
                        decoration: BoxDecoration(
                          color: const Color(0xFF0284C7),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2.0),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.08),
                              blurRadius: 8.0,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            CupertinoIcons.person_fill,
                            size: 22.0,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 4.0),

              // Large Title & Subtitle
              Text(
                'Kumusta, Ana',
                style: AppTypography.largeTitle(),
              ),
              const SizedBox(height: 4.0),
              const Text(
                'Your Carinderia is 40% to launch',
                style: TextStyle(
                  fontSize: 14.0,
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),

              const SizedBox(height: 20.0),

              // Dark Purple Hero Card
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24.0),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.aubergine.withValues(alpha: 0.25),
                      blurRadius: 20.0,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Upper Dark Purple Card
                    Container(
                      padding: const EdgeInsets.all(22.0),
                      decoration: const BoxDecoration(
                        color: AppColors.aubergine,
                        borderRadius: BorderRadius.vertical(top: Radius.circular(24.0)),
                      ),
                      child: Row(
                        children: [
                          // 40% Circular Progress Ring
                          SizedBox(
                            width: 68.0,
                            height: 68.0,
                            child: Stack(
                              alignment: Alignment.center,
                              children: [
                                SizedBox(
                                  width: 68.0,
                                  height: 68.0,
                                  child: CircularProgressIndicator(
                                    value: 0.40,
                                    strokeWidth: 7.0,
                                    backgroundColor: Colors.white.withValues(alpha: 0.15),
                                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFBBF24)),
                                    strokeCap: StrokeCap.round,
                                  ),
                                ),
                                const Text(
                                  '40%',
                                  style: TextStyle(
                                    fontSize: 14.0,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),

                          const SizedBox(width: 18.0),

                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Business journey',
                                  style: TextStyle(
                                    fontSize: 12.0,
                                    color: Color(0xFFD8B4FE),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 4.0),
                                const Text(
                                  'Carinderia sa Pasig',
                                  style: TextStyle(
                                    fontSize: 20.0,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.white,
                                  ),
                                ),
                                const SizedBox(height: 6.0),
                                const Row(
                                  children: [
                                    Text('🔥', style: TextStyle(fontSize: 13.0)),
                                    SizedBox(width: 4.0),
                                    Text(
                                      '2 of 5 steps done',
                                      style: TextStyle(
                                        fontSize: 13.0,
                                        color: Color(0xFFE2D9EC),
                                        fontWeight: FontWeight.w500,
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),

                    // Attached White Bottom Bar
                    GestureDetector(
                      onTap: () => appState.setTabIndex(3),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 20.0, vertical: 16.0),
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.vertical(bottom: Radius.circular(24.0)),
                        ),
                        child: const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'View progress tracker',
                              style: TextStyle(
                                fontSize: 14.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                            Icon(
                              CupertinoIcons.chevron_right,
                              size: 16.0,
                              color: AppColors.textDark,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20.0),

              // 3 Quick Action Cards Row (Roadmap, Pricing, Suppliers)
              Row(
                children: [
                  _buildQuickActionCard(
                    title: 'Roadmap',
                    icon: CupertinoIcons.flowchart,
                    bgColor: const Color(0xFFF3E8FF),
                    iconColor: AppColors.aubergine,
                    onTap: () => appState.setTabIndex(1),
                  ),
                  const SizedBox(width: 12.0),
                  _buildQuickActionCard(
                    title: 'Pricing',
                    icon: Icons.calculate_outlined,
                    bgColor: const Color(0xFFFEF3C7),
                    iconColor: const Color(0xFFD97706),
                    onTap: () => appState.setTabIndex(2),
                  ),
                  const SizedBox(width: 12.0),
                  _buildQuickActionCard(
                    title: 'Suppliers',
                    icon: CupertinoIcons.house_alt,
                    bgColor: const Color(0xFFE0F2FE),
                    iconColor: const Color(0xFF0284C7),
                    onTap: () => appState.setTabIndex(4),
                  ),
                ],
              ),

              const SizedBox(height: 20.0),

              // Light Blue AI Card ("Likhora AI · What's next")
              Container(
                padding: const EdgeInsets.all(18.0),
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F2FE),
                  borderRadius: BorderRadius.circular(20.0),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 38.0,
                      height: 38.0,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.8),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Icon(
                          CupertinoIcons.sparkles,
                          size: 18.0,
                          color: Color(0xFF0284C7),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14.0),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Likhora AI · What\'s next',
                            style: TextStyle(
                              fontSize: 14.0,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0284C7),
                            ),
                          ),
                          SizedBox(height: 4.0),
                          Text(
                            'Your pork cost jumped 8% this week. Finish your cost sheet so I can flag any dishes with thin margins before you set prices.',
                            style: TextStyle(
                              fontSize: 13.0,
                              color: Color(0xFF334155),
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28.0),

              // Section: Continue
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Continue',
                    style: TextStyle(
                      fontSize: 20.0,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textDark,
                      letterSpacing: -0.4,
                    ),
                  ),
                  GestureDetector(
                    onTap: () {},
                    child: const Text(
                      'See all',
                      style: TextStyle(
                        fontSize: 14.0,
                        fontWeight: FontWeight.bold,
                        color: AppColors.aubergine,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14.0),

              // Continue Card
              GestureDetector(
                onTap: () => appState.setTabIndex(1),
                child: Container(
                  padding: const EdgeInsets.all(18.0),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20.0),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 12.0,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48.0,
                        height: 48.0,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(14.0),
                        ),
                        child: const Center(
                          child: Icon(
                            CupertinoIcons.doc_text_fill,
                            size: 24.0,
                            color: Color(0xFFD97706),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(8.0),
                              ),
                              child: const Text(
                                'In progress',
                                style: TextStyle(
                                  fontSize: 11.0,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFFD97706),
                                ),
                              ),
                            ),
                            const SizedBox(height: 6.0),
                            const Text(
                              'Build your cost sheet',
                              style: TextStyle(
                                fontSize: 16.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                            const SizedBox(height: 2.0),
                            const Text(
                              'Cost every dish so your prices protec...',
                              style: TextStyle(
                                fontSize: 13.0,
                                color: AppColors.textMuted,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8.0),
                      const Icon(
                        CupertinoIcons.arrow_right,
                        size: 18.0,
                        color: AppColors.textDark,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 28.0),

              // Bottom Section Banner: For...
              const Text(
                'For...',
                style: TextStyle(
                  fontSize: 20.0,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                  letterSpacing: -0.4,
                ),
              ),
              const SizedBox(height: 12.0),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20.0),
                ),
                child: const Row(
                  children: [
                    Icon(CupertinoIcons.location_solid, color: Color(0xFF38A169)),
                    SizedBox(width: 10.0),
                    Text(
                      '3 rice suppliers near you',
                      style: TextStyle(
                        fontSize: 15.0,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textDark,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildQuickActionCard({
    required String title,
    required IconData icon,
    required Color bgColor,
    required Color iconColor,
    required VoidCallback onTap,
  }) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 20.0, horizontal: 12.0),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(22.0),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.03),
                blurRadius: 10.0,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            children: [
              Container(
                width: 48.0,
                height: 48.0,
                decoration: BoxDecoration(
                  color: bgColor,
                  borderRadius: BorderRadius.circular(16.0),
                ),
                child: Center(
                  child: Icon(icon, size: 24.0, color: iconColor),
                ),
              ),
              const SizedBox(height: 12.0),
              Text(
                title,
                style: const TextStyle(
                  fontSize: 14.0,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
