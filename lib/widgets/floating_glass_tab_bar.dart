import 'dart:ui';
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

class FloatingGlassTabBar extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const FloatingGlassTabBar({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final icons = [
      CupertinoIcons.house_fill,
      CupertinoIcons.map_fill,
      CupertinoIcons.money_dollar_circle_fill,
      CupertinoIcons.chart_bar_square_fill,
      CupertinoIcons.building_2_fill,
    ];

    return Align(
      alignment: Alignment.bottomCenter,
      child: SafeArea(
        top: false,
        minimum: const EdgeInsets.only(bottom: 16.0, left: 20.0, right: 20.0),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(30.0),
          child: BackdropFilter(
            filter: ImageFilter.blur(sigmaX: 30.0, sigmaY: 30.0),
            child: Container(
              height: 58.0,
              padding: const EdgeInsets.symmetric(horizontal: 6.0, vertical: 6.0),
              decoration: BoxDecoration(
                // Translucent warm parchment frosted glass surface
                color: Colors.white.withValues(alpha: 0.88),
                borderRadius: BorderRadius.circular(30.0),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.9),
                  width: 1.5,
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppColors.aubergine.withValues(alpha: 0.12),
                    blurRadius: 20.0,
                    spreadRadius: 1.0,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: List.generate(icons.length, (index) {
                  final icon = icons[index];
                  final isSelected = currentIndex == index;

                  return Expanded(
                    child: GestureDetector(
                      behavior: HitTestBehavior.opaque,
                      onTap: () => onTap(index),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 220),
                        curve: Curves.easeOutCubic,
                        alignment: Alignment.center,
                        decoration: BoxDecoration(
                          color: isSelected
                              ? AppColors.aubergine
                              : Colors.transparent,
                          borderRadius: BorderRadius.circular(24.0),
                          boxShadow: isSelected
                              ? [
                                  BoxShadow(
                                    color: AppColors.aubergine.withValues(alpha: 0.25),
                                    blurRadius: 6.0,
                                    offset: const Offset(0, 2),
                                  ),
                                ]
                              : null,
                        ),
                        child: Icon(
                          icon,
                          size: 24.0,
                          color: isSelected
                              ? AppColors.yellow
                              : AppColors.aubergine.withValues(alpha: 0.65),
                        ),
                      ),
                    ),
                  );
                }),
              ),
            ),
          ),
        ),
      ),
    );
  }
}
