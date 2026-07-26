class AINudge {
  final String title;
  final String message;
  final String actionLabel;
  final String targetTab; // 'roadmap', 'pricing', 'supplier', 'progress'
  final String reason;

  const AINudge({
    required this.title,
    required this.message,
    required this.actionLabel,
    required this.targetTab,
    required this.reason,
  });
}
