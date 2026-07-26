import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../widgets/app_card.dart';
import '../widgets/app_button.dart';
import 'launch_package_modal.dart';

class ProgressTrackerScreen extends StatelessWidget {
  const ProgressTrackerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);

    return CupertinoPageScaffold(
      backgroundColor: AppColors.background, // Warm Parchment #F6F1E9
      child: CustomScrollView(
        slivers: [
          // iOS Large Title Header
          CupertinoSliverNavigationBar(
            largeTitle: Text(
              'Progress',
              style: AppTypography.largeTitle(),
            ),
            backgroundColor: AppColors.background.withValues(alpha: 0.90),
            border: null,
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Carinderia sa Pasig • Launch Readiness Tracker',
                    style: AppTypography.caption(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 14.0),

                  // 1. Overall Progress Hero Ring Card
                  AppCard(
                    child: Column(
                      children: [
                        Row(
                          children: [
                            // Large Green Completion Ring
                            SizedBox(
                              width: 72.0,
                              height: 72.0,
                              child: Stack(
                                alignment: Alignment.center,
                                children: [
                                  CircularProgressIndicator(
                                    value: appState.overallProgressPercent,
                                    strokeWidth: 8.0,
                                    backgroundColor: AppColors.dividerColor,
                                    valueColor: const AlwaysStoppedAnimation<Color>(AppColors.green),
                                  ),
                                  Text(
                                    '${(appState.overallProgressPercent * 100).toInt()}%',
                                    style: const TextStyle(
                                      fontSize: 16.0,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textDark,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 16.0),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Overall Launch Readiness',
                                    style: TextStyle(
                                      fontSize: 17.0,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textDark,
                                    ),
                                  ),
                                  const SizedBox(height: 4.0),
                                  Text(
                                    '${appState.completedStepsCount} of ${appState.totalStepsCount} roadmap steps completed',
                                    style: const TextStyle(
                                      fontSize: 13.0,
                                      color: AppColors.textMuted,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // 2. AI Next-Step Guidance Panel
                  AppCard(
                    backgroundColor: AppColors.blueTint,
                    borderColor: AppColors.blue.withValues(alpha: 0.3),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6.0),
                          decoration: const BoxDecoration(
                            color: AppColors.blue,
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(CupertinoIcons.sparkles, size: 16.0, color: Colors.white),
                        ),
                        const SizedBox(width: 10.0),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'AI Next-Step Guidance',
                                style: TextStyle(
                                  fontSize: 13.0,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textDark,
                                ),
                              ),
                              SizedBox(height: 4.0),
                              Text(
                                'Completing "Costing & Profit Margin Calculation" will unlock your Launch Price List and generate your final Business Portfolio.',
                                style: TextStyle(fontSize: 12.5, color: AppColors.textDark, height: 1.35),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // 3. Weekly Activity Lightweight Bar Chart Card
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Weekly Negosyo Activity',
                          style: TextStyle(
                            fontSize: 15.0,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textDark,
                          ),
                        ),
                        const SizedBox(height: 14.0),
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceAround,
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            _DayBar(day: 'M', height: 28, isCompleted: true),
                            _DayBar(day: 'T', height: 44, isCompleted: true),
                            _DayBar(day: 'W', height: 18, isCompleted: true),
                            _DayBar(day: 'T', height: 56, isCompleted: true, isActive: true),
                            _DayBar(day: 'F', height: 10, isCompleted: false),
                            _DayBar(day: 'S', height: 10, isCompleted: false),
                            _DayBar(day: 'S', height: 10, isCompleted: false),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // 4. Launch Toolkit Deliverables
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4.0, vertical: 6.0),
                    child: Text(
                      'Tangible Launch Deliverables',
                      style: TextStyle(
                        fontSize: 16.0,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textDark,
                      ),
                    ),
                  ),

                  _DeliverableCard(
                    title: 'Product Cost Sheet',
                    statusText: '100% Calculated',
                    progress: 1.0,
                    icon: CupertinoIcons.doc_text_fill,
                    iconColor: AppColors.yellow,
                  ),

                  _DeliverableCard(
                    title: 'Chosen Supply Partners',
                    statusText: '2 Suppliers Matched',
                    progress: 0.66,
                    icon: CupertinoIcons.building_2_fill,
                    iconColor: AppColors.blue,
                  ),

                  _DeliverableCard(
                    title: 'Launch Price List',
                    statusText: 'Ready to Print',
                    progress: 1.0,
                    icon: CupertinoIcons.tag_fill,
                    iconColor: AppColors.green,
                  ),

                  const SizedBox(height: 16.0),

                  // 5. Aubergine Milestone Launch Card
                  AppCard(
                    backgroundColor: AppColors.aubergine,
                    borderColor: AppColors.aubergine,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(CupertinoIcons.flag_fill, color: AppColors.yellow, size: 20.0),
                            const SizedBox(width: 8.0),
                            const Text(
                              'Target Launch Date',
                              style: TextStyle(
                                fontSize: 13.0,
                                fontWeight: FontWeight.bold,
                                color: Colors.white70,
                              ),
                            ),
                            const Spacer(),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                              decoration: BoxDecoration(
                                color: AppColors.green,
                                borderRadius: BorderRadius.circular(12.0),
                              ),
                              child: const Text(
                                'On Track',
                                style: TextStyle(
                                  fontSize: 11.5,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10.0),
                        const Text(
                          'August 15, 2026',
                          style: TextStyle(
                            fontSize: 22.0,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(height: 14.0),
                        AppButton(
                          label: 'Export Business Portfolio',
                          icon: CupertinoIcons.share,
                          onPressed: () {
                            showCupertinoModalPopup(
                              context: context,
                              builder: (ctx) => const LaunchPackageModal(),
                            );
                          },
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 80.0),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DayBar extends StatelessWidget {
  final String day;
  final double height;
  final bool isCompleted;
  final bool isActive;

  const _DayBar({
    required this.day,
    required this.height,
    required this.isCompleted,
    this.isActive = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Container(
          width: 18.0,
          height: height,
          decoration: BoxDecoration(
            color: isActive
                ? AppColors.yellow
                : (isCompleted ? AppColors.green : AppColors.dividerColor),
            borderRadius: BorderRadius.circular(6.0),
          ),
        ),
        const SizedBox(height: 6.0),
        Text(
          day,
          style: TextStyle(
            fontSize: 11.5,
            fontWeight: isActive ? FontWeight.bold : FontWeight.w500,
            color: isActive ? AppColors.aubergine : AppColors.textMuted,
          ),
        ),
      ],
    );
  }
}

class _DeliverableCard extends StatelessWidget {
  final String title;
  final String statusText;
  final double progress;
  final IconData icon;
  final Color iconColor;

  const _DeliverableCard({
    required this.title,
    required this.statusText,
    required this.progress,
    required this.icon,
    required this.iconColor,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8.0),
                decoration: BoxDecoration(
                  color: iconColor.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(14.0),
                ),
                child: Icon(icon, color: iconColor, size: 20.0),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: const TextStyle(
                        fontSize: 14.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textDark,
                      ),
                    ),
                    Text(
                      statusText,
                      style: const TextStyle(
                        fontSize: 12.0,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                '${(progress * 100).toInt()}%',
                style: const TextStyle(
                  fontSize: 13.0,
                  fontWeight: FontWeight.bold,
                  color: AppColors.aubergine,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10.0),
          ClipRRect(
            borderRadius: BorderRadius.circular(4.0),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 6.0,
              backgroundColor: AppColors.dividerColor,
              valueColor: AlwaysStoppedAnimation<Color>(iconColor),
            ),
          ),
        ],
      ),
    );
  }
}
