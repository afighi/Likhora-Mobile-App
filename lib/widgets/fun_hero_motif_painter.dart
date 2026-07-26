import 'package:flutter/material.dart';

/// Fun Geometric Pattern Motif Painter for Hero Cards
class FunHeroMotifPainter extends CustomPainter {
  final Color accentColor;

  FunHeroMotifPainter({required this.accentColor});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = accentColor.withValues(alpha: 0.08)
      ..style = PaintingStyle.fill;

    // Draw decorative background circles and grid dots
    for (double x = 20.0; x < size.width; x += 32.0) {
      for (double y = 20.0; y < size.height; y += 32.0) {
        canvas.drawCircle(Offset(x, y), 2.0, paint);
      }
    }

    // Top Right Decorative Starburst Arc
    final arcPaint = Paint()
      ..color = accentColor.withValues(alpha: 0.12)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.0;

    canvas.drawCircle(Offset(size.width * 0.88, size.height * 0.25), 45.0, arcPaint);
    canvas.drawCircle(Offset(size.width * 0.88, size.height * 0.25), 65.0, arcPaint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
