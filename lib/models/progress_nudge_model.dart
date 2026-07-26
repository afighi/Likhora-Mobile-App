class ProgressNudge {
  final String id;
  final String userId;
  final String relatedStepId;
  final String title;
  final String message;
  final DateTime createdAt;

  const ProgressNudge({
    required this.id,
    required this.userId,
    required this.relatedStepId,
    required this.title,
    required this.message,
    required this.createdAt,
  });
}
