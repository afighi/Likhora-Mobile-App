import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../widgets/app_card.dart';
import '../widgets/app_button.dart';
import '../widgets/fun_hero_motif_painter.dart';
import '../widgets/gamified_streak_badge.dart';

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.background, // Warm Parchment #F6F1E9
      child: CustomScrollView(
        slivers: [
          // iOS Large Title Navigation Header
          CupertinoSliverNavigationBar(
            largeTitle: Text(
              'Kumusta, Ana',
              style: AppTypography.largeTitle(),
            ),
            backgroundColor: AppColors.background.withValues(alpha: 0.90),
            border: null,
            trailing: GestureDetector(
              onTap: () => appState.setTabIndex(4),
              child: Container(
                width: 38.0,
                height: 38.0,
                decoration: BoxDecoration(
                  color: AppColors.aubergine,
                  shape: BoxShape.circle,
                  border: Border.all(color: AppColors.yellow, width: 2.0),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.aubergine.withValues(alpha: 0.3),
                      blurRadius: 10.0,
                    ),
                  ],
                ),
                child: const Center(
                  child: Text(
                    'A',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 16.0,
                    ),
                  ),
                ),
              ),
            ),
          ),

          SliverPadding(
            padding: const EdgeInsets.all(16.0),
            sliver: SliverList(
              delegate: SliverChildListDelegate([
                // Header Subtitle & Streak Badge (Overflow Protection with Wrap)
                Wrap(
                  crossAxisAlignment: WrapCrossAlignment.center,
                  alignment: WrapAlignment.spaceBetween,
                  spacing: 8.0,
                  runSpacing: 6.0,
                  children: [
                    Text(
                      'Carinderia sa Pasig • Launch Setup Active',
                      style: AppTypography.bodyBold(color: AppColors.textDark, fontSize: 13.0),
                    ),
                    const GamifiedStreakBadge(streakDays: 3),
                  ],
                ),

                const SizedBox(height: 14.0),

                // 1. STRIKING Aubergine Business Journey Hero Card
                AppCard(
                  backgroundColor: AppColors.aubergine,
                  borderColor: AppColors.aubergine,
                  child: Stack(
                    children: [
                      // Motif Pattern Background
                      Positioned.fill(
                        child: CustomPaint(
                          painter: FunHeroMotifPainter(accentColor: Colors.white),
                        ),
                      ),

                      // Card Content
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                                      decoration: BoxDecoration(
                                        color: AppColors.yellow,
                                        borderRadius: BorderRadius.circular(12.0),
                                      ),
                                      child: const Text(
                                        'ACTIVE BUSINESS PATH',
                                        style: TextStyle(
                                          fontSize: 10.0,
                                          fontWeight: FontWeight.w900,
                                          letterSpacing: 0.6,
                                          color: AppColors.textDark,
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 8.0),
                                    const Text(
                                      'Carinderia sa Pasig',
                                      style: TextStyle(
                                        fontSize: 22.0,
                                        fontWeight: FontWeight.w900,
                                        color: Colors.white,
                                      ),
                                    ),
                                    const SizedBox(height: 4.0),
                                    Text(
                                      '${appState.completedStepsCount} of ${appState.totalStepsCount} milestones completed',
                                      style: const TextStyle(
                                        fontSize: 12.5,
                                        color: Colors.white70,
                                      ),
                                    ),
                                  ],
                                ),
                              ),

                              // Glowing Progress Ring
                              SizedBox(
                                width: 56.0,
                                height: 56.0,
                                child: Stack(
                                  alignment: Alignment.center,
                                  children: [
                                    CircularProgressIndicator(
                                      value: appState.overallProgressPercent,
                                      strokeWidth: 6.0,
                                      backgroundColor: Colors.white24,
                                      valueColor: const AlwaysStoppedAnimation<Color>(AppColors.yellow),
                                    ),
                                    Text(
                                      '${(appState.overallProgressPercent * 100).toInt()}%',
                                      style: const TextStyle(
                                        fontSize: 13.0,
                                        fontWeight: FontWeight.bold,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 16.0),

                          // Achievements Row
                          const Wrap(
                            spacing: 6.0,
                            runSpacing: 6.0,
                            children: [
                              AchievementBadgeChip(
                                label: 'DTI Clearance Unlocked',
                                icon: CupertinoIcons.checkmark_seal_fill,
                                color: AppColors.green,
                              ),
                              AchievementBadgeChip(
                                label: '35%+ Margin Target',
                                icon: CupertinoIcons.money_dollar_circle_fill,
                                color: AppColors.yellow,
                              ),
                            ],
                          ),

                          const SizedBox(height: 16.0),

                          GestureDetector(
                            onTap: () => appState.setTabIndex(3),
                            child: const Row(
                              children: [
                                Text(
                                  'View full progress tracker',
                                  style: TextStyle(
                                    fontSize: 13.0,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.yellow,
                                  ),
                                ),
                                SizedBox(width: 4.0),
                                Icon(CupertinoIcons.arrow_right, size: 14.0, color: AppColors.yellow),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16.0),

                // 2. Quick Actions Grid (3 Equal Cards with Rich Colorful Tiles)
                Row(
                  children: [
                    Expanded(
                      child: _QuickActionCard(
                        icon: CupertinoIcons.map_fill,
                        label: 'Roadmap',
                        color: AppColors.aubergine,
                        bgColor: AppColors.aubergineTint,
                        onTap: () => appState.setTabIndex(1),
                      ),
                    ),
                    const SizedBox(width: 10.0),
                    Expanded(
                      child: _QuickActionCard(
                        icon: CupertinoIcons.money_dollar_circle_fill,
                        label: 'Pricing',
                        color: AppColors.yellow,
                        bgColor: AppColors.yellowTint,
                        onTap: () => appState.setTabIndex(2),
                      ),
                    ),
                    const SizedBox(width: 10.0),
                    Expanded(
                      child: _QuickActionCard(
                        icon: CupertinoIcons.building_2_fill,
                        label: 'Suppliers',
                        color: AppColors.blue,
                        bgColor: AppColors.blueTint,
                        onTap: () => appState.setTabIndex(4),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 16.0),

                // 3. AI Guidance Card (Blue Informational Sparkle Callout)
                AppCard(
                  backgroundColor: AppColors.blueTint,
                  borderColor: AppColors.blue.withValues(alpha: 0.3),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.all(8.0),
                        decoration: BoxDecoration(
                          color: AppColors.blue,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.blue.withValues(alpha: 0.3),
                              blurRadius: 8.0,
                            ),
                          ],
                        ),
                        child: const Icon(
                          CupertinoIcons.sparkles,
                          size: 16.0,
                          color: Colors.white,
                        ),
                      ),
                      const SizedBox(width: 12.0),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'AI Business Guidance',
                              style: TextStyle(
                                fontSize: 13.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                            SizedBox(height: 4.0),
                            Text(
                              'Pork costs increased by 12% in Metro Manila this week. Finish your cost sheet before setting pre-order prices.',
                              style: TextStyle(
                                fontSize: 12.5,
                                color: AppColors.textDark,
                                height: 1.35,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16.0),

                // 4. Continue Card (Active Task)
                AppCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                            decoration: BoxDecoration(
                              color: AppColors.yellowTint,
                              borderRadius: BorderRadius.circular(12.0),
                            ),
                            child: const Text(
                              'Active Focus Task',
                              style: TextStyle(
                                fontSize: 11.5,
                                fontWeight: FontWeight.bold,
                                color: AppColors.aubergine,
                              ),
                            ),
                          ),
                          const Text(
                            'Step 2 of 4',
                            style: TextStyle(
                              fontSize: 12.0,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10.0),
                      const Text(
                        'Build your product cost sheet',
                        style: TextStyle(
                          fontSize: 17.0,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textDark,
                        ),
                      ),
                      const SizedBox(height: 4.0),
                      const Text(
                        'Calculate exact batch yields, raw ingredients, and direct labor to establish healthy 35%+ margins.',
                        style: TextStyle(
                          fontSize: 13.0,
                          color: AppColors.textMuted,
                          height: 1.35,
                        ),
                      ),
                      const SizedBox(height: 14.0),
                      AppButton(
                        label: 'Open Pricing Tool',
                        icon: CupertinoIcons.money_dollar_circle,
                        onPressed: () => appState.setTabIndex(2),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 16.0),

                // 5. Supplier Recommendation Card
                AppCard(
                  child: Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(10.0),
                        decoration: BoxDecoration(
                          color: AppColors.blueTint,
                          borderRadius: BorderRadius.circular(16.0),
                        ),
                        child: const Icon(
                          CupertinoIcons.cart_fill,
                          color: AppColors.blue,
                          size: 22.0,
                        ),
                      ),
                      const SizedBox(width: 12.0),
                      const Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Marikina Grain Trading',
                              style: TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                            SizedBox(height: 2.0),
                            Text(
                              '4.2 km away • Pasig City',
                              style: TextStyle(
                                fontSize: 12.0,
                                color: AppColors.textMuted,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                      CupertinoButton(
                        padding: EdgeInsets.zero,
                        onPressed: () => appState.setTabIndex(4),
                        child: const Text(
                          'View',
                          style: TextStyle(
                            fontSize: 13.0,
                            fontWeight: FontWeight.bold,
                            color: AppColors.aubergine,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 80.0),
              ]),
            ),
          ),
        ],
      ),
    );
  }
}

class _QuickActionCard extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final Color bgColor;
  final VoidCallback onTap;

  const _QuickActionCard({
    required this.icon,
    required this.label,
    required this.color,
    required this.bgColor,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      padding: const EdgeInsets.symmetric(vertical: 16.0, horizontal: 6.0),
      margin: EdgeInsets.zero,
      onTap: onTap,
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(12.0),
            decoration: BoxDecoration(
              color: bgColor,
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 22.0),
          ),
          const SizedBox(height: 8.0),
          Text(
            label,
            style: const TextStyle(
              fontSize: 12.5,
              fontWeight: FontWeight.bold,
              color: AppColors.textDark,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}
