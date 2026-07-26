import 'package:flutter/material.dart';

/// Likhora Brand Theme & Color System
/// Warm Parchment Aesthetic matching the iOS Business Companion design blueprint.
class AppColors {
  AppColors._();

  // Warm Parchment Background (Replaces stark white)
  static const Color background = Color(0xFFF6F1E9);
  
  // Outer Canvas Background (Behind iPhone mockup frame)
  static const Color canvasBg = Color(0xFFE5E0D8);

  // Card & Elevated Surface Color (Pure White resting on parchment)
  static const Color cardBg = Color(0xFFFFFFFF);

  // Hairline Border for Card Separation
  static const Color hairlineBorder = Color(0xFFEAE5DC);
  static const Color dividerColor = Color(0xFFEFEAE0);

  // 1. Aubergine #4A154B — Main brand color, journey hero card, active tab pill, milestone card
  static const Color aubergine = Color(0xFF4A154B);

  // 2. Blue #64C3EB — Informational guidance, supplier/location features, map pins, AI assistance
  static const Color blue = Color(0xFF64C3EB);

  // 3. Green #5BB381 — Completed steps, healthy profit margins, positive progress, milestones
  static const Color green = Color(0xFF5BB381);

  // 4. Yellow #E3B34C — Active work, pricing actions, in-progress states, primary CTAs
  static const Color yellow = Color(0xFFE3B34C);

  // 5. Pink/Red #CE375C — Warnings, thin margin flags, retail/resale accents
  static const Color pinkRed = Color(0xFFCE375C);

  // Text Roles (Charcoal Ink #2A2130, never pure black)
  static const Color textDark = Color(0xFF2A2130);
  static const Color textMuted = Color(0xFF7E7685);
  static const Color textLight = Color(0xFFFFFFFF);

  // Translucent Tints for Chips, Icon Tiles & AI Guidance Callouts
  static Color aubergineTint = const Color(0xFF4A154B).withValues(alpha: 0.08);
  static Color blueTint = const Color(0xFF64C3EB).withValues(alpha: 0.12);
  static Color greenTint = const Color(0xFF5BB381).withValues(alpha: 0.12);
  static Color yellowTint = const Color(0xFFE3B34C).withValues(alpha: 0.15);
  static Color pinkRedTint = const Color(0xFFCE375C).withValues(alpha: 0.12);
}
