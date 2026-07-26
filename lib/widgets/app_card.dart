import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class AppCard extends StatefulWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final VoidCallback? onTap;
  final Color backgroundColor;
  final Color borderColor;
  final double borderRadius;

  const AppCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16.0),
    this.margin = const EdgeInsets.only(bottom: 12.0),
    this.onTap,
    this.backgroundColor = AppColors.cardBg, // Pure white surface resting on parchment
    this.borderColor = AppColors.hairlineBorder, // Hairline border #EAE5DC
    this.borderRadius = 24.0, // Generous 24px radius per design spec
  });

  @override
  State<AppCard> createState() => _AppCardState();
}

class _AppCardState extends State<AppCard> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    Widget cardContent = AnimatedScale(
      scale: (_isPressed && widget.onTap != null) ? 0.98 : 1.0,
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOutCubic,
      child: Container(
        padding: widget.padding,
        margin: widget.margin,
        decoration: BoxDecoration(
          color: widget.backgroundColor,
          borderRadius: BorderRadius.circular(widget.borderRadius),
          border: Border.all(color: widget.borderColor, width: 1.0),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.025),
              blurRadius: 10.0,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: widget.child,
      ),
    );

    if (widget.onTap != null) {
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) => setState(() => _isPressed = false),
        onTapCancel: () => setState(() => _isPressed = false),
        onTap: widget.onTap,
        child: cardContent,
      );
    }

    return cardContent;
  }
}
