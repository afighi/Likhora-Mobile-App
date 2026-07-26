import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../models/supplier_model.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../widgets/app_card.dart';
import '../widgets/app_button.dart';
import '../widgets/ios_badge.dart';
import 'admin_supplier_modal.dart';

class SupplierDirectoryScreen extends StatelessWidget {
  const SupplierDirectoryScreen({super.key});

  static const List<String> _categories = [
    'All',
    'Rice & Grains',
    'Meat',
    'Packaging',
    'Nearby',
  ];

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);
    final suppliers = appState.filteredSuppliers;

    return CupertinoPageScaffold(
      backgroundColor: AppColors.background, // Warm Parchment #F6F1E9
      child: CustomScrollView(
        slivers: [
          // iOS Large Title Header
          CupertinoSliverNavigationBar(
            largeTitle: Text(
              'Suppliers',
              style: AppTypography.largeTitle(),
            ),
            backgroundColor: AppColors.background.withValues(alpha: 0.90),
            border: null,
            trailing: CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () {
                showCupertinoModalPopup(
                  context: context,
                  builder: (ctx) => const AdminSupplierModal(),
                );
              },
              child: const Icon(CupertinoIcons.plus_circle_fill, color: AppColors.aubergine, size: 28.0),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Location Bar
                  Row(
                    children: [
                      const Icon(CupertinoIcons.location_solid, color: AppColors.blue, size: 16.0),
                      const SizedBox(width: 4.0),
                      Text(
                        'Active Location: ${appState.selectedLocation}',
                        style: const TextStyle(
                          fontSize: 13.0,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textDark,
                        ),
                      ),
                      const Spacer(),
                      GestureDetector(
                        onTap: () {
                          // Change location dialog
                        },
                        child: const Text(
                          'Change',
                          style: TextStyle(fontSize: 12.0, fontWeight: FontWeight.bold, color: AppColors.blue),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12.0),

                  // Search Field
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 2.0),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16.0),
                      border: Border.all(color: AppColors.hairlineBorder),
                    ),
                    child: Row(
                      children: [
                        const Icon(CupertinoIcons.search, color: AppColors.textMuted, size: 18.0),
                        const SizedBox(width: 8.0),
                        Expanded(
                          child: TextField(
                            decoration: const InputDecoration(
                              hintText: 'Search rice, meat, packaging...',
                              border: InputBorder.none,
                            ),
                            style: AppTypography.bodyBold(),
                            onChanged: (val) => appState.setSupplierSearchQuery(val),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 12.0),

                  // Category Chips Row
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: _categories.map((cat) {
                        final isSelected = appState.selectedSupplierCategory == cat;
                        return Padding(
                          padding: const EdgeInsets.only(right: 8.0),
                          child: GestureDetector(
                            onTap: () => appState.setSupplierCategoryFilter(cat),
                            child: AnimatedContainer(
                              duration: const Duration(milliseconds: 200),
                              padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 8.0),
                              decoration: BoxDecoration(
                                color: isSelected ? AppColors.aubergine : Colors.white,
                                borderRadius: BorderRadius.circular(20.0),
                                border: Border.all(
                                  color: isSelected ? AppColors.aubergine : AppColors.hairlineBorder,
                                ),
                              ),
                              child: Text(
                                cat,
                                style: TextStyle(
                                  fontSize: 12.5,
                                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                                  color: isSelected ? Colors.white : AppColors.textDark,
                                ),
                              ),
                            ),
                          ),
                        );
                      }).toList(),
                    ),
                  ),

                  const SizedBox(height: 14.0),

                  // 1. Map Preview Container Card
                  AppCard(
                    padding: EdgeInsets.zero,
                    child: Stack(
                      children: [
                        Container(
                          height: 120.0,
                          width: double.infinity,
                          decoration: BoxDecoration(
                            color: AppColors.blueTint,
                            borderRadius: BorderRadius.circular(24.0),
                          ),
                          child: CustomPaint(
                            painter: _MapGridPainter(),
                          ),
                        ),
                        Positioned.fill(
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Icon(CupertinoIcons.location_solid, color: AppColors.blue, size: 32.0),
                                const SizedBox(height: 4.0),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(14.0),
                                    boxShadow: [
                                      BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 8.0),
                                    ],
                                  ),
                                  child: const Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        'Open Pasig Map Preview',
                                        style: TextStyle(
                                          fontSize: 12.0,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.aubergine,
                                        ),
                                      ),
                                      SizedBox(width: 4.0),
                                      Icon(CupertinoIcons.chevron_right, size: 12.0, color: AppColors.aubergine),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14.0),

                  // 2. AI Supplier Matching Blue Guidance Card
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
                                'AI Supplier Matching',
                                style: TextStyle(
                                  fontSize: 13.0,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textDark,
                                ),
                              ),
                              SizedBox(height: 4.0),
                              Text(
                                'Suppliers are pre-filtered specifically for your active Carinderia cost sheet, ordered by closeness and bulk affordability.',
                                style: TextStyle(fontSize: 12.5, color: AppColors.textDark, height: 1.35),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14.0),

                  // Supplier List Section Header
                  Text(
                    'Matched Vetted Suppliers (${suppliers.length})',
                    style: const TextStyle(
                      fontSize: 16.0,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textDark,
                    ),
                  ),
                  const SizedBox(height: 10.0),

                  // 3. Supplier Cards
                  ...suppliers.map((s) {
                    return AppCard(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8.0),
                                decoration: BoxDecoration(
                                  color: AppColors.blueTint,
                                  borderRadius: BorderRadius.circular(14.0),
                                ),
                                child: const Icon(CupertinoIcons.building_2_fill, color: AppColors.blue, size: 20.0),
                              ),
                              const SizedBox(width: 12.0),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        Expanded(
                                          child: Text(
                                            s.name,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontSize: 15.5,
                                              fontWeight: FontWeight.bold,
                                              color: AppColors.textDark,
                                            ),
                                          ),
                                        ),
                                        const SizedBox(width: 4.0),
                                        const Icon(CupertinoIcons.checkmark_seal_fill, color: AppColors.blue, size: 14.0),
                                      ],
                                    ),
                                    Text(
                                      '${s.category} • ${s.distanceKm.toStringAsFixed(1)} km away',
                                      style: const TextStyle(fontSize: 12.0, color: AppColors.textMuted),
                                    ),
                                  ],
                                ),
                              ),
                              IOSBadge(label: '4.9 ⭐', style: BadgeStyle.yellow),
                            ],
                          ),
                          const SizedBox(height: 8.0),
                          Text(
                            s.address,
                            style: const TextStyle(fontSize: 12.5, color: AppColors.textMuted),
                          ),
                          const SizedBox(height: 10.0),
                          Wrap(
                            spacing: 4.0,
                            runSpacing: 4.0,
                            children: s.linkedProductTags.map((tag) {
                              return IOSBadge(label: tag, style: BadgeStyle.blue);
                            }).toList(),
                          ),
                          const SizedBox(height: 14.0),
                          Row(
                            children: [
                              // Contact Button (Tinted Aubergine Pill)
                              Expanded(
                                child: GestureDetector(
                                  onTap: () {
                                    showCupertinoDialog(
                                      context: context,
                                      builder: (ctx) => CupertinoAlertDialog(
                                        title: Text(s.name),
                                        content: Text('\nContact: ${s.contactInfo}\nAddress: ${s.address}'),
                                        actions: [
                                          CupertinoDialogAction(
                                            child: const Text('Close'),
                                            onPressed: () => Navigator.pop(ctx),
                                          ),
                                        ],
                                      ),
                                    );
                                  },
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(vertical: 10.0),
                                    decoration: BoxDecoration(
                                      color: AppColors.aubergineTint,
                                      borderRadius: BorderRadius.circular(16.0),
                                    ),
                                    child: const Row(
                                      mainAxisAlignment: MainAxisAlignment.center,
                                      children: [
                                        Icon(CupertinoIcons.phone_fill, size: 14.0, color: AppColors.aubergine),
                                        SizedBox(width: 6.0),
                                        Text(
                                          'Contact',
                                          style: TextStyle(
                                            fontSize: 13.0,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.aubergine,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 10.0),
                              // Primary Add to Plan Button (Yellow CTA)
                              Expanded(
                                child: AppButton(
                                  label: 'Add to Plan',
                                  icon: CupertinoIcons.add,
                                  onPressed: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text('${s.name} added to launch suppliers!')),
                                    );
                                  },
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    );
                  }),

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

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = AppColors.blue.withValues(alpha: 0.15)
      ..strokeWidth = 1.5;

    for (double i = 0; i < size.width; i += 24.0) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), paint);
    }
    for (double j = 0; j < size.height; j += 24.0) {
      canvas.drawLine(Offset(0, j), Offset(size.width, j), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
