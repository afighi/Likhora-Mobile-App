import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

class PricingCalculatorScreen extends StatefulWidget {
  const PricingCalculatorScreen({super.key});

  @override
  State<PricingCalculatorScreen> createState() => _PricingCalculatorScreenState();
}

class _PricingCalculatorScreenState extends State<PricingCalculatorScreen> {
  double _targetMargin = 0.35; // 35% default matching mockup

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);
    final items = appState.pricingItems;

    final totalCost = appState.totalIngredientsCost;
    final suggestedPrice = (totalCost / (1.0 - _targetMargin)).roundToDouble();
    final profitPerServing = suggestedPrice - totalCost;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 12.0, bottom: 100.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Bar Header with Bell Button
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const SizedBox(),
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
                ],
              ),

              const SizedBox(height: 4.0),

              // Title & Subtitle
              Text(
                'Pricing',
                style: AppTypography.largeTitle(),
              ),
              const SizedBox(height: 4.0),
              const Text(
                'Pork Silog · per serving',
                style: TextStyle(
                  fontSize: 14.0,
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),

              const SizedBox(height: 20.0),

              // Dark Purple Hero Price Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(22.0),
                decoration: BoxDecoration(
                  color: AppColors.aubergine,
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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Suggested selling price',
                      style: TextStyle(
                        fontSize: 13.0,
                        color: Color(0xFFD8B4FE),
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                    const SizedBox(height: 4.0),
                    Text(
                      '₱${suggestedPrice.toInt()}',
                      style: const TextStyle(
                        fontSize: 42.0,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                        letterSpacing: -1.0,
                      ),
                    ),
                    const SizedBox(height: 20.0),

                    // Side-by-Side Dark Translucent Sub-Cards
                    Row(
                      children: [
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
                            decoration: BoxDecoration(
                              color: const Color(0xFF3B123A),
                              borderRadius: BorderRadius.circular(16.0),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Total cost',
                                  style: TextStyle(
                                    fontSize: 12.0,
                                    color: Color(0xFFE2D9EC),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 4.0),
                                Text(
                                  '₱${totalCost.toInt()}',
                                  style: const TextStyle(
                                    fontSize: 22.0,
                                    fontWeight: FontWeight.w800,
                                    color: Colors.white,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 12.0),
                        Expanded(
                          child: Container(
                            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 14.0),
                            decoration: BoxDecoration(
                              color: const Color(0xFF3B123A),
                              borderRadius: BorderRadius.circular(16.0),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Profit / serving',
                                  style: TextStyle(
                                    fontSize: 12.0,
                                    color: Color(0xFFE2D9EC),
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                                const SizedBox(height: 4.0),
                                Text(
                                  '₱${profitPerServing.toInt()}',
                                  style: const TextStyle(
                                    fontSize: 22.0,
                                    fontWeight: FontWeight.w800,
                                    color: Color(0xFFFBBF24),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16.0),

              // Target Margin Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20.0),
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
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Target margin',
                          style: TextStyle(
                            fontSize: 16.0,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textDark,
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 5.0),
                          decoration: BoxDecoration(
                            color: const Color(0xFFDCFCE7),
                            borderRadius: BorderRadius.circular(14.0),
                          ),
                          child: Text(
                            '${(_targetMargin * 100).toInt()}%',
                            style: const TextStyle(
                              fontSize: 13.0,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF16A34A),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12.0),
                    SliderTheme(
                      data: SliderThemeData(
                        trackHeight: 8.0,
                        activeTrackColor: const Color(0xFF38A169),
                        inactiveTrackColor: const Color(0xFF374151),
                        thumbColor: const Color(0xFF38A169),
                        overlayColor: const Color(0xFF38A169).withValues(alpha: 0.2),
                        thumbShape: const RoundSliderThumbShape(enabledThumbRadius: 10.0),
                      ),
                      child: Slider(
                        value: _targetMargin,
                        min: 0.10,
                        max: 0.70,
                        onChanged: (val) {
                          setState(() => _targetMargin = val);
                        },
                      ),
                    ),
                    const Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '10%',
                          style: TextStyle(fontSize: 12.0, color: AppColors.textMuted),
                        ),
                        Text(
                          '70%',
                          style: TextStyle(fontSize: 12.0, color: AppColors.textMuted),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16.0),

              // Light Blue AI Suggestion Card
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
                            'Likhora AI · Suggestion',
                            style: TextStyle(
                              fontSize: 14.0,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0284C7),
                            ),
                          ),
                          SizedBox(height: 4.0),
                          Text(
                            'Beginner carinderias in Pasig average ₱18–₱24 profit per silog. You\'re in a healthy range — you can round up to ₱75 cleanly.',
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

              // Section: Cost breakdown
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Cost breakdown',
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
                      'Add item',
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

              // Breakdown Items List
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: items.length,
                separatorBuilder: (ctx, idx) => const SizedBox(height: 10.0),
                itemBuilder: (ctx, idx) {
                  final item = items[idx];
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18.0),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 8.0,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 42.0,
                          height: 42.0,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE0F2FE),
                            borderRadius: BorderRadius.circular(12.0),
                          ),
                          child: const Center(
                            child: Icon(
                              CupertinoIcons.cube_box,
                              size: 20.0,
                              color: Color(0xFF0284C7),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12.0),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                item.name,
                                style: const TextStyle(
                                  fontSize: 15.0,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textDark,
                                ),
                              ),
                              const SizedBox(height: 2.0),
                              const Text(
                                'Materials',
                                style: TextStyle(
                                  fontSize: 12.0,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        Row(
                          children: [
                            GestureDetector(
                              onTap: () {
                                if (item.unitCost > 5) {
                                  appState.updateIngredientCost(item.id, item.unitCost - 5.0);
                                }
                              },
                              child: Container(
                                width: 28.0,
                                height: 28.0,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFF3F4F6),
                                  shape: BoxShape.circle,
                                ),
                                child: const Center(
                                  child: Icon(CupertinoIcons.minus, size: 14.0, color: AppColors.textDark),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8.0),
                            Text(
                              '₱${item.unitCost.toInt()}',
                              style: const TextStyle(
                                fontSize: 15.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                            const SizedBox(width: 8.0),
                            GestureDetector(
                              onTap: () {
                                appState.updateIngredientCost(item.id, item.unitCost + 5.0);
                              },
                              child: Container(
                                width: 28.0,
                                height: 28.0,
                                decoration: const BoxDecoration(
                                  color: Color(0xFFF3E8FF),
                                  shape: BoxShape.circle,
                                ),
                                child: const Center(
                                  child: Icon(CupertinoIcons.plus, size: 14.0, color: AppColors.aubergine),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
