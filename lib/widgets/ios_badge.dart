import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

enum BadgeStyle {
  aubergine,
  blue,
  green,
  yellow,
  pinkRed,
}

class IOSBadge extends StatelessWidget {
  final String label;
  final IconData? icon;
  final BadgeStyle style;
  final bool isFilled;

  const IOSBadge({
    super.key,
    required this.label,
    this.icon,
    this.style = BadgeStyle.aubergine,
    this.isFilled = false,
  });

  @override
  Widget build(BuildContext context) {
    Color mainColor;
    Color bgColor;

    switch (style) {
      case BadgeStyle.aubergine:
        mainColor = AppColors.aubergine;
        bgColor = isFilled ? AppColors.aubergine : AppColors.aubergineTint;
        break;
      case BadgeStyle.blue:
        mainColor = AppColors.blue;
        bgColor = isFilled ? AppColors.blue : AppColors.blueTint;
        break;
      case BadgeStyle.green:
        mainColor = AppColors.green;
        bgColor = isFilled ? AppColors.green : AppColors.greenTint;
        break;
      case BadgeStyle.yellow:
        mainColor = AppColors.yellow;
        bgColor = isFilled ? AppColors.yellow : AppColors.yellowTint;
        break;
      case BadgeStyle.pinkRed:
        mainColor = AppColors.pinkRed;
        bgColor = isFilled ? AppColors.pinkRed : AppColors.pinkRedTint;
        break;
    }

    final textColor = isFilled
        ? (style == BadgeStyle.yellow || style == BadgeStyle.blue
            ? AppColors.textDark
            : Colors.white)
        : (style == BadgeStyle.aubergine ? AppColors.aubergine : mainColor);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(12.0),
        border: isFilled
            ? null
            : Border.all(color: mainColor.withValues(alpha: 0.3), width: 1.0),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 12.0, color: textColor),
            const SizedBox(width: 4.0),
          ],
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: TextStyle(
                fontSize: 12.0,
                fontWeight: FontWeight.w600,
                color: textColor,
                letterSpacing: -0.1,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
