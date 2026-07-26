import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../services/ai_service.dart';
import '../theme/app_colors.dart';
import 'ios_card.dart';

class AIPersonalizationModal extends StatefulWidget {
  const AIPersonalizationModal({super.key});

  @override
  State<AIPersonalizationModal> createState() => _AIPersonalizationModalState();
}

class _AIPersonalizationModalState extends State<AIPersonalizationModal> {
  late double _budget;
  late String _selectedCity;
  late String _experience;
  bool _isLoading = false;

  final List<String> _cities = [
    'Quezon City, Metro Manila',
    'City of Manila, Metro Manila',
    'Malolos, Bulacan',
    'Cebu City, Visayas',
    'Davao City, Mindanao',
  ];

  final List<String> _experienceLevels = [
    'Beginner / First Business',
    'Some Experience (Reseller)',
    'Experienced Entrepreneur',
  ];

  @override
  void initState() {
    super.initState();
    final appState = Provider.of<AppStateProvider>(context, listen: false);
    _budget = appState.selectedBudget;
    _selectedCity = appState.selectedLocation;
    _experience = appState.selectedExperience;
  }

  void _runAIPersonalization() async {
    setState(() => _isLoading = true);
    final appState = Provider.of<AppStateProvider>(context, listen: false);

    appState.setWizardBudget(_budget);
    appState.setWizardLocation(_selectedCity);
    appState.setWizardExperience(_experience);

    await appState.runAIRoadmapPersonalization();

    if (mounted) {
      setState(() => _isLoading = false);
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);

    return Container(
      height: MediaQuery.of(context).size.height * 0.82,
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28.0)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            // Modal Handle
            const SizedBox(height: 10.0),
            Center(
              child: Container(
                width: 36.0,
                height: 4.0,
                decoration: BoxDecoration(
                  color: AppColors.hairlineBorder,
                  borderRadius: BorderRadius.circular(2.0),
                ),
              ),
            ),
            const SizedBox(height: 12.0),

            // Modal Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8.0),
                    decoration: const BoxDecoration(
                      color: AppColors.aubergine,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      CupertinoIcons.sparkles,
                      color: AppColors.yellow,
                      size: 20.0,
                    ),
                  ),
                  const SizedBox(width: 12.0),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'AI Personalization Layer',
                        style: TextStyle(
                          fontSize: 18.0,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textDark,
                        ),
                      ),
                      Text(
                        'Calibrating roadmap for ${appState.selectedCategory}',
                        style: const TextStyle(
                          fontSize: 12.0,
                          color: AppColors.textMuted,
                        ),
                      ),
                    ],
                  ),
                  const Spacer(),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => Navigator.pop(context),
                    child: const Icon(
                      CupertinoIcons.xmark_circle_fill,
                      color: AppColors.textMuted,
                      size: 24.0,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 16.0),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                children: [
                  // Budget Selector
                  IOSCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'Starting Capital Budget',
                              style: TextStyle(
                                fontSize: 15.0,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            Text(
                              '₱${_budget.toStringAsFixed(0)}',
                              style: const TextStyle(
                                fontSize: 16.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.aubergine,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12.0),
                        CupertinoSlider(
                          value: _budget,
                          min: 5000.0,
                          max: 150000.0,
                          divisions: 29,
                          activeColor: AppColors.aubergine,
                          thumbColor: AppColors.yellow,
                          onChanged: (val) => setState(() => _budget = val),
                        ),
                        const Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('₱5k (Micro)',
                                style: TextStyle(
                                    fontSize: 11.0, color: AppColors.textMuted)),
                            Text('₱150k (Full Shop)',
                                style: TextStyle(
                                    fontSize: 11.0, color: AppColors.textMuted)),
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Location Picker
                  IOSCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Business Location (PH Region)',
                          style: TextStyle(
                            fontSize: 15.0,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8.0),
                        ..._cities.map((city) {
                          final isSelected = _selectedCity == city;
                          return CupertinoButton(
                            padding: EdgeInsets.zero,
                            onPressed: () =>
                                setState(() => _selectedCity = city),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12.0, vertical: 10.0),
                              margin: const EdgeInsets.only(bottom: 6.0),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.blue.withValues(alpha: 0.15)
                                    : AppColors.background,
                                borderRadius: BorderRadius.circular(12.0),
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.blue
                                      : AppColors.hairlineBorder,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    CupertinoIcons.location_solid,
                                    size: 16.0,
                                    color: isSelected
                                        ? AppColors.blue
                                        : AppColors.textMuted,
                                  ),
                                  const SizedBox(width: 8.0),
                                  Text(
                                    city,
                                    style: TextStyle(
                                      fontSize: 13.0,
                                      fontWeight: isSelected
                                          ? FontWeight.w700
                                          : FontWeight.w500,
                                      color: AppColors.textDark,
                                    ),
                                  ),
                                  const Spacer(),
                                  if (isSelected)
                                    const Icon(
                                      CupertinoIcons.checkmark_alt_circle_fill,
                                      size: 18.0,
                                      color: AppColors.blue,
                                    ),
                                ],
                              ),
                            ),
                          );
                        }),
                      ],
                    ),
                  ),

                  // Experience Level Picker
                  IOSCard(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Entrepreneur Experience Level',
                          style: TextStyle(
                            fontSize: 15.0,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 8.0),
                        ..._experienceLevels.map((exp) {
                          final isSelected = _experience == exp;
                          return CupertinoButton(
                            padding: EdgeInsets.zero,
                            onPressed: () => setState(() => _experience = exp),
                            child: Container(
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 12.0, vertical: 10.0),
                              margin: const EdgeInsets.only(bottom: 6.0),
                              decoration: BoxDecoration(
                                color: isSelected
                                    ? AppColors.green.withValues(alpha: 0.15)
                                    : AppColors.background,
                                borderRadius: BorderRadius.circular(12.0),
                                border: Border.all(
                                  color: isSelected
                                      ? AppColors.green
                                      : AppColors.hairlineBorder,
                                ),
                              ),
                              child: Row(
                                children: [
                                  Icon(
                                    CupertinoIcons.person_badge_plus_fill,
                                    size: 16.0,
                                    color: isSelected
                                        ? AppColors.green
                                        : AppColors.textMuted,
                                  ),
                                  const SizedBox(width: 8.0),
                                  Text(
                                    exp,
                                    style: TextStyle(
                                      fontSize: 13.0,
                                      fontWeight: isSelected
                                          ? FontWeight.w700
                                          : FontWeight.w500,
                                      color: AppColors.textDark,
                                    ),
                                  ),
                                  const Spacer(),
                                  if (isSelected)
                                    const Icon(
                                      CupertinoIcons.checkmark_alt_circle_fill,
                                      size: 18.0,
                                      color: AppColors.green,
                                    ),
                                ],
                              ),
                            ),
                          );
                        }),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Action CTA
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: SizedBox(
                width: double.infinity,
                child: CupertinoButton(
                  color: AppColors.yellow,
                  borderRadius: BorderRadius.circular(16.0),
                  onPressed: _isLoading ? null : _runAIPersonalization,
                  child: _isLoading
                      ? const CupertinoActivityIndicator(
                          color: AppColors.textDark)
                      : const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(CupertinoIcons.sparkles,
                                size: 18.0, color: AppColors.textDark),
                            SizedBox(width: 8.0),
                            Text(
                              'Generate AI Personalized Roadmap',
                              style: TextStyle(
                                fontSize: 15.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                          ],
                        ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
