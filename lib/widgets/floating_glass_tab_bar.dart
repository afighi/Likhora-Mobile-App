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
    final activeIcons = [
      CupertinoIcons.house_fill,
      CupertinoIcons.flowchart,
      Icons.calculate,
      CupertinoIcons.checkmark_circle_fill,
      CupertinoIcons.house_alt_fill,
    ];

    final inactiveIcons = [
      CupertinoIcons.house,
      CupertinoIcons.flowchart,
      Icons.calculate_outlined,
      CupertinoIcons.checkmark_circle,
      CupertinoIcons.house_alt,
    ];

    return Align(
      alignment: Alignment.bottomCenter,
      child: SafeArea(
        top: false,
        minimum: const EdgeInsets.only(bottom: 20.0, left: 32.0, right: 32.0),
        child: Container(
          height: 62.0,
          padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 7.0),
          decoration: BoxDecoration(
            color: const Color(0xFFFAF7F2).withValues(alpha: 0.95),
            borderRadius: BorderRadius.circular(32.0),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.8),
              width: 1.5,
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 24.0,
                spreadRadius: 0.0,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(activeIcons.length, (index) {
              final isSelected = currentIndex == index;

              return Expanded(
                child: GestureDetector(
                  behavior: HitTestBehavior.opaque,
                  onTap: () => onTap(index),
                  child: Center(
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 200),
                      curve: Curves.easeOut,
                      width: isSelected ? 48.0 : 40.0,
                      height: 48.0,
                      decoration: BoxDecoration(
                        color: isSelected ? AppColors.aubergine : Colors.transparent,
                        shape: BoxShape.circle,
                        boxShadow: isSelected
                            ? [
                                BoxShadow(
                                  color: AppColors.aubergine.withValues(alpha: 0.3),
                                  blurRadius: 8.0,
                                  offset: const Offset(0, 3),
                                ),
                              ]
                            : null,
                      ),
                      child: Center(
                        child: Icon(
                          isSelected ? activeIcons[index] : inactiveIcons[index],
                          size: 22.0,
                          color: isSelected ? Colors.white : const Color(0xFF6B6570),
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
