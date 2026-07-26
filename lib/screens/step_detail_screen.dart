import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/roadmap_model.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_colors.dart';
import '../widgets/ios_card.dart';
import '../widgets/ios_badge.dart';

class StepDetailScreen extends StatelessWidget {
  final RoadmapStep step;

  const StepDetailScreen({super.key, required this.step});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);
    final linkedSuppliers = appState.suppliers
        .where((s) => step.linkedSupplierTags.any((tag) => s.linkedProductTags.contains(tag)))
        .toList();

    return CupertinoPageScaffold(
      backgroundColor: AppColors.background,
      navigationBar: CupertinoNavigationBar(
        middle: Text(
          step.title,
          style: const TextStyle(
            fontSize: 16.0,
            fontWeight: FontWeight.bold,
            color: AppColors.textDark,
          ),
        ),
        backgroundColor: AppColors.background.withValues(alpha: 0.80),
        border: null,
      ),
      child: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            // Overview Header Card
            IOSCard(
              backgroundColor: AppColors.cardBg,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IOSBadge(
                        label: step.category.displayName,
                        style: BadgeStyle.aubergine,
                      ),
                      const Spacer(),
                      if (step.estimatedCostMax > 0)
                        IOSBadge(
                          label: 'Est. ₱${step.estimatedCostMin.toStringAsFixed(0)} - ₱${step.estimatedCostMax.toStringAsFixed(0)}',
                          style: BadgeStyle.yellow,
                          icon: CupertinoIcons.money_dollar,
                        ),
                    ],
                  ),
                  const SizedBox(height: 12.0),
                  Text(
                    step.title,
                    style: const TextStyle(
                      fontSize: 20.0,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 8.0),
                  Text(
                    step.description,
                    style: const TextStyle(
                      fontSize: 14.0,
                      color: AppColors.textMuted,
                      height: 1.4,
                    ),
                  ),
                ],
              ),
            ),

            // AI Expert Advice Box
            if (step.aiAnnotation != null)
              IOSCard(
                backgroundColor: AppColors.yellowTint,
                borderColor: AppColors.yellow.withValues(alpha: 0.3),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(6.0),
                      decoration: const BoxDecoration(
                        color: AppColors.yellow,
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        CupertinoIcons.lightbulb_fill,
                        size: 14.0,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(width: 10.0),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Likhora AI Expert Advice',
                            style: TextStyle(
                              fontSize: 12.0,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textDark,
                            ),
                          ),
                          const SizedBox(height: 4.0),
                          Text(
                            step.aiAnnotation!,
                            style: const TextStyle(
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

            const SizedBox(height: 12.0),

            // Action Steps Requirements Checklist
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4.0, vertical: 6.0),
              child: Text(
                'Action Steps Checklist',
                style: TextStyle(
                  fontSize: 16.0,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                ),
              ),
            ),

            IOSCard(
              child: Column(
                children: step.requirements.map((req) {
                  return CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () {
                      appState.toggleChecklistItem(step.id, req.id);
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8.0),
                      child: Row(
                        children: [
                          Icon(
                            req.isCompleted
                                ? CupertinoIcons.checkmark_square_fill
                                : CupertinoIcons.square,
                            color: req.isCompleted
                                ? AppColors.green
                                : AppColors.textMuted,
                            size: 20.0,
                          ),
                          const SizedBox(width: 10.0),
                          Expanded(
                            child: Text(
                              req.title,
                              style: TextStyle(
                                fontSize: 14.0,
                                color: req.isCompleted
                                    ? AppColors.textMuted
                                    : AppColors.textDark,
                                decoration: req.isCompleted
                                    ? TextDecoration.lineThrough
                                    : null,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 16.0),

            // Contextual Supplier Recommendations Section
            if (linkedSuppliers.isNotEmpty) ...[
              const Padding(
                padding: EdgeInsets.symmetric(horizontal: 4.0, vertical: 6.0),
                child: Text(
                  'Recommended Vetted PH Suppliers',
                  style: TextStyle(
                    fontSize: 16.0,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textDark,
                  ),
                ),
              ),
              ...linkedSuppliers.map((supplier) {
                return IOSCard(
                  backgroundColor: AppColors.blueTint,
                  borderColor: AppColors.blue.withValues(alpha: 0.3),
                  child: Row(
                    children: [
                      const Icon(CupertinoIcons.building_2_fill,
                          size: 22.0, color: AppColors.blue),
                      const SizedBox(width: 12.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              supplier.name,
                              style: const TextStyle(
                                fontSize: 15.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                            const SizedBox(height: 2.0),
                            Text(
                              '${supplier.address} • Category: ${supplier.category}',
                              style: const TextStyle(
                                fontSize: 12.0,
                                color: AppColors.textMuted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      CupertinoButton(
                        padding: EdgeInsets.zero,
                        onPressed: () {
                          appState.setTabIndex(2);
                          Navigator.pop(context);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 10.0, vertical: 6.0),
                          decoration: BoxDecoration(
                            color: AppColors.aubergine,
                            borderRadius: BorderRadius.circular(12.0),
                          ),
                          child: const Text(
                            'View',
                            style: TextStyle(
                              fontSize: 12.0,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ],

            const SizedBox(height: 40.0),
          ],
        ),
      ),
    );
  }
}
