import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class WizardCategoryIllustration extends StatelessWidget {
  final double size;
  const WizardCategoryIllustration({super.key, this.size = 120.0});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _CategoryPainter(),
      ),
    );
  }
}

class _CategoryPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    final bgPaint = Paint()
      ..color = AppColors.aubergine.withValues(alpha: 0.08)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, size.width / 2, bgPaint);

    final strokePaint = Paint()
      ..color = AppColors.aubergine
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0
      ..strokeCap = StrokeCap.round;

    final yellowPaint = Paint()
      ..color = AppColors.yellow
      ..style = PaintingStyle.fill;

    // Roof Triangle
    final path = Path();
    path.moveTo(center.dx - 30, center.dy - 5);
    path.lineTo(center.dx, center.dy - 32);
    path.lineTo(center.dx + 30, center.dy - 5);
    path.close();
    canvas.drawPath(path, strokePaint);

    // Door Yellow Accent
    canvas.drawRRect(
      RRect.fromRectAndRadius(
        Rect.fromCenter(center: Offset(center.dx, center.dy + 15), width: 22, height: 26),
        const Radius.circular(4.0),
      ),
      yellowPaint,
    );

    // House Walls
    canvas.drawRect(
      Rect.fromLTRB(center.dx - 26, center.dy - 5, center.dx + 26, center.dy + 28),
      strokePaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class WizardBudgetIllustration extends StatelessWidget {
  final double size;
  const WizardBudgetIllustration({super.key, this.size = 120.0});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _BudgetPainter(),
      ),
    );
  }
}

class _BudgetPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    final bgPaint = Paint()
      ..color = AppColors.yellow.withValues(alpha: 0.12)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, size.width / 2, bgPaint);

    final yellowPaint = Paint()
      ..color = AppColors.yellow
      ..style = PaintingStyle.fill;

    final auberginePaint = Paint()
      ..color = AppColors.aubergine
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0;

    // Coins Stack
    canvas.drawCircle(Offset(center.dx - 12, center.dy + 10), 18, yellowPaint);
    canvas.drawCircle(Offset(center.dx - 12, center.dy + 10), 18, auberginePaint);

    canvas.drawCircle(Offset(center.dx + 12, center.dy - 8), 22, yellowPaint);
    canvas.drawCircle(Offset(center.dx + 12, center.dy - 8), 22, auberginePaint);

    // Monospace Currency Symbol overlay
    final textPainter = TextPainter(
      text: const TextSpan(
        text: '₱',
        style: TextStyle(
          fontSize: 22.0,
          fontWeight: FontWeight.bold,
          color: AppColors.aubergine,
        ),
      ),
      textDirection: TextDirection.ltr,
    );
    textPainter.layout();
    textPainter.paint(canvas, Offset(center.dx + 5, center.dy - 20));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class WizardLocationIllustration extends StatelessWidget {
  final double size;
  const WizardLocationIllustration({super.key, this.size = 120.0});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _LocationPainter(),
      ),
    );
  }
}

class _LocationPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    final bgPaint = Paint()
      ..color = AppColors.blue.withValues(alpha: 0.12)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, size.width / 2, bgPaint);

    final bluePaint = Paint()
      ..color = AppColors.blue
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.5;

    final pinPaint = Paint()
      ..color = AppColors.blue
      ..style = PaintingStyle.fill;

    // Radar Rings
    canvas.drawCircle(center, 38, bluePaint);
    canvas.drawCircle(center, 22, bluePaint);

    // Map Pin Shape
    final pinCenter = Offset(center.dx, center.dy - 6);
    canvas.drawCircle(pinCenter, 12, pinPaint);

    final pinPath = Path();
    pinPath.moveTo(pinCenter.dx - 10, pinCenter.dy + 4);
    pinPath.lineTo(pinCenter.dx, pinCenter.dy + 24);
    pinPath.lineTo(pinCenter.dx + 10, pinCenter.dy + 4);
    pinPath.close();
    canvas.drawPath(pinPath, pinPaint);

    canvas.drawCircle(pinCenter, 4, Paint()..color = Colors.white);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

class WizardExperienceIllustration extends StatelessWidget {
  final double size;
  const WizardExperienceIllustration({super.key, this.size = 120.0});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: size,
      height: size,
      child: CustomPaint(
        painter: _ExperiencePainter(),
      ),
    );
  }
}

class _ExperiencePainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);

    final bgPaint = Paint()
      ..color = AppColors.green.withValues(alpha: 0.12)
      ..style = PaintingStyle.fill;
    canvas.drawCircle(center, size.width / 2, bgPaint);

    final greenPaint = Paint()
      ..color = AppColors.green
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3.0
      ..strokeCap = StrokeCap.round;

    final leafFill = Paint()
      ..color = AppColors.green
      ..style = PaintingStyle.fill;

    // Stem
    canvas.drawLine(Offset(center.dx, center.dy + 25), Offset(center.dx, center.dy - 10), greenPaint);

    // Leaf Left
    final leafLeft = Path();
    leafLeft.moveTo(center.dx, center.dy + 5);
    leafLeft.quadraticBezierTo(center.dx - 22, center.dy - 5, center.dx - 20, center.dy - 20);
    leafLeft.quadraticBezierTo(center.dx - 5, center.dy - 15, center.dx, center.dy + 5);
    canvas.drawPath(leafLeft, leafFill);

    // Leaf Right
    final leafRight = Path();
    leafRight.moveTo(center.dx, center.dy - 5);
    leafRight.quadraticBezierTo(center.dx + 22, center.dy - 15, center.dx + 20, center.dy - 30);
    leafRight.quadraticBezierTo(center.dx + 5, center.dy - 25, center.dx, center.dy - 5);
    canvas.drawPath(leafRight, leafFill);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
