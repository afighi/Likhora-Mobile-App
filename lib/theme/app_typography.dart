import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'app_colors.dart';

/// Likhora Typography System (Inter Typeface with Monospace Currency Role)
class AppTypography {
  AppTypography._();

  // Large Page Title (34px bold iOS style)
  static TextStyle largeTitle({Color color = AppColors.textDark}) {
    return GoogleFonts.inter(
      fontSize: 32.0,
      fontWeight: FontWeight.w800,
      letterSpacing: -0.8,
      color: color,
      height: 1.15,
    );
  }

  static TextStyle displayHero({Color color = AppColors.aubergine}) {
    return GoogleFonts.inter(
      fontSize: 36.0,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.8,
      color: color,
      height: 1.15,
    );
  }

  static TextStyle displayTitle({Color color = AppColors.textDark}) {
    return GoogleFonts.inter(
      fontSize: 24.0,
      fontWeight: FontWeight.bold,
      letterSpacing: -0.4,
      color: color,
      height: 1.2,
    );
  }

  // Section Title (20px bold)
  static TextStyle sectionTitle({Color color = AppColors.textDark}) {
    return GoogleFonts.inter(
      fontSize: 20.0,
      fontWeight: FontWeight.w700,
      letterSpacing: -0.4,
      color: color,
      height: 1.25,
    );
  }

  // Card Title (16-17px semibold)
  static TextStyle cardTitle({Color color = AppColors.textDark}) {
    return GoogleFonts.inter(
      fontSize: 16.0,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.2,
      color: color,
      height: 1.3,
    );
  }

  // Body Text (14px)
  static TextStyle body({Color color = AppColors.textDark, double fontSize = 14.0}) {
    return GoogleFonts.inter(
      fontSize: fontSize,
      fontWeight: FontWeight.w400,
      letterSpacing: -0.1,
      color: color,
      height: 1.4,
    );
  }

  static TextStyle bodyBold({Color color = AppColors.textDark, double fontSize = 14.0}) {
    return GoogleFonts.inter(
      fontSize: fontSize,
      fontWeight: FontWeight.w600,
      letterSpacing: -0.1,
      color: color,
      height: 1.35,
    );
  }

  // Button Action Label
  static TextStyle buttonText({Color color = AppColors.textDark, double fontSize = 15.0}) {
    return GoogleFonts.inter(
      fontSize: fontSize,
      fontWeight: FontWeight.w600,
      letterSpacing: 0.0,
      color: color,
    );
  }

  // Metadata & Caption (11-13px)
  static TextStyle caption({Color color = AppColors.textMuted}) {
    return GoogleFonts.inter(
      fontSize: 12.0,
      fontWeight: FontWeight.w500,
      letterSpacing: -0.1,
      color: color,
    );
  }

  // Monospace Currency Role (JetBrains Mono)
  static TextStyle currency({
    required double fontSize,
    FontWeight fontWeight = FontWeight.w700,
    Color color = AppColors.aubergine,
  }) {
    return GoogleFonts.jetBrainsMono(
      fontSize: fontSize,
      fontWeight: fontWeight,
      letterSpacing: -0.5,
      color: color,
    );
  }
}
