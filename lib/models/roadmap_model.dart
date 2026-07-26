enum StepCategory {
  legal('Permit & Legal'),
  costing('Costing & Pricing'),
  supplier('Supplier Sourcing'),
  launch('Soft Launch & Marketing');

  final String displayName;
  const StepCategory(this.displayName);
}

enum StepStatus {
  locked,
  active,
  completed,
}

class RoadmapChecklistItem {
  final String id;
  final String title;
  bool isCompleted;

  RoadmapChecklistItem({
    required this.id,
    required this.title,
    this.isCompleted = false,
  });
}

class RoadmapStep {
  final String id;
  final String title;
  final String description;
  final StepCategory category;
  final double estimatedCostMin;
  final double estimatedCostMax;
  final int estimatedDurationDays;
  StepStatus status;
  final List<RoadmapChecklistItem> requirements;
  String? aiAnnotation;
  final List<String> linkedSupplierTags;

  RoadmapStep({
    required this.id,
    required this.title,
    required this.description,
    required this.category,
    required this.estimatedCostMin,
    required this.estimatedCostMax,
    required this.estimatedDurationDays,
    this.status = StepStatus.locked,
    required this.requirements,
    this.aiAnnotation,
    required this.linkedSupplierTags,
  });

  bool get isCompleted => status == StepStatus.completed;
  bool get isActive => status == StepStatus.active;
}

class RoadmapTemplate {
  final String id;
  final String businessType;
  final String title;
  final String description;
  final List<RoadmapStep> steps;

  RoadmapTemplate({
    required this.id,
    required this.businessType,
    required this.title,
    required this.description,
    required this.steps,
  });
}
