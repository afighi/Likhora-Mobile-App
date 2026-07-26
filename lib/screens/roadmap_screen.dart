import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import 'step_detail_screen.dart';

class RoadmapScreen extends StatefulWidget {
  const RoadmapScreen({super.key});

  @override
  State<RoadmapScreen> createState() => _RoadmapScreenState();
}

class _RoadmapScreenState extends State<RoadmapScreen> {
  int _selectedSegment = 0; // 0: Launch board, 1: Templates

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
              // Top Bar Header & Action Icons
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const SizedBox(), // Balance spacing
                  Row(
                    children: [
                      // Bell Button with notification dot
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
                      const SizedBox(width: 10.0),
                      // Explore Compass Button
                      Container(
                        width: 40.0,
                        height: 40.0,
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(alpha: 0.7),
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.04),
                              blurRadius: 8.0,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          CupertinoIcons.compass,
                          size: 20.0,
                          color: AppColors.textDark,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 4.0),

              // Title & Subtitle
              Text(
                'Your launch plan',
                style: AppTypography.largeTitle(),
              ),
              const SizedBox(height: 4.0),
              const Text(
                'Carinderia sa Pasig · Personalized for you',
                style: TextStyle(
                  fontSize: 14.0,
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),

              const SizedBox(height: 18.0),

              // Segmented Pill Control (Launch board vs Templates)
              Container(
                height: 46.0,
                padding: const EdgeInsets.all(4.0),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFEAE0),
                  borderRadius: BorderRadius.circular(24.0),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedSegment = 0),
                        child: Container(
                          decoration: BoxDecoration(
                            color: _selectedSegment == 0 ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(20.0),
                            boxShadow: _selectedSegment == 0
                                ? [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.06),
                                      blurRadius: 8.0,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Center(
                            child: Text(
                              'Launch board',
                              style: TextStyle(
                                fontSize: 14.0,
                                fontWeight: _selectedSegment == 0 ? FontWeight.w700 : FontWeight.w500,
                                color: _selectedSegment == 0 ? AppColors.textDark : AppColors.textMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedSegment = 1),
                        child: Container(
                          decoration: BoxDecoration(
                            color: _selectedSegment == 1 ? Colors.white : Colors.transparent,
                            borderRadius: BorderRadius.circular(20.0),
                            boxShadow: _selectedSegment == 1
                                ? [
                                    BoxShadow(
                                      color: Colors.black.withValues(alpha: 0.06),
                                      blurRadius: 8.0,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Center(
                            child: Text(
                              'Templates',
                              style: TextStyle(
                                fontSize: 14.0,
                                fontWeight: _selectedSegment == 1 ? FontWeight.w700 : FontWeight.w500,
                                color: _selectedSegment == 1 ? AppColors.textDark : AppColors.textMuted,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20.0),

              // Hero Launch Path Dark Purple Card
              Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(24.0),
                  boxShadow: [
                    BoxShadow(
                      color: AppColors.aubergine.withValues(alpha: 0.25),
                      blurRadius: 20.0,
                      offset: const Offset(0, 8),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    // Main Dark Purple Card Portion
                    Container(
                      padding: const EdgeInsets.all(22.0),
                      decoration: const BoxDecoration(
                        color: AppColors.aubergine,
                        borderRadius: BorderRadius.vertical(top: Radius.circular(24.0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'YOUR LAUNCH PATH',
                                    style: TextStyle(
                                      fontSize: 11.0,
                                      fontWeight: FontWeight.w800,
                                      letterSpacing: 0.8,
                                      color: Color(0xFFD8B4FE),
                                    ),
                                  ),
                                  const SizedBox(height: 6.0),
                                  const Text(
                                    'Build your cost sheet',
                                    style: TextStyle(
                                      fontSize: 24.0,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                      letterSpacing: -0.5,
                                    ),
                                  ),
                                  const SizedBox(height: 4.0),
                                  const Text(
                                    'Step 3 of 12 · Your focused work for this week',
                                    style: TextStyle(
                                      fontSize: 13.0,
                                      color: Color(0xFFE2D9EC),
                                      fontWeight: FontWeight.w400,
                                    ),
                                  ),
                                ],
                              ),
                              // Gold Document Badge Icon Top Right
                              Container(
                                width: 44.0,
                                height: 44.0,
                                decoration: BoxDecoration(
                                  color: const Color(0xFF5D245B),
                                  borderRadius: BorderRadius.circular(14.0),
                                ),
                                child: const Center(
                                  child: Icon(
                                    CupertinoIcons.doc_text_fill,
                                    size: 22.0,
                                    color: Color(0xFFFBBF24),
                                  ),
                                ),
                              ),
                            ],
                          ),

                          const SizedBox(height: 24.0),

                          // Progress Labels Row
                          const Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                '2 milestones complete',
                                style: TextStyle(
                                  fontSize: 12.0,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                              Row(
                                children: [
                                  Text(
                                    '17% of full plan',
                                    style: TextStyle(
                                      fontSize: 12.0,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.white,
                                    ),
                                  ),
                                  SizedBox(width: 12.0),
                                  Text(
                                    'Week 3',
                                    style: TextStyle(
                                      fontSize: 12.0,
                                      fontWeight: FontWeight.w800,
                                      color: Color(0xFFFBBF24),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),

                          const SizedBox(height: 8.0),

                          // Gold Progress Bar
                          ClipRRect(
                            borderRadius: BorderRadius.circular(4.0),
                            child: LinearProgressIndicator(
                              value: 0.17,
                              minHeight: 6.0,
                              backgroundColor: Colors.white.withValues(alpha: 0.15),
                              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFFFBBF24)),
                            ),
                          ),

                          const SizedBox(height: 16.0),

                          // Badges Row
                          Row(
                            children: [
                              // 3-day momentum badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF3B123A),
                                  borderRadius: BorderRadius.circular(20.0),
                                  border: Border.all(
                                    color: const Color(0xFFB45309).withValues(alpha: 0.6),
                                    width: 1.0,
                                  ),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Text('🔥', style: TextStyle(fontSize: 13.0)),
                                    SizedBox(width: 5.0),
                                    Text(
                                      '3-day momentum',
                                      style: TextStyle(
                                        fontSize: 12.0,
                                        fontWeight: FontWeight.w700,
                                        color: Color(0xFFFBBF24),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 8.0),
                              // 240 points badge
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 6.0),
                                decoration: BoxDecoration(
                                  color: const Color(0xFF3B123A),
                                  borderRadius: BorderRadius.circular(20.0),
                                ),
                                child: const Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Icon(CupertinoIcons.bolt_fill, size: 13.0, color: Color(0xFFD8B4FE)),
                                    SizedBox(width: 4.0),
                                    Text(
                                      '240 points',
                                      style: TextStyle(
                                        fontSize: 12.0,
                                        fontWeight: FontWeight.w700,
                                        color: Colors.white,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Attached White Bottom Banner
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 18.0, vertical: 14.0),
                      decoration: const BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.vertical(bottom: Radius.circular(24.0)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36.0,
                            height: 36.0,
                            decoration: BoxDecoration(
                              color: const Color(0xFFFAF7F2),
                              borderRadius: BorderRadius.circular(10.0),
                            ),
                            child: const Center(
                              child: Icon(
                                CupertinoIcons.calendar_badge_plus,
                                size: 20.0,
                                color: AppColors.aubergine,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12.0),
                          const Expanded(
                            child: Text.rich(
                              TextSpan(
                                children: [
                                  TextSpan(
                                    text: 'Finish this milestone by ',
                                    style: TextStyle(fontSize: 13.0, color: AppColors.textDark),
                                  ),
                                  TextSpan(
                                    text: 'Friday, Aug 9',
                                    style: TextStyle(
                                      fontSize: 13.0,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.textDark,
                                    ),
                                  ),
                                  TextSpan(
                                    text: ' to stay on pace for your Aug 12 launch.',
                                    style: TextStyle(fontSize: 13.0, color: AppColors.textDark),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28.0),

              // Section: Your journey map
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Your journey map',
                    style: TextStyle(
                      fontSize: 20.0,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textDark,
                      letterSpacing: -0.4,
                    ),
                  ),
                  GestureDetector(
                    onTap: () {},
                    child: const Text(
                      'Focus current',
                      style: TextStyle(
                        fontSize: 14.0,
                        fontWeight: FontWeight.bold,
                        color: AppColors.aubergine,
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 16.0),

              // Journey Map Horizontal Timeline
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: SizedBox(
                  width: 420.0,
                  child: Stack(
                    alignment: Alignment.topCenter,
                    children: [
                      // Connecting Line behind nodes
                      Positioned(
                        top: 22.0,
                        left: 30.0,
                        right: 30.0,
                        child: Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: Container(
                                height: 3.0,
                                color: const Color(0xFF38A169),
                              ),
                            ),
                            Expanded(
                              flex: 2,
                              child: Container(
                                height: 3.0,
                                color: const Color(0xFFE5E7EB),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // 5 Step Nodes
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          _buildJourneyNode(
                            title: 'Validate',
                            isCompleted: true,
                            isActive: false,
                            icon: CupertinoIcons.sportscourt,
                          ),
                          _buildJourneyNode(
                            title: 'Register',
                            isCompleted: true,
                            isActive: false,
                            icon: CupertinoIcons.sportscourt,
                          ),
                          _buildJourneyNode(
                            title: 'Price',
                            isCompleted: false,
                            isActive: true,
                            icon: CupertinoIcons.bolt_fill,
                          ),
                          _buildJourneyNode(
                            title: 'Source',
                            isCompleted: false,
                            isActive: false,
                            icon: CupertinoIcons.lock_fill,
                          ),
                          _buildJourneyNode(
                            title: 'Launch',
                            isCompleted: false,
                            isActive: false,
                            icon: CupertinoIcons.lock_fill,
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 28.0),

              // Section: Work on this now
              const Text(
                'Work on this now',
                style: TextStyle(
                  fontSize: 20.0,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                  letterSpacing: -0.4,
                ),
              ),

              const SizedBox(height: 14.0),

              // Active Step Card
              GestureDetector(
                onTap: () {
                  if (appState.roadmapSteps.isNotEmpty) {
                    Navigator.push(
                      context,
                      CupertinoPageRoute(
                        builder: (_) => StepDetailScreen(step: appState.roadmapSteps[0]),
                      ),
                    );
                  }
                },
                child: Container(
                  padding: const EdgeInsets.all(18.0),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20.0),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.04),
                        blurRadius: 12.0,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: Row(
                    children: [
                      Container(
                        width: 48.0,
                        height: 48.0,
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(14.0),
                        ),
                        child: const Center(
                          child: Icon(
                            CupertinoIcons.doc_text_fill,
                            size: 24.0,
                            color: Color(0xFFD97706),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14.0),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8.0, vertical: 3.0),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFEF3C7),
                                borderRadius: BorderRadius.circular(8.0),
                              ),
                              child: const Text(
                                'Active milestone',
                                style: TextStyle(
                                  fontSize: 11.0,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xFFD97706),
                                ),
                              ),
                            ),
                            const SizedBox(height: 6.0),
                            const Text(
                              'Build your cost sheet',
                              style: TextStyle(
                                fontSize: 16.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                            const SizedBox(height: 2.0),
                            const Text(
                              'Cost every dish before you commit to a menu price.',
                              style: TextStyle(
                                fontSize: 13.0,
                                color: AppColors.textMuted,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildJourneyNode({
    required String title,
    required bool isCompleted,
    required bool isActive,
    required IconData icon,
  }) {
    Color circleBg = const Color(0xFFF3F4F6);
    Color iconColor = const Color(0xFF9CA3AF);
    Color textColor = AppColors.textMuted;

    if (isCompleted) {
      circleBg = const Color(0xFF38A169);
      iconColor = Colors.white;
      textColor = const Color(0xFF38A169);
    } else if (isActive) {
      circleBg = const Color(0xFFFBBF24);
      iconColor = AppColors.aubergine;
      textColor = AppColors.aubergine;
    }

    return Column(
      children: [
        Stack(
          clipBehavior: Clip.none,
          children: [
            Container(
              width: 46.0,
              height: 46.0,
              decoration: BoxDecoration(
                color: circleBg,
                borderRadius: BorderRadius.circular(16.0),
                boxShadow: isActive
                    ? [
                        BoxShadow(
                          color: const Color(0xFFFBBF24).withValues(alpha: 0.35),
                          blurRadius: 10.0,
                          offset: const Offset(0, 4),
                        ),
                      ]
                    : null,
              ),
              child: Center(
                child: Icon(icon, size: 20.0, color: iconColor),
              ),
            ),
            if (isCompleted)
              Positioned(
                top: -3.0,
                right: -3.0,
                child: Container(
                  width: 16.0,
                  height: 16.0,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFBBF24),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 1.5),
                  ),
                  child: const Center(
                    child: Icon(
                      CupertinoIcons.checkmark,
                      size: 10.0,
                      color: AppColors.aubergine,
                    ),
                  ),
                ),
              ),
          ],
        ),
        const SizedBox(height: 6.0),
        Text(
          title,
          style: TextStyle(
            fontSize: 12.0,
            fontWeight: isActive || isCompleted ? FontWeight.w700 : FontWeight.w500,
            color: textColor,
          ),
        ),
      ],
    );
  }
}
