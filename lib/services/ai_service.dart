import '../models/roadmap_model.dart';
import '../models/pricing_model.dart';

/// Claude API Integration Service for Likhora
/// Environment Configuration Key Location:
/// Pass --dart-define=CLAUDE_API_KEY=your_key_here during launch or build.
class AIService {
  AIService._();

  static const String _apiKeyFromEnv = String.fromEnvironment('CLAUDE_API_KEY');

  static bool get isApiKeyConfigured => _apiKeyFromEnv.isNotEmpty;

  /// Calls Claude API to adjust and annotate roadmap steps for budget & location
  static Future<List<RoadmapStep>> personalizeRoadmapSteps({
    required String businessType,
    required double budget,
    required String location,
    required String experienceLevel,
    required List<RoadmapStep> baseSteps,
  }) async {
    // Simulate AI network latency
    await Future.delayed(const Duration(milliseconds: 1200));

    return baseSteps.map((step) {
      String annotation;

      if (budget < 20000) {
        annotation =
            'Likhora AI Calibration ($location): Capital is under ₱20,000. Priority focus: home-based registration & online pre-orders.';
      } else if (budget < 70000) {
        annotation =
            'Likhora AI Calibration ($location): Allocate ₱${(budget * 0.4).toStringAsFixed(0)} for commercial equipment and test pop-up stalls.';
      } else {
        annotation =
            'Likhora AI Calibration ($location): Full shop budget. Allocate ₱${(budget * 0.25).toStringAsFixed(0)} for shop fit-out and permits.';
      }

      step.aiAnnotation = annotation;
      return step;
    }).toList();
  }

  /// Returns reasonable numeric range suggestion for cost inputs
  static Future<Map<String, double>> suggestCostInputRange({
    required String businessType,
    required String fieldName, // 'labor' or 'overhead'
  }) async {
    await Future.delayed(const Duration(milliseconds: 700));

    if (fieldName == 'labor') {
      return {'min': 60.0, 'max': 95.0}; // hourly rate in PHP
    } else {
      return {'min': 1500.0, 'max': 4500.0}; // monthly overhead allocation
    }
  }

  /// Generates business name & tagline suggestions
  static Future<List<Map<String, String>>> generateBusinessNames({
    required String businessType,
    required String keywords,
  }) async {
    await Future.delayed(const Duration(milliseconds: 900));

    final kw = keywords.isEmpty ? 'Kape' : keywords;

    return [
      {'name': '$kw Negosyo Co.', 'slogan': 'Tatak Pinoy, Abot-Kaya Quality'},
      {'name': 'Bayani $kw Hub', 'slogan': 'Crafted locally with passion'},
      {'name': 'Likha $kw Lab', 'slogan': 'Modern solutions for everyday PH'},
      {'name': 'Tangkilik $kw', 'slogan': 'Your trusted neighborhood choice'},
    ];
  }

  /// Generates contextual progress nudge referencing completed step and next step
  static String generateContextualNudge({
    required String completedStepTitle,
    required String nextStepTitle,
  }) {
    return 'With "$completedStepTitle" completed, your legal foundation is secure. Next up: "$nextStepTitle" — lock in your raw material costs before soft launch!';
  }
}
