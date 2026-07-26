import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

class ProgressTrackerScreen extends StatelessWidget {
  const ProgressTrackerScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 12.0, bottom: 100.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header with Bell Icon
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const SizedBox(),
                  Stack(
                    children: [
                      Container(
                        width: 40.0,
                        height: 40.0,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 10.0,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          CupertinoIcons.bell,
                          size: 20.0,
                          color: AppColors.textDark,
                        ),
                      ),
                      Positioned(
                        top: 8.0,
                        right: 8.0,
                        child: Container(
                          width: 8.0,
                          height: 8.0,
                          decoration: const BoxDecoration(
                            color: Color(0xFFEF4444),
                            shape: BoxShape.circle,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 4.0),

              // Title & Subtitle
              Text(
                'Progress',
                style: AppTypography.largeTitle(),
              ),
              const SizedBox(height: 4.0),
              const Text(
                'Your launch-ready toolkit',
                style: TextStyle(
                  fontSize: 14.0,
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),

              const SizedBox(height: 20.0),

              // Top White Card with Circular Green Progress Ring
              Container(
                padding: const EdgeInsets.all(20.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(22.0),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.04),
                      blurRadius: 14.0,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Row(
                  children: [
                    // Green Progress Ring
                    SizedBox(
                      width: 72.0,
                      height: 72.0,
                      child: Stack(
                        alignment: Alignment.center,
                        children: [
                          SizedBox(
                            width: 72.0,
                            height: 72.0,
                            child: CircularProgressIndicator(
                              value: 0.40,
                              strokeWidth: 8.0,
                              backgroundColor: const Color(0xFFE5E7EB),
                              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF38A169)),
                              strokeCap: StrokeCap.round,
                            ),
                          ),
                          const Text(
                            '40%',
                            style: TextStyle(
                              fontSize: 15.0,
                              fontWeight: FontWeight.w800,
                              color: AppColors.textDark,
                            ),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(width: 18.0),

                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'You\'re getting there',
                            style: TextStyle(
                              fontSize: 18.0,
                              fontWeight: FontWeight.bold,
                              color: AppColors.textDark,
                            ),
                          ),
                          const SizedBox(height: 4.0),
                          const Text(
                            '2 of 5 roadmap steps complete. Finish 3 more to unlock your launch checklist.',
                            style: TextStyle(
                              fontSize: 12.5,
                              color: AppColors.textMuted,
                              height: 1.35,
                            ),
                          ),
                          const SizedBox(height: 12.0),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFDCFCE7),
                                  borderRadius: BorderRadius.circular(12.0),
                                ),
                                child: const Row(
                                  children: [
                                    Icon(CupertinoIcons.checkmark, size: 12.0, color: Color(0xFF16A34A)),
                                    SizedBox(width: 4.0),
                                    Text(
                                      '2 done',
                                      style: TextStyle(
                                        fontSize: 12.0,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFF16A34A),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8.0),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFFEF3C7),
                                  borderRadius: BorderRadius.circular(12.0),
                                ),
                                child: const Text(
                                  '1 active',
                                  style: TextStyle(
                                    fontSize: 12.0,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFFD97706),
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16.0),

              // Soft Muted Purple Banner ("What's next & why")
              Container(
                padding: const EdgeInsets.all(18.0),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFE9EB),
                  borderRadius: BorderRadius.circular(20.0),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 38.0,
                      height: 38.0,
                      decoration: BoxDecoration(
                        color: AppColors.aubergine.withValues(alpha: 0.12),
                        borderRadius: BorderRadius.circular(12.0),
                      ),
                      child: const Center(
                        child: Icon(
                          CupertinoIcons.sparkles,
                          size: 18.0,
                          color: AppColors.aubergine,
                        ),
                      ),
                    ),
                    const SizedBox(width: 14.0),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'What\'s next & why',
                            style: TextStyle(
                              fontSize: 14.0,
                              fontWeight: FontWeight.bold,
                              color: AppColors.aubergine,
                            ),
                          ),
                          SizedBox(height: 4.0),
                          Text(
                            'Costing your last 2 dishes now unlocks the price list — the final deliverable before you can print your launch menu.',
                            style: TextStyle(
                              fontSize: 13.0,
                              color: Color(0xFF4A4050),
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28.0),

              // Section: This week
              const Text(
                'This week',
                style: TextStyle(
                  fontSize: 20.0,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                  letterSpacing: -0.4,
                ),
              ),

              const SizedBox(height: 14.0),

              // Weekly Activity Tracker Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20.0),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10.0,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    const SizedBox(height: 50.0), // Activity area spacer
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: const [
                        Text('M', style: TextStyle(fontSize: 12.0, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                        Text('T', style: TextStyle(fontSize: 12.0, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                        Text('W', style: TextStyle(fontSize: 12.0, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                        Text('T', style: TextStyle(fontSize: 12.0, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                        Text('F', style: TextStyle(fontSize: 12.0, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                        Text('S', style: TextStyle(fontSize: 12.0, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                        Text('S', style: TextStyle(fontSize: 12.0, color: AppColors.textMuted, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28.0),

              // Section: Launch toolkit
              const Text(
                'Launch toolkit',
                style: TextStyle(
                  fontSize: 20.0,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                  letterSpacing: -0.4,
                ),
              ),

              const SizedBox(height: 14.0),

              // Toolkit Item 1: Cost sheet
              Container(
                padding: const EdgeInsets.all(18.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20.0),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10.0,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44.0,
                          height: 44.0,
                          decoration: BoxDecoration(
                            color: const Color(0xFFFEF3C7),
                            borderRadius: BorderRadius.circular(14.0),
                          ),
                          child: const Center(
                            child: Icon(
                              CupertinoIcons.doc_text_fill,
                              size: 22.0,
                              color: Color(0xFFD97706),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14.0),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'Cost sheet',
                                style: TextStyle(
                                  fontSize: 16.0,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textDark,
                                ),
                              ),
                              SizedBox(height: 2.0),
                              Text(
                                '6 of 8 dishes costed',
                                style: TextStyle(
                                  fontSize: 13.0,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Text(
                          '75%',
                          style: TextStyle(
                            fontSize: 15.0,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFFD97706),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14.0),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4.0),
                      child: LinearProgressIndicator(
                        value: 0.75,
                        minHeight: 6.0,
                        backgroundColor: const Color(0xFFFEF3C7),
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFD97706)),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 12.0),

              // Toolkit Item 2: Chosen suppliers
              Container(
                padding: const EdgeInsets.all(18.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20.0),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10.0,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Container(
                          width: 44.0,
                          height: 44.0,
                          decoration: BoxDecoration(
                            color: const Color(0xFFE0F2FE),
                            borderRadius: BorderRadius.circular(14.0),
                          ),
                          child: const Center(
                            child: Icon(
                              CupertinoIcons.house_alt_fill,
                              size: 22.0,
                              color: Color(0xFF0284C7),
                            ),
                          ),
                        ),
                        const SizedBox(width: 14.0),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'Chosen suppliers',
                                style: TextStyle(
                                  fontSize: 16.0,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.textDark,
                                ),
                              ),
                              SizedBox(height: 2.0),
                              Text(
                                '3 of 3 suppliers saved',
                                style: TextStyle(
                                  fontSize: 13.0,
                                  color: AppColors.textMuted,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const Text(
                          '100%',
                          style: TextStyle(
                            fontSize: 15.0,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF38A169),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14.0),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4.0),
                      child: LinearProgressIndicator(
                        value: 1.0,
                        minHeight: 6.0,
                        backgroundColor: const Color(0xFFDCFCE7),
                        valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF38A169)),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
