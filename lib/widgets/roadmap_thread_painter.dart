import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Custom Painter that draws a winding connected business journey thread
class RoadmapThreadPainter extends CustomPainter {
  final int totalSteps;
  final int completedSteps;
  final int activeStepIndex;

  RoadmapThreadPainter({
    required this.totalSteps,
    required this.completedSteps,
    required this.activeStepIndex,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (totalSteps <= 1) return;

    final paintCompleted = Paint()
      ..color = AppColors.green
      ..strokeWidth = 3.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final paintActive = Paint()
      ..color = AppColors.yellow
      ..strokeWidth = 3.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final paintUpcoming = Paint()
      ..color = AppColors.aubergine.withValues(alpha: 0.18)
      ..strokeWidth = 2.0
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final double startX = 24.0; // Aligned with the left milestone node icons
    final double stepHeight = size.height / (totalSteps > 1 ? (totalSteps - 1) : 1);

    for (int i = 0; i < totalSteps - 1; i++) {
      final double startY = i * stepHeight + 24.0;
      final double endY = (i + 1) * stepHeight + 24.0;

      final path = Path();
      path.moveTo(startX, startY);
      // Gentle curve to make the thread organic and non-rigid
      path.cubicTo(
        startX + 14.0, startY + (stepHeight * 0.35),
        startX - 14.0, startY + (stepHeight * 0.65),
        startX, endY,
      );

      if (i < completedSteps) {
        canvas.drawPath(path, paintCompleted);
      } else if (i == activeStepIndex) {
        canvas.drawPath(path, paintActive);
      } else {
        // Draw dashed path for upcoming steps
        _drawDashedPath(canvas, path, paintUpcoming);
      }
    }
  }

  void _drawDashedPath(Canvas canvas, Path path, Paint paint) {
    const double dashWidth = 5.0;
    const double dashSpace = 4.0;
    final pathMetrics = path.computeMetrics();

    for (final metric in pathMetrics) {
      double distance = 0.0;
      while (distance < metric.length) {
        final double len = (distance + dashWidth > metric.length) ? metric.length - distance : dashWidth;
        canvas.drawPath(metric.extractPath(distance, distance + len), paint);
        distance += dashWidth + dashSpace;
      }
    }
  }

  @override
  bool shouldRepaint(covariant RoadmapThreadPainter oldDelegate) {
    return oldDelegate.completedSteps != completedSteps ||
        oldDelegate.activeStepIndex != activeStepIndex ||
        oldDelegate.totalSteps != totalSteps;
  }
}
