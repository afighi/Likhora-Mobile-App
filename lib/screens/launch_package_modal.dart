import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_colors.dart';
import '../widgets/ios_card.dart';
import '../widgets/ios_badge.dart';

class LaunchPackageModal extends StatelessWidget {
  const LaunchPackageModal({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);
    final calc = appState.pricingCalculation;
    final suppliers = appState.suppliers.take(3).toList();
    final steps = appState.roadmapSteps;

    return Container(
      height: MediaQuery.of(context).size.height * 0.9,
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28.0)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            const SizedBox(height: 10.0),
            Center(
              child: Container(
                width: 36.0,
                height: 4.0,
                decoration: BoxDecoration(
                  color: AppColors.hairlineBorder,
                  borderRadius: BorderRadius.circular(2.0),
                ),
              ),
            ),
            const SizedBox(height: 12.0),

            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Row(
                children: [
                  const Icon(CupertinoIcons.doc_richtext,
                      size: 22.0, color: AppColors.aubergine),
                  const SizedBox(width: 8.0),
                  const Expanded(
                    child: Text(
                      'Business Launch Package',
                      style: TextStyle(
                        fontSize: 18.0,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textDark,
                      ),
                    ),
                  ),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => Navigator.pop(context),
                    child: const Icon(CupertinoIcons.xmark_circle_fill,
                        color: AppColors.textMuted, size: 24.0),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12.0),

            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                children: [
                  // Portfolio Summary Card
                  IOSCard(
                    backgroundColor: AppColors.aubergineTint,
                    borderColor: AppColors.aubergine.withValues(alpha: 0.2),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${appState.selectedCategory} Business Blueprint',
                          style: const TextStyle(
                            fontSize: 17.0,
                            fontWeight: FontWeight.bold,
                            color: AppColors.aubergine,
                          ),
                        ),
                        const SizedBox(height: 4.0),
                        Text(
                          'Location: ${appState.selectedLocation} • Capital: ₱${appState.selectedBudget.toStringAsFixed(0)}',
                          style: const TextStyle(
                            fontSize: 12.5,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // Section 1: Financial & Pricing Unit Summary
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4.0, vertical: 6.0),
                    child: Text(
                      'Costing & Unit Pricing Sheet',
                      style: TextStyle(
                        fontSize: 15.0,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textDark,
                      ),
                    ),
                  ),

                  IOSCard(
                    child: Column(
                      children: [
                        _DetailRow(
                            label: 'Product / Service:', value: calc.productName),
                        _DetailRow(
                            label: 'Unit Cost:',
                            value: '₱${calc.unitCost.toStringAsFixed(2)}'),
                        _DetailRow(
                            label: 'Target Margin:',
                            value: '${calc.targetMarginPercent.toStringAsFixed(0)}%'),
                        _DetailRow(
                            label: 'Suggested Price:',
                            value: '₱${calc.suggestedUnitPrice.toStringAsFixed(2)}',
                            isBold: true),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // Section 2: Vetted Supplier Selection
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4.0, vertical: 6.0),
                    child: Text(
                      'Selected Supply Partners',
                      style: TextStyle(
                        fontSize: 15.0,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textDark,
                      ),
                    ),
                  ),

                  ...suppliers.map((s) {
                    return IOSCard(
                      margin: const EdgeInsets.only(bottom: 8.0),
                      child: Row(
                        children: [
                          const Icon(CupertinoIcons.building_2_fill,
                              color: AppColors.blue, size: 20.0),
                          const SizedBox(width: 10.0),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  s.name,
                                  style: const TextStyle(
                                    fontSize: 13.5,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  s.contactInfo,
                                  style: const TextStyle(
                                    fontSize: 11.5,
                                    color: AppColors.textMuted,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          IOSBadge(label: s.category, style: BadgeStyle.blue),
                        ],
                      ),
                    );
                  }),

                  const SizedBox(height: 24.0),

                  // Export Actions
                  CupertinoButton(
                    color: AppColors.yellow,
                    borderRadius: BorderRadius.circular(16.0),
                    onPressed: () {
                      Navigator.pop(context);
                    },
                    child: const Text(
                      'Share / Download Launch Package (PDF)',
                      style: TextStyle(
                        color: AppColors.textDark,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),

                  const SizedBox(height: 30.0),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final bool isBold;

  const _DetailRow({
    required this.label,
    required this.value,
    this.isBold = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontSize: 13.0, color: AppColors.textMuted)),
          Text(
            value,
            style: TextStyle(
              fontSize: 13.5,
              fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
              color: isBold ? AppColors.aubergine : AppColors.textDark,
            ),
          ),
        ],
      ),
    );
  }
}
