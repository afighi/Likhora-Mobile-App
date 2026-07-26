import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

class CurrencyText extends StatelessWidget {
  final double amount;
  final double fontSize;
  final FontWeight fontWeight;
  final Color color;

  const CurrencyText({
    super.key,
    required this.amount,
    this.fontSize = 18.0,
    this.fontWeight = FontWeight.bold,
    this.color = AppColors.aubergine,
  });

  String _formatAmount(double val) {
    final str = val.toStringAsFixed(2);
    final parts = str.split('.');
    final intPart = parts[0];
    final decPart = parts[1];

    final reg = RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))');
    final formattedInt = intPart.replaceAllMapped(reg, (match) => '${match[1]},');

    return '₱$formattedInt.$decPart';
  }

  @override
  Widget build(BuildContext context) {
    return Text(
      _formatAmount(amount),
      style: AppTypography.currency(
        fontSize: fontSize,
        fontWeight: fontWeight,
        color: color,
      ),
    );
  }
}
