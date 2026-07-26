import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../models/pricing_model.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../widgets/app_card.dart';
import '../widgets/app_button.dart';
import '../widgets/currency_text.dart';

class PricingCalculatorScreen extends StatefulWidget {
  const PricingCalculatorScreen({super.key});

  @override
  State<PricingCalculatorScreen> createState() => _PricingCalculatorScreenState();
}

class _PricingCalculatorScreenState extends State<PricingCalculatorScreen> {
  void _showAddItemModal(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context, listen: false);
    final nameCtrl = TextEditingController();
    final costCtrl = TextEditingController(text: '15.0');
    final qtyCtrl = TextEditingController(text: '1');
    final unitCtrl = TextEditingController(text: 'pc');

    showCupertinoDialog(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text(
          'Add Cost Item',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        content: Padding(
          padding: const EdgeInsets.only(top: 12.0),
          child: Column(
            children: [
              CupertinoTextField(
                controller: nameCtrl,
                placeholder: 'Item Name (e.g. Pork / Packaging)',
              ),
              const SizedBox(height: 8.0),
              CupertinoTextField(
                controller: costCtrl,
                placeholder: 'Unit Cost in PHP (₱)',
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
              ),
              const SizedBox(height: 8.0),
              Row(
                children: [
                  Expanded(
                    child: CupertinoTextField(
                      controller: qtyCtrl,
                      placeholder: 'Batch Qty',
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    ),
                  ),
                  const SizedBox(width: 8.0),
                  Expanded(
                    child: CupertinoTextField(
                      controller: unitCtrl,
                      placeholder: 'Unit (kg/pc)',
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        actions: [
          CupertinoDialogAction(
            child: const Text('Cancel'),
            onPressed: () => Navigator.pop(ctx),
          ),
          CupertinoDialogAction(
            isDefaultAction: true,
            onPressed: () {
              if (nameCtrl.text.isNotEmpty) {
                appState.addMaterialItem(
                  MaterialItem(
                    id: 'm_${DateTime.now().millisecondsSinceEpoch}',
                    name: nameCtrl.text,
                    unitCost: double.tryParse(costCtrl.text) ?? 10.0,
                    quantityPerBatch: double.tryParse(qtyCtrl.text) ?? 1.0,
                    unit: unitCtrl.text.isEmpty ? 'pc' : unitCtrl.text,
                  ),
                );
              }
              Navigator.pop(ctx);
            },
            child: const Text('Add Item'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);
    final calc = appState.pricingCalculation;

    return CupertinoPageScaffold(
      backgroundColor: AppColors.background, // Warm Parchment #F6F1E9
      child: CustomScrollView(
        slivers: [
          // iOS Navigation Header
          CupertinoSliverNavigationBar(
            largeTitle: Text(
              'Pricing',
              style: AppTypography.largeTitle(),
            ),
            backgroundColor: AppColors.background.withValues(alpha: 0.90),
            border: null,
            trailing: CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: () => _showAddItemModal(context),
              child: const Icon(CupertinoIcons.add_circled_solid, color: AppColors.aubergine, size: 26.0),
            ),
          ),

          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Cost Sheet & Margin Calculator • ${calc.productName}',
                    style: AppTypography.caption(color: AppColors.textMuted),
                  ),
                  const SizedBox(height: 14.0),

                  // 1. Hero Summary Card (Aubergine #4A154B)
                  AppCard(
                    backgroundColor: AppColors.aubergine,
                    borderColor: AppColors.aubergine,
                    child: Column(
                      children: [
                        const Text(
                          'SUGGESTED SELLING PRICE PER UNIT',
                          style: TextStyle(
                            fontSize: 11.0,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.8,
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 6.0),
                        CurrencyText(
                          amount: calc.suggestedUnitPrice,
                          fontSize: 38.0,
                          color: AppColors.yellow,
                        ),
                        const SizedBox(height: 16.0),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(16.0),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceAround,
                            children: [
                              _MetricCol(label: 'Unit Cost', amount: calc.unitCost),
                              _MetricCol(label: 'Unit Profit', amount: calc.unitProfit),
                              _MetricCol(
                                label: 'Gross Margin',
                                customText: '${calc.grossMarginPercent.toStringAsFixed(1)}%',
                                textColor: calc.isMarginCritical ? AppColors.pinkRed : AppColors.green,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // 2. Interactive Target Margin Range Slider Card
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Target Gross Profit Margin',
                              style: TextStyle(
                                fontSize: 15.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                              decoration: BoxDecoration(
                                color: calc.isMarginCritical
                                    ? AppColors.pinkRedTint
                                    : AppColors.greenTint,
                                borderRadius: BorderRadius.circular(12.0),
                              ),
                              child: Text(
                                '${calc.targetMarginPercent.toStringAsFixed(0)}%',
                                style: TextStyle(
                                  fontSize: 13.0,
                                  fontWeight: FontWeight.bold,
                                  color: calc.isMarginCritical ? AppColors.pinkRed : AppColors.green,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10.0),

                        CupertinoSlider(
                          value: calc.targetMarginPercent,
                          min: 10.0,
                          max: 70.0,
                          divisions: 60,
                          activeColor: calc.isMarginCritical ? AppColors.pinkRed : AppColors.green,
                          thumbColor: AppColors.yellow,
                          onChanged: (val) {
                            appState.updatePricingField(targetMarginPercent: val);
                          },
                        ),

                        const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 4.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text('10% (Low)', style: TextStyle(fontSize: 11.5, color: AppColors.textMuted)),
                              Text('35% (Healthy)', style: TextStyle(fontSize: 11.5, color: AppColors.textMuted)),
                              Text('70% (High)', style: TextStyle(fontSize: 11.5, color: AppColors.textMuted)),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // 3. AI Margin Health Advisor Banner
                  AppCard(
                    backgroundColor: calc.isMarginCritical ? AppColors.pinkRedTint : AppColors.greenTint,
                    borderColor: calc.isMarginCritical
                        ? AppColors.pinkRed.withValues(alpha: 0.3)
                        : AppColors.green.withValues(alpha: 0.3),
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(6.0),
                          decoration: BoxDecoration(
                            color: calc.isMarginCritical ? AppColors.pinkRed : AppColors.green,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            calc.isMarginCritical
                                ? CupertinoIcons.exclamationmark_triangle_fill
                                : CupertinoIcons.checkmark_seal_fill,
                            size: 16.0,
                            color: Colors.white,
                          ),
                        ),
                        const SizedBox(width: 10.0),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                calc.isMarginCritical
                                    ? 'Thin Profit Margin Alert'
                                    : 'Healthy Business Margin',
                                style: TextStyle(
                                  fontSize: 13.0,
                                  fontWeight: FontWeight.bold,
                                  color: calc.isMarginCritical ? AppColors.pinkRed : AppColors.green,
                                ),
                              ),
                              const SizedBox(height: 4.0),
                              Text(
                                calc.isMarginCritical
                                    ? 'Margin is below 25%. Switch to Divisoria Packaging Hub to save ₱1.50 per cup and raise your margin to 38%.'
                                    : 'Margin is strong at ${calc.grossMarginPercent.toStringAsFixed(0)}%. Round unit price to ₱${calc.suggestedUnitPrice.ceil()} for clean cash transactions.',
                                style: const TextStyle(fontSize: 12.5, color: AppColors.textDark, height: 1.35),
                              ),
                              if (calc.isMarginCritical) ...[
                                const SizedBox(height: 8.0),
                                GestureDetector(
                                  onTap: () => appState.setTabIndex(4), // Jump to Suppliers
                                  child: const Row(
                                    children: [
                                      Text(
                                        'Find cheaper suppliers →',
                                        style: TextStyle(
                                          fontSize: 12.0,
                                          fontWeight: FontWeight.bold,
                                          color: AppColors.pinkRed,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // 4. Batch Parameters Control Card
                  AppCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Batch Production Parameters',
                          style: TextStyle(fontSize: 15.0, fontWeight: FontWeight.bold, color: AppColors.textDark),
                        ),
                        const SizedBox(height: 12.0),

                        _InputRow(
                          label: 'Batch Yield Output (Servings/Units)',
                          value: '${calc.batchYield}',
                          onChanged: (val) {
                            final i = int.tryParse(val);
                            if (i != null && i > 0) {
                              appState.updatePricingField(batchYield: i);
                            }
                          },
                        ),
                        const Divider(color: AppColors.hairlineBorder),
                        _InputRow(
                          label: 'Labor Hours Per Batch',
                          value: calc.laborHoursPerBatch.toStringAsFixed(1),
                          onChanged: (val) {
                            final d = double.tryParse(val);
                            if (d != null) {
                              appState.updatePricingField(laborHoursPerBatch: d);
                            }
                          },
                        ),
                        const Divider(color: AppColors.hairlineBorder),
                        _InputRow(
                          label: 'Hourly Labor Rate (₱/hr)',
                          value: calc.hourlyLaborRate.toStringAsFixed(0),
                          onChanged: (val) {
                            final d = double.tryParse(val);
                            if (d != null) {
                              appState.updatePricingField(hourlyLaborRate: d);
                            }
                          },
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 16.0),

                  // 5. Raw Materials & Ingredients List Header
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Ingredients & Cost Items (${calc.materials.length})',
                        style: const TextStyle(fontSize: 16.0, fontWeight: FontWeight.bold, color: AppColors.textDark),
                      ),
                      CupertinoButton(
                        padding: EdgeInsets.zero,
                        onPressed: () => _showAddItemModal(context),
                        child: const Text(
                          'Add Item',
                          style: TextStyle(fontSize: 13.0, fontWeight: FontWeight.bold, color: AppColors.aubergine),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10.0),

                  // Ingredients List
                  ...calc.materials.map((item) {
                    return AppCard(
                      child: Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(8.0),
                            decoration: BoxDecoration(
                              color: AppColors.yellowTint,
                              borderRadius: BorderRadius.circular(14.0),
                            ),
                            child: const Icon(CupertinoIcons.cube_box_fill, color: AppColors.yellow, size: 20.0),
                          ),
                          const SizedBox(width: 12.0),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.name,
                                  style: const TextStyle(
                                    fontSize: 14.5,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.textDark,
                                  ),
                                ),
                                Text(
                                  '₱${item.unitCost.toStringAsFixed(2)} / ${item.unit} • Qty: ${item.quantityPerBatch.toStringAsFixed(1)}',
                                  style: const TextStyle(fontSize: 12.0, color: AppColors.textMuted),
                                ),
                              ],
                            ),
                          ),

                          // Monospace Currency Amount
                          CurrencyText(amount: item.totalCost, fontSize: 14.5),

                          const SizedBox(width: 8.0),

                          GestureDetector(
                            onTap: () => appState.removeMaterialItem(item.id),
                            child: const Icon(CupertinoIcons.minus_circle_fill, color: AppColors.pinkRed, size: 20.0),
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

class _MetricCol extends StatelessWidget {
  final String label;
  final double? amount;
  final String? customText;
  final Color textColor;

  const _MetricCol({
    required this.label,
    this.amount,
    this.customText,
    this.textColor = Colors.white,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 11.0, color: Colors.white70)),
        const SizedBox(height: 2.0),
        customText != null
            ? Text(customText!, style: TextStyle(fontSize: 14.0, fontWeight: FontWeight.bold, color: textColor))
            : CurrencyText(amount: amount ?? 0.0, fontSize: 14.0, color: textColor),
      ],
    );
  }
}

class _InputRow extends StatelessWidget {
  final String label;
  final String value;
  final ValueChanged<String> onChanged;

  const _InputRow({
    required this.label,
    required this.value,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Text(
              label,
              style: const TextStyle(fontSize: 13.0, color: AppColors.textDark, fontWeight: FontWeight.w500),
            ),
          ),
          SizedBox(
            width: 72.0,
            height: 32.0,
            child: CupertinoTextField(
              controller: TextEditingController(text: value),
              textAlign: TextAlign.right,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.bold,
                color: AppColors.aubergine,
              ),
              decoration: BoxDecoration(
                color: AppColors.background,
                borderRadius: BorderRadius.circular(8.0),
                border: Border.all(color: AppColors.hairlineBorder),
              ),
              onChanged: onChanged,
            ),
          ),
        ],
      ),
    );
  }
}
