class MaterialItem {
  String id;
  String name;
  double unitCost;
  double quantityPerBatch;
  String unit;

  MaterialItem({
    required this.id,
    required this.name,
    required this.unitCost,
    required this.quantityPerBatch,
    required this.unit,
  });

  double get totalCost => unitCost * quantityPerBatch;
}

class PricingCalculation {
  final String id;
  final String userId;
  String productName;
  List<MaterialItem> materials;
  double hourlyLaborRate;
  double laborHoursPerBatch;
  double monthlyOverheadAllocation;
  int batchYield;
  double targetMarginPercent;
  DateTime createdAt;

  PricingCalculation({
    required this.id,
    required this.userId,
    required this.productName,
    required this.materials,
    required this.hourlyLaborRate,
    required this.laborHoursPerBatch,
    required this.monthlyOverheadAllocation,
    required this.batchYield,
    required this.targetMarginPercent,
    required this.createdAt,
  });

  double get totalMaterialsCost =>
      materials.fold(0.0, (sum, item) => sum + item.totalCost);

  double get totalLaborCost => hourlyLaborRate * laborHoursPerBatch;

  double get totalBatchCost =>
      totalMaterialsCost + totalLaborCost + (monthlyOverheadAllocation / 10.0);

  double get unitCost => batchYield > 0 ? totalBatchCost / batchYield : 0.0;

  double get suggestedUnitPrice {
    if (unitCost <= 0) return 0.0;
    double marginDecimal = (targetMarginPercent / 100.0).clamp(0.0, 0.95);
    return unitCost / (1.0 - marginDecimal);
  }

  double get unitProfit => suggestedUnitPrice - unitCost;

  double get grossMarginPercent =>
      suggestedUnitPrice > 0 ? (unitProfit / suggestedUnitPrice) * 100 : 0.0;

  bool get isMarginHealthy => grossMarginPercent >= 35.0;
  bool get isMarginCritical => grossMarginPercent < 25.0;
}
