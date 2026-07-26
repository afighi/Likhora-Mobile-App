import 'package:flutter/material.dart';
import 'package:flutter/cupertino.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';
import '../widgets/app_button.dart';
import '../widgets/app_card.dart';
import '../widgets/currency_text.dart';
import '../widgets/vector_wizard_illustrations.dart';
import 'app_scaffold_screen.dart';

class PreferenceWizardScreen extends StatefulWidget {
  final bool isEditingMode;

  const PreferenceWizardScreen({super.key, this.isEditingMode = false});

  @override
  State<PreferenceWizardScreen> createState() => _PreferenceWizardScreenState();
}

class _PreferenceWizardScreenState extends State<PreferenceWizardScreen> {
  int _currentStep = 0;
  final int _totalSteps = 5;

  // Local state for answers
  late String _selectedCategory;
  late double _selectedBudget;
  late String _selectedLocation;
  late String _selectedExperience;

  final TextEditingController _locationController = TextEditingController();

  final List<Map<String, String>> _categories = [
    {
      'title': 'Food & Beverage',
      'desc': 'Milk Tea, Bakery, Carinderia, Coffee, Cloud Kitchen',
      'tag': 'Food',
    },
    {
      'title': 'Retail & Resale',
      'desc': 'Clothing Boutique, Online Shop, Shopee/Lazada, Grocery',
      'tag': 'Retail',
    },
    {
      'title': 'Services',
      'desc': 'Laundry Shop, Salon & Spa, Tech Repair, Studio',
      'tag': 'Services',
    },
    {
      'title': 'Agri-Adjacent',
      'desc': 'Hydroponics, Egg Wholesale, Fresh Juices, Produce',
      'tag': 'Agri',
    },
    {
      'title': 'Digital & Creative',
      'desc': 'Freelance Agency, Digital Products, Content Creation',
      'tag': 'Digital',
    },
  ];

  final List<String> _locationSuggestions = [
    'Quezon City, Metro Manila',
    'City of Manila, Metro Manila',
    'Malolos, Bulacan',
    'Cebu City, Visayas',
    'Davao City, Mindanao',
  ];

  final List<Map<String, String>> _experienceLevels = [
    {
      'title': 'First-Timer',
      'desc': 'This is my first time starting a business in the Philippines.',
    },
    {
      'title': 'Some Experience',
      'desc': 'I have sold online or resold items informally before.',
    },
    {
      'title': 'Experienced Entrepreneur',
      'desc': 'I have managed or operated a registered business before.',
    },
  ];

  @override
  void initState() {
    super.initState();
    final provider = Provider.of<AppStateProvider>(context, listen: false);
    _selectedCategory = provider.selectedCategory;
    _selectedBudget = provider.selectedBudget;
    _selectedLocation = provider.selectedLocation;
    _selectedExperience = provider.selectedExperience;
    _locationController.text = _selectedLocation;
  }

  void _nextStep() {
    if (_currentStep < _totalSteps - 1) {
      setState(() => _currentStep++);
    }
  }

  void _previousStep() {
    if (_currentStep > 0) {
      setState(() => _currentStep--);
    }
  }

  void _jumpToStep(int step) {
    setState(() => _currentStep = step);
  }

  void _finishWizard() async {
    final provider = Provider.of<AppStateProvider>(context, listen: false);

    provider.setWizardCategory(_selectedCategory);
    provider.setWizardBudget(_selectedBudget);
    provider.setWizardLocation(_locationController.text.isEmpty
        ? 'Quezon City'
        : _locationController.text);
    provider.setWizardExperience(_selectedExperience);

    await provider.completeWizardAndSave();
    await provider.runAIRoadmapPersonalization();

    if (!mounted) return;

    if (widget.isEditingMode) {
      Navigator.pop(context);
    } else {
      // Frame account creation as "Save your roadmap"
      _showAccountCreationDialog(context);
    }
  }

  void _showAccountCreationDialog(BuildContext context) {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();

    showCupertinoDialog(
      context: context,
      builder: (ctx) => CupertinoAlertDialog(
        title: const Text('Save Your Business Roadmap'),
        content: Padding(
          padding: const EdgeInsets.only(top: 12.0),
          child: Column(
            children: [
              const Text(
                'Create your free account to lock in your personalized roadmap and cost sheets.',
                style: TextStyle(fontSize: 12.5),
              ),
              const SizedBox(height: 12.0),
              CupertinoTextField(
                controller: nameCtrl,
                placeholder: 'Your Name (e.g. Maria Santos)',
              ),
              const SizedBox(height: 8.0),
              CupertinoTextField(
                controller: emailCtrl,
                placeholder: 'Email address',
                keyboardType: TextInputType.emailAddress,
              ),
            ],
          ),
        ),
        actions: [
          CupertinoDialogAction(
            child: const Text('Skip for Now'),
            onPressed: () {
              Navigator.pop(ctx);
              Navigator.pushReplacement(
                context,
                CupertinoPageRoute(builder: (_) => const AppScaffoldScreen()),
              );
            },
          ),
          CupertinoDialogAction(
            isDefaultAction: true,
            child: const Text('Create Account'),
            onPressed: () async {
              final provider = Provider.of<AppStateProvider>(context, listen: false);
              await provider.authenticateUser(
                name: nameCtrl.text,
                email: emailCtrl.text,
              );
              Navigator.pop(ctx);
              Navigator.pushReplacement(
                context,
                CupertinoPageRoute(builder: (_) => const AppScaffoldScreen()),
              );
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background, // Pure white #FFFFFF
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(60.0),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8.0),
            child: Row(
              children: [
                if (_currentStep > 0)
                  IconButton(
                    icon: const Icon(CupertinoIcons.arrow_left, color: AppColors.aubergine),
                    onPressed: _previousStep,
                  )
                else
                  const SizedBox(width: 48.0),

                Expanded(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        'Step ${_currentStep + 1} of $_totalSteps',
                        style: AppTypography.caption(color: AppColors.textMuted),
                      ),
                      const SizedBox(height: 4.0),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(4.0),
                        child: LinearProgressIndicator(
                          value: (_currentStep + 1) / _totalSteps,
                          minHeight: 6.0,
                          backgroundColor: AppColors.hairlineBorder,
                          valueColor: const AlwaysStoppedAnimation<Color>(AppColors.aubergine),
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(width: 48.0),
              ],
            ),
          ),
        ),
      ),
      body: AnimatedSwitcher(
        duration: const Duration(milliseconds: 300),
        switchInCurve: Curves.easeOutCubic,
        switchOutCurve: Curves.easeInCubic,
        transitionBuilder: (child, anim) {
          return SlideTransition(
            position: Tween<Offset>(
              begin: const Offset(0.3, 0.0),
              end: Offset.zero,
            ).animate(anim),
            child: FadeTransition(opacity: anim, child: child),
          );
        },
        child: KeyedSubtree(
          key: ValueKey<int>(_currentStep),
          child: _buildStepContent(),
        ),
      ),
    );
  }

  Widget _buildStepContent() {
    switch (_currentStep) {
      case 0:
        return _buildStep1Category();
      case 1:
        return _buildStep2Budget();
      case 2:
        return _buildStep3Location();
      case 3:
        return _buildStep4Experience();
      case 4:
        return _buildStep5Summary();
      default:
        return const SizedBox();
    }
  }

  // Step 1: Category
  Widget _buildStep1Category() {
    return ListView(
      padding: const EdgeInsets.all(20.0),
      children: [
        const Center(child: WizardCategoryIllustration()),
        const SizedBox(height: 16.0),
        Text(
          'What do you want to build?',
          style: AppTypography.displayTitle(),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6.0),
        Text(
          'Select your small business category to load curated Philippine roadmap templates.',
          style: AppTypography.body(color: AppColors.textMuted),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24.0),
        ..._categories.map((cat) {
          final isSelected = _selectedCategory == cat['title'];
          return AppCard(
            borderColor: isSelected ? AppColors.aubergine : AppColors.hairlineBorder,
            backgroundColor: isSelected ? AppColors.aubergineTint : AppColors.cardBg,
            onTap: () {
              setState(() => _selectedCategory = cat['title']!);
              _nextStep();
            },
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10.0),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.aubergine : AppColors.hairlineBorder,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    CupertinoIcons.briefcase_fill,
                    size: 20.0,
                    color: isSelected ? Colors.white : AppColors.textDark,
                  ),
                ),
                const SizedBox(width: 14.0),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        cat['title']!,
                        style: AppTypography.bodyBold(
                          color: isSelected ? AppColors.aubergine : AppColors.textDark,
                          fontSize: 16.0,
                        ),
                      ),
                      const SizedBox(height: 2.0),
                      Text(
                        cat['desc']!,
                        style: AppTypography.caption(color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  const Icon(
                    CupertinoIcons.checkmark_alt_circle_fill,
                    color: AppColors.aubergine,
                    size: 22.0,
                  ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // Step 2: Budget Range
  Widget _buildStep2Budget() {
    return ListView(
      padding: const EdgeInsets.all(20.0),
      children: [
        const Center(child: WizardBudgetIllustration()),
        const SizedBox(height: 16.0),
        Text(
          'What\'s your starting budget?',
          style: AppTypography.displayTitle(),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6.0),
        Text(
          'Your budget recalibrates initial working capital & equipment allocations.',
          style: AppTypography.body(color: AppColors.textMuted),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 30.0),

        // Currency Monospace Display
        Center(
          child: CurrencyText(
            amount: _selectedBudget,
            fontSize: 36.0,
            color: AppColors.aubergine,
          ),
        ),
        const SizedBox(height: 20.0),

        CupertinoSlider(
          value: _selectedBudget,
          min: 5000.0,
          max: 150000.0,
          divisions: 29,
          activeColor: AppColors.aubergine,
          thumbColor: AppColors.yellow,
          onChanged: (val) => setState(() => _selectedBudget = val),
        ),

        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 10.0),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('₱5,000 (Micro)', style: TextStyle(fontSize: 12.0, color: AppColors.textMuted)),
              Text('₱150,000 (Full Shop)', style: TextStyle(fontSize: 12.0, color: AppColors.textMuted)),
            ],
          ),
        ),

        const SizedBox(height: 40.0),

        AppButton(
          label: 'Continue',
          onPressed: _nextStep,
        ),
      ],
    );
  }

  // Step 3: Location
  Widget _buildStep3Location() {
    return ListView(
      padding: const EdgeInsets.all(20.0),
      children: [
        const Center(child: WizardLocationIllustration()),
        const SizedBox(height: 16.0),
        Text(
          'Where are you starting?',
          style: AppTypography.displayTitle(),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6.0),
        Text(
          'Location determines local permit costs and matches nearest suppliers.',
          style: AppTypography.body(color: AppColors.textMuted),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24.0),

        // Location Text Field
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 4.0),
          decoration: BoxDecoration(
            color: AppColors.cardBg,
            borderRadius: BorderRadius.circular(16.0),
            border: Border.all(color: AppColors.hairlineBorder),
          ),
          child: Row(
            children: [
              const Icon(CupertinoIcons.location_solid, color: AppColors.blue, size: 20.0),
              const SizedBox(width: 10.0),
              Expanded(
                child: TextField(
                  controller: _locationController,
                  decoration: const InputDecoration(
                    hintText: 'Enter City or Barangay (e.g. Quezon City)',
                    border: InputBorder.none,
                  ),
                  style: AppTypography.bodyBold(),
                  onChanged: (val) => setState(() => _selectedLocation = val),
                ),
              ),
            ],
          ),
        ),

        const SizedBox(height: 20.0),
        Text('Suggested Metro & Regional Hubs:', style: AppTypography.caption()),
        const SizedBox(height: 8.0),

        Wrap(
          spacing: 8.0,
          runSpacing: 8.0,
          children: _locationSuggestions.map((loc) {
            final isSelected = _locationController.text == loc;
            return GestureDetector(
              onTap: () {
                setState(() {
                  _selectedLocation = loc;
                  _locationController.text = loc;
                });
              },
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
                decoration: BoxDecoration(
                  color: isSelected ? AppColors.blueTint : AppColors.cardBg,
                  borderRadius: BorderRadius.circular(14.0),
                  border: Border.all(
                    color: isSelected ? AppColors.blue : AppColors.hairlineBorder,
                  ),
                ),
                child: Text(
                  loc,
                  style: TextStyle(
                    fontSize: 12.5,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? AppColors.aubergine : AppColors.textDark,
                  ),
                ),
              ),
            );
          }).toList(),
        ),

        const SizedBox(height: 40.0),

        AppButton(
          label: 'Continue',
          onPressed: _nextStep,
        ),
      ],
    );
  }

  // Step 4: Experience Level
  Widget _buildStep4Experience() {
    return ListView(
      padding: const EdgeInsets.all(20.0),
      children: [
        const Center(child: WizardExperienceIllustration()),
        const SizedBox(height: 16.0),
        Text(
          'Have you done this before?',
          style: AppTypography.displayTitle(),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6.0),
        Text(
          'We adjust initial step details based on your business background.',
          style: AppTypography.body(color: AppColors.textMuted),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24.0),

        ..._experienceLevels.map((exp) {
          final isSelected = _selectedExperience == exp['title'];
          return AppCard(
            borderColor: isSelected ? AppColors.green : AppColors.hairlineBorder,
            backgroundColor: isSelected ? AppColors.greenTint : AppColors.cardBg,
            onTap: () {
              setState(() => _selectedExperience = exp['title']!);
              _nextStep();
            },
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10.0),
                  decoration: BoxDecoration(
                    color: isSelected ? AppColors.green : AppColors.hairlineBorder,
                    shape: BoxShape.circle,
                  ),
                  child: Icon(
                    CupertinoIcons.person_badge_plus_fill,
                    size: 20.0,
                    color: isSelected ? Colors.white : AppColors.textDark,
                  ),
                ),
                const SizedBox(width: 14.0),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        exp['title']!,
                        style: AppTypography.bodyBold(
                          color: isSelected ? AppColors.aubergine : AppColors.textDark,
                          fontSize: 16.0,
                        ),
                      ),
                      const SizedBox(height: 2.0),
                      Text(
                        exp['desc']!,
                        style: AppTypography.caption(color: AppColors.textMuted),
                      ),
                    ],
                  ),
                ),
                if (isSelected)
                  const Icon(
                    CupertinoIcons.checkmark_alt_circle_fill,
                    color: AppColors.green,
                    size: 22.0,
                  ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // Step 5: Summary
  Widget _buildStep5Summary() {
    return ListView(
      padding: const EdgeInsets.all(20.0),
      children: [
        Text(
          'Confirm Your Startup Blueprint',
          style: AppTypography.displayTitle(),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 6.0),
        Text(
          'Review your answers before generating your custom roadmap.',
          style: AppTypography.body(color: AppColors.textMuted),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24.0),

        _SummaryItemRow(
          title: 'Business Category',
          value: _selectedCategory,
          onTapEdit: () => _jumpToStep(0),
        ),
        _SummaryItemRow(
          title: 'Starting Capital',
          valueWidget: CurrencyText(amount: _selectedBudget, fontSize: 16.0),
          onTapEdit: () => _jumpToStep(1),
        ),
        _SummaryItemRow(
          title: 'Location',
          value: _selectedLocation,
          onTapEdit: () => _jumpToStep(2),
        ),
        _SummaryItemRow(
          title: 'Experience Level',
          value: _selectedExperience,
          onTapEdit: () => _jumpToStep(3),
        ),

        const SizedBox(height: 30.0),

        AppButton(
          label: 'Build My Roadmap',
          onPressed: _finishWizard,
        ),
      ],
    );
  }
}

class _SummaryItemRow extends StatelessWidget {
  final String title;
  final String? value;
  final Widget? valueWidget;
  final VoidCallback onTapEdit;

  const _SummaryItemRow({
    required this.title,
    this.value,
    this.valueWidget,
    required this.onTapEdit,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      margin: const EdgeInsets.only(bottom: 10.0),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: AppTypography.caption(color: AppColors.textMuted)),
              const SizedBox(height: 2.0),
              valueWidget ??
                  Text(
                    value ?? '',
                    style: AppTypography.bodyBold(color: AppColors.textDark, fontSize: 15.0),
                  ),
            ],
          ),
          CupertinoButton(
            padding: EdgeInsets.zero,
            onPressed: onTapEdit,
            child: Row(
              children: [
                Text('Change', style: AppTypography.caption(color: AppColors.blue)),
                const SizedBox(width: 4.0),
                const Icon(CupertinoIcons.pencil, size: 14.0, color: AppColors.blue),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
