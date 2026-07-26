import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../models/roadmap_model.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../widgets/app_card.dart';
import '../widgets/app_button.dart';
import '../widgets/ios_badge.dart';
import '../widgets/currency_text.dart';
import 'step_detail_screen.dart';

class RoadmapScreen extends StatefulWidget {
  const RoadmapScreen({super.key});

  @override
  State<RoadmapScreen> createState() => _RoadmapScreenState();
}

class _RoadmapScreenState extends State<RoadmapScreen> {
  int _focusedStepIndex = 0;

  void _showTemplatesModal(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context, listen: false);

    showCupertinoModalPopup(
      context: context,
      builder: (ctx) => CupertinoActionSheet(
        title: const Text(
          'Choose a Business Roadmap Template',
          style: TextStyle(fontSize: 16.0, fontWeight: FontWeight.bold, color: AppColors.textDark),
        ),
        message: const Text(
          'Select a pre-configured template tailored for Philippine small enterprises.',
          style: TextStyle(fontSize: 12.5, color: AppColors.textMuted),
        ),
        actions: [
          CupertinoActionSheetAction(
            onPressed: () {
              appState.setWizardCategory('Food & Beverage');
              Navigator.pop(ctx);
            },
            child: const Text('Carinderia / Food Stall (4 Steps • 2-3 Weeks)'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              appState.setWizardCategory('Retail & Resale');
              Navigator.pop(ctx);
            },
            child: const Text('Online Reselling & E-Commerce (4 Steps • 1-2 Weeks)'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              appState.setWizardCategory('Services');
              Navigator.pop(ctx);
            },
            child: const Text('Home Service Business (5 Steps • 2 Weeks)'),
          ),
          CupertinoActionSheetAction(
            onPressed: () {
              appState.setWizardCategory('Retail & Resale');
              Navigator.pop(ctx);
            },
            child: const Text('Neighborhood Sari-Sari Store (3 Steps • 1 Week)'),
          ),
        ],
        cancelButton: CupertinoActionSheetAction(
          isDestructiveAction: true,
          onPressed: () => Navigator.pop(ctx),
          child: const Text('Cancel'),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);
    final steps = appState.roadmapSteps;

    if (steps.isEmpty) {
      return const CupertinoPageScaffold(
        child: Center(child: Text('No roadmap steps available.')),
      );
    }

    final focusedStep = steps[_focusedStepIndex.clamp(0, steps.length - 1)];
    final completedReqs = focusedStep.requirements.where((r) => r.isCompleted).length;
    final totalReqs = focusedStep.requirements.length;

    return CupertinoPageScaffold(
      backgroundColor: AppColors.background, // Warm Parchment #F6F1E9
      child: CustomScrollView(
        slivers: [
          // iOS Navigation Header
          CupertinoSliverNavigationBar(
            largeTitle: Text(
              'Roadmap',
              style: AppTypography.largeTitle(),
            ),
            backgroundColor: AppColors.background.withValues(alpha: 0.90),
            border: null,
            trailing: CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () => _showTemplatesModal(context),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                decoration: BoxDecoration(
                  color: AppColors.aubergineTint,
                  borderRadius: BorderRadius.circular(14.0),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(CupertinoIcons.square_grid_2x2, size: 14.0, color: AppColors.aubergine),
                    SizedBox(width: 4.0),
                    Text(
                      'Templates',
                      style: TextStyle(
                        fontSize: 12.0,
                        fontWeight: FontWeight.bold,
                        color: AppColors.aubergine,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Stage Progress Header Dots
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'STEP ${_focusedStepIndex + 1} OF ${steps.length}',
                        style: const TextStyle(
                          fontSize: 12.0,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.8,
                          color: AppColors.aubergine,
                        ),
                      ),
                      Text(
                        '${(appState.overallProgressPercent * 100).toInt()}% Total Progress',
                        style: const TextStyle(
                          fontSize: 12.0,
                          fontWeight: FontWeight.bold,
                          color: AppColors.green,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8.0),

                  // Segmented Dots Progress Bar
                  Row(
                    children: List.generate(steps.length, (idx) {
                      final isCurrent = idx == _focusedStepIndex;
                      final isDone = steps[idx].isCompleted;

                      return Expanded(
                        child: GestureDetector(
                          onTap: () => setState(() => _focusedStepIndex = idx),
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 200),
                            height: 6.0,
                            margin: const EdgeInsets.symmetric(horizontal: 2.0),
                            decoration: BoxDecoration(
                              color: isDone
                                  ? AppColors.green
                                  : (isCurrent ? AppColors.yellow : AppColors.dividerColor),
                              borderRadius: BorderRadius.circular(3.0),
                            ),
                          ),
                        ),
                      );
                    }),
                  ),

                  const SizedBox(height: 16.0),

                  // 2. Step Selector Tabs (Focus Bar)
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: List.generate(steps.length, (idx) {
                        final s = steps[idx];
                        final isFocused = idx == _focusedStepIndex;

                        return Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: GestureDetector(
                            onTap: () => setState(() => _focusedStepIndex = idx),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 8.0),
                              decoration: BoxDecoration(
                                color: isFocused ? AppColors.aubergine : Colors.white,
                                borderRadius: BorderRadius.circular(20.0),
                                border: Border.all(
                                  color: isFocused ? AppColors.aubergine : AppColors.hairlineBorder,
                                ),
                                boxShadow: isFocused
                                    ? [
                                        BoxShadow(
                                          color: AppColors.aubergine.withValues(alpha: 0.2),
                                          blurRadius: 6.0,
                                          offset: const Offset(0, 2),
                                        ),
                                      ]
                                    : null,
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    s.isCompleted
                                        ? CupertinoIcons.checkmark_circle_fill
                                        : (s.isActive ? CupertinoIcons.play_circle_fill : CupertinoIcons.lock_fill),
                                    size: 14.0,
                                    color: isFocused
                                        ? Colors.white
                                        : (s.isCompleted ? AppColors.green : AppColors.textMuted),
                                  ),
                                  const SizedBox(width: 6.0),
                                  Text(
                                    'Step ${idx + 1}',
                                    style: TextStyle(
                                      fontSize: 12.5,
                                      fontWeight: isFocused ? FontWeight.bold : FontWeight.w600,
                                      color: isFocused ? Colors.white : AppColors.textDark,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // 3. Main Focused Step Hero Card (Interactive Focus Window)
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Category & Status Badges
                        Row(
                          children: [
                            IOSBadge(
                              label: focusedStep.category.displayName,
                              style: BadgeStyle.aubergine,
                            ),
                            const Spacer(),
                            if (focusedStep.isCompleted)
                              IOSBadge(label: 'Completed', style: BadgeStyle.green)
                            else if (focusedStep.isActive)
                              IOSBadge(label: 'Active Focus', style: BadgeStyle.yellow)
                            else
                              IOSBadge(label: 'Locked', style: BadgeStyle.aubergine),
                          ],
                        ),

                        const SizedBox(height: 12.0),

                        // Title
                        Text(
                          focusedStep.title,
                          style: const TextStyle(
                            fontSize: 20.0,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textDark,
                          ),
                        ),

                        const SizedBox(height: 6.0),

                        // Description
                        Text(
                          focusedStep.description,
                          style: const TextStyle(
                            fontSize: 13.5,
                            color: AppColors.textMuted,
                            height: 1.4,
                          ),
                        ),

                        const SizedBox(height: 16.0),

                        // AI Expert Callout Annotation
                        if (focusedStep.aiAnnotation != null) ...[
                          Container(
                            padding: const EdgeInsets.all(12.0),
                            decoration: BoxDecoration(
                              color: AppColors.blueTint,
                              borderRadius: BorderRadius.circular(16.0),
                              border: Border.all(color: AppColors.blue.withValues(alpha: 0.3)),
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Icon(CupertinoIcons.sparkles, size: 16.0, color: AppColors.blue),
                                const SizedBox(width: 8.0),
                                Expanded(
                                  child: Text(
                                    focusedStep.aiAnnotation!,
                                    style: const TextStyle(
                                      fontSize: 12.5,
                                      color: AppColors.textDark,
                                      height: 1.35,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16.0),
                        ],

                        // Interactive Checklist Title & Progress Bar
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Milestone Action Items',
                              style: TextStyle(
                                fontSize: 14.5,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                            Text(
                              '$completedReqs of $totalReqs Done',
                              style: const TextStyle(
                                fontSize: 12.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.green,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8.0),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(4.0),
                          child: LinearProgressIndicator(
                            value: totalReqs > 0 ? (completedReqs / totalReqs) : 0.0,
                            minHeight: 6.0,
                            backgroundColor: AppColors.dividerColor,
                            valueColor: const AlwaysStoppedAnimation<Color>(AppColors.green),
                          ),
                        ),
                        const SizedBox(height: 12.0),

                        // Tappable Requirements List
                        ...focusedStep.requirements.map((req) {
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 6.0),
                            child: GestureDetector(
                              behavior: HitTestBehavior.opaque,
                              onTap: () => appState.toggleChecklistItem(focusedStep.id, req.id),
                              child: Row(
                                children: [
                                  Icon(
                                    req.isCompleted
                                        ? CupertinoIcons.checkmark_square_fill
                                        : CupertinoIcons.square,
                                    color: req.isCompleted ? AppColors.green : AppColors.textMuted,
                                    size: 20.0,
                                  ),
                                  const SizedBox(width: 10.0),
                                  Expanded(
                                    child: Text(
                                      req.title,
                                      style: TextStyle(
                                        fontSize: 13.5,
                                        color: req.isCompleted ? AppColors.textMuted : AppColors.textDark,
                                        decoration: req.isCompleted ? TextDecoration.lineThrough : null,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),

                        const SizedBox(height: 16.0),

                        // Contextual Action Buttons depending on Step Category
                        if (focusedStep.category == StepCategory.costing) ...[
                          AppButton(
                            label: 'Open Pricing Calculator Tool',
                            icon: CupertinoIcons.money_dollar_circle,
                            onPressed: () => appState.setTabIndex(2),
                          ),
                        ] else if (focusedStep.category == StepCategory.supplier) ...[
                          AppButton(
                            label: 'Find Suppliers for This Step',
                            icon: CupertinoIcons.building_2_fill,
                            onPressed: () => appState.setTabIndex(4),
                          ),
                        ] else ...[
                          Wrap(
                            alignment: WrapAlignment.spaceBetween,
                            crossAxisAlignment: WrapCrossAlignment.center,
                            spacing: 12.0,
                            runSpacing: 8.0,
                            children: [
                              if (focusedStep.estimatedCostMax > 0)
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    const Text('Estimated Budget', style: TextStyle(fontSize: 11.0, color: AppColors.textMuted)),
                                    CurrencyText(
                                      amount: focusedStep.estimatedCostMax,
                                      fontSize: 14.0,
                                      color: AppColors.aubergine,
                                    ),
                                  ],
                                ),
                              AppButton(
                                label: 'Step Docs',
                                icon: CupertinoIcons.doc_text,
                                isFullWidth: false,
                                onPressed: () {
                                  Navigator.push(
                                    context,
                                    CupertinoPageRoute(builder: (_) => StepDetailScreen(step: focusedStep)),
                                  );
                                },
                              ),
                            ],
                          ),
                        ],
                      ],
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // 4. Quick Next Step Navigation Row
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      CupertinoButton(
                        padding: EdgeInsets.zero,
                        onPressed: _focusedStepIndex > 0
                            ? () => setState(() => _focusedStepIndex--)
                            : null,
                        child: Row(
                          children: [
                            Icon(
                              CupertinoIcons.chevron_left,
                              size: 16.0,
                              color: _focusedStepIndex > 0 ? AppColors.aubergine : AppColors.textMuted,
                            ),
                            const SizedBox(width: 4.0),
                            Text(
                              'Previous Step',
                              style: TextStyle(
                                fontSize: 13.0,
                                fontWeight: FontWeight.bold,
                                color: _focusedStepIndex > 0 ? AppColors.aubergine : AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      CupertinoButton(
                        padding: EdgeInsets.zero,
                        onPressed: _focusedStepIndex < steps.length - 1
                            ? () => setState(() => _focusedStepIndex++)
                            : null,
                        child: Row(
                          children: [
                            Text(
                              'Next Step',
                              style: TextStyle(
                                fontSize: 13.0,
                                fontWeight: FontWeight.bold,
                                color: _focusedStepIndex < steps.length - 1 ? AppColors.aubergine : AppColors.textMuted,
                              ),
                            ),
                            const SizedBox(width: 4.0),
                            Icon(
                              CupertinoIcons.chevron_right,
                              size: 16.0,
                              color: _focusedStepIndex < steps.length - 1 ? AppColors.aubergine : AppColors.textMuted,
                            ),
                          ],
                        ),
                      ),
                    ],
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
