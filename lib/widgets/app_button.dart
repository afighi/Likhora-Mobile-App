import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

class AppButton extends StatefulWidget {
  final String label;
  final VoidCallback? onPressed;
  final IconData? icon;
  final bool isLoading;
  final bool isFullWidth;
  final Color backgroundColor;
  final Color textColor;

  const AppButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.icon,
    this.isLoading = false,
    this.isFullWidth = true,
    this.backgroundColor = AppColors.yellow, // Yellow #E3B34C is the ONLY primary CTA color
    this.textColor = AppColors.textDark,
  });

  @override
  State<AppButton> createState() => _AppButtonState();
}

class _AppButtonState extends State<AppButton> {
  bool _isPressed = false;

  @override
  Widget build(BuildContext context) {
    Widget buttonContent = AnimatedScale(
      scale: _isPressed ? 0.96 : 1.0,
      duration: const Duration(milliseconds: 120),
      curve: Curves.easeOutCubic,
      child: GestureDetector(
        onTapDown: (_) => setState(() => _isPressed = true),
        onTapUp: (_) => setState(() => _isPressed = false),
        onTapCancel: () => setState(() => _isPressed = false),
        onTap: widget.isLoading ? null : widget.onPressed,
        child: Container(
          height: 52.0,
          padding: const EdgeInsets.symmetric(horizontal: 20.0),
          decoration: BoxDecoration(
            color: widget.onPressed == null
                ? AppColors.hairlineBorder
                : widget.backgroundColor,
            borderRadius: BorderRadius.circular(16.0),
            border: Border.all(
              color: Colors.black.withValues(alpha: 0.05),
              width: 1.0,
            ),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            mainAxisSize: widget.isFullWidth ? MainAxisSize.max : MainAxisSize.min,
            children: [
              if (widget.isLoading) ...[
                SizedBox(
                  width: 20.0,
                  height: 20.0,
                  child: CircularProgressIndicator(
                    strokeWidth: 2.5,
                    valueColor: AlwaysStoppedAnimation<Color>(widget.textColor),
                  ),
                ),
                const SizedBox(width: 10.0),
              ] else if (widget.icon != null) ...[
                Icon(widget.icon, size: 18.0, color: widget.textColor),
                const SizedBox(width: 8.0),
              ],
              Text(
                widget.label,
                style: AppTypography.buttonText(color: widget.textColor),
              ),
            ],
          ),
        ),
      ),
    );

    if (widget.isFullWidth) {
      return SizedBox(width: double.infinity, child: buttonContent);
    }
    return buttonContent;
  }
}
