import 'package:flutter/material.dart';

/// Likhora Brand Theme & Color System matching exact iOS mockups.
class AppColors {
  AppColors._();

  // Warm Cream Parchment Background #FAF7F2
  static const Color background = Color(0xFFFAF7F2);
  
  // Outer Canvas Background
  static const Color canvasBg = Color(0xFFEFEBE4);

  // Card Background (Pure White #FFFFFF)
  static const Color cardBg = Color(0xFFFFFFFF);

  // Hairline Border
  static const Color hairlineBorder = Color(0xFFE8E3DA);
  static const Color dividerColor = Color(0xFFEFEAE0);

  // 1. Aubergine #4C1D4B — Deep purple brand color for hero cards & active nav
  static const Color aubergine = Color(0xFF4C1D4B);

  // 2. Cyan / Blue #0284C7 & Light Blue Tint #E0F2FE — AI callouts & guidance
  static const Color blue = Color(0xFF0284C7);
  static const Color blueCardBg = Color(0xFFE0F2FE);

  // 3. Green #38A169 — Done badges, completed progress ring, target margin tag
  static const Color green = Color(0xFF38A169);
  static const Color greenTint = Color(0xFFDCFCE7);

  // 4. Warm Gold / Yellow #FBBF24 & #E5A93C — Active states, streak badges, pricing highlights
  static const Color yellow = Color(0xFFFBBF24);
  static const Color yellowAccent = Color(0xFFE5A93C);
  static const Color yellowTint = Color(0xFFFEF3C7);

  // 5. Pink/Red #CE375C
  static const Color pinkRed = Color(0xFFCE375C);

  // Text Roles (Charcoal Ink #292524)
  static const Color textDark = Color(0xFF292524);
  static const Color textMuted = Color(0xFF78716C);
  static const Color textLight = Color(0xFFFFFFFF);

  // Translucent Tints
  static Color aubergineTint = const Color(0xFF4C1D4B).withValues(alpha: 0.08);
  static Color blueTint = const Color(0xFF0284C7).withValues(alpha: 0.12);
  static Color pinkRedTint = const Color(0xFFCE375C).withValues(alpha: 0.12);
}
