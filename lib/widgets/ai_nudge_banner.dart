import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../models/ai_nudge_model.dart';
import '../theme/app_colors.dart';
import 'ios_card.dart';

class AINudgeBanner extends StatelessWidget {
  final AINudge nudge;
  final VoidCallback onAction;

  const AINudgeBanner({
    super.key,
    required this.nudge,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    return IOSCard(
      backgroundColor: AppColors.aubergine,
      borderColor: AppColors.aubergine,
      padding: const EdgeInsets.all(16.0),
      margin: const EdgeInsets.only(bottom: 16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(6.0),
                decoration: BoxDecoration(
                  color: AppColors.yellow.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  CupertinoIcons.sparkles,
                  size: 16.0,
                  color: AppColors.yellow,
                ),
              ),
              const SizedBox(width: 8.0),
              const Text(
                'LIKHORA AI COACH',
                style: TextStyle(
                  fontSize: 11.0,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.8,
                  color: AppColors.yellow,
                ),
              ),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8.0, vertical: 2.0),
                decoration: BoxDecoration(
                  color: Colors.white.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10.0),
                ),
                child: const Text(
                  'What\'s Next & Why',
                  style: TextStyle(
                    fontSize: 10.0,
                    fontWeight: FontWeight.w500,
                    color: Colors.white70,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 10.0),
          Text(
            nudge.title,
            style: const TextStyle(
              fontSize: 16.0,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: -0.3,
            ),
          ),
          const SizedBox(height: 4.0),
          Text(
            nudge.message,
            style: TextStyle(
              fontSize: 13.0,
              height: 1.35,
              color: Colors.white.withOpacity(0.88),
            ),
          ),
          const SizedBox(height: 12.0),
          Align(
            alignment: Alignment.centerRight,
            child: CupertinoButton(
              padding: EdgeInsets.zero,
              onPressed: onAction,
              child: Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 14.0, vertical: 8.0),
                decoration: BoxDecoration(
                  color: AppColors.yellow,
                  borderRadius: BorderRadius.circular(14.0),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      nudge.actionLabel,
                      style: const TextStyle(
                        fontSize: 13.0,
                        fontWeight: FontWeight.w700,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(width: 4.0),
                    const Icon(
                      CupertinoIcons.arrow_right,
                      size: 14.0,
                      color: AppColors.textDark,
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
