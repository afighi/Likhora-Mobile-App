import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class IOSCard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final EdgeInsetsGeometry margin;
  final VoidCallback? onTap;
  final Color backgroundColor;
  final Color borderColor;
  final double borderRadius;
  final bool hasSoftShadow;

  const IOSCard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(16.0),
    this.margin = const EdgeInsets.only(bottom: 12.0),
    this.onTap,
    this.backgroundColor = AppColors.cardBg,
    this.borderColor = AppColors.hairlineBorder,
    this.borderRadius = 18.0,
    this.hasSoftShadow = true,
  });

  @override
  Widget build(BuildContext context) {
    Widget cardContent = Container(
      padding: padding,
      margin: margin,
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: Border.all(color: borderColor, width: 1.0),
        boxShadow: hasSoftShadow
            ? [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.03),
                  blurRadius: 10.0,
                  offset: const Offset(0, 3),
                ),
              ]
            : null,
      ),
      child: child,
    );

    if (onTap != null) {
      return GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: cardContent,
      );
    }

    return cardContent;
  }
}
