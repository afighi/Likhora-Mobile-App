import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class GamifiedStreakBadge extends StatelessWidget {
  final int streakDays;
  final String title;

  const GamifiedStreakBadge({
    super.key,
    this.streakDays = 3,
    this.title = 'Founder Active Streak',
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
      decoration: BoxDecoration(
        color: AppColors.yellowTint,
        borderRadius: BorderRadius.circular(16.0),
        border: Border.all(color: AppColors.yellow.withValues(alpha: 0.5), width: 1.5),
        boxShadow: [
          BoxShadow(
            color: AppColors.yellow.withValues(alpha: 0.2),
            blurRadius: 8.0,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.all(4.0),
            decoration: const BoxDecoration(
              color: AppColors.yellow,
              shape: BoxShape.circle,
            ),
            child: const Icon(
              CupertinoIcons.bolt_fill,
              size: 12.0,
              color: AppColors.textDark,
            ),
          ),
          const SizedBox(width: 6.0),
          Text(
            '$streakDays-Day $title',
            style: const TextStyle(
              fontSize: 12.0,
              fontWeight: FontWeight.bold,
              color: AppColors.aubergine,
            ),
          ),
        ],
      ),
    );
  }
}

class AchievementBadgeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;

  const AchievementBadgeChip({
    super.key,
    required this.label,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 5.0),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(14.0),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13.0, color: color),
          const SizedBox(width: 4.0),
          Text(
            label,
            style: TextStyle(
              fontSize: 11.5,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
