import 'package:flutter/material.dart';
import '../models/user_profile_model.dart';
import '../models/roadmap_model.dart';
import '../models/pricing_model.dart';
import '../models/supplier_model.dart';
import '../models/progress_nudge_model.dart';
import '../services/local_storage_service.dart';
import '../services/geocoding_service.dart';
import '../services/ai_service.dart';

class AppStateProvider extends ChangeNotifier {
  bool _isOnboardingCompleted = false;
  bool _isAuthenticated = false;
  bool _isDeviceFrameEnabled = true;
  int _currentTabIndex = 0;

  // User Wizard Choices
  String _selectedCategory = 'Food & Beverage';
  double _selectedBudget = 30000.0;
  String _selectedLocation = 'Quezon City';
  String _selectedExperience = 'First-Timer';

  UserProfile? _currentUserProfile;

  // Roadmap State
  List<RoadmapStep> _roadmapSteps = [];

  // Pricing Calculation State
  late PricingCalculation _pricingCalculation;

  // Supplier Directory State
  List<Supplier> _suppliers = [];
  String _supplierSearchQuery = '';
  String _selectedSupplierCategory = 'All';

  AppStateProvider() {
    _initDefaultState();
  }

  // Getters
  bool get isOnboardingCompleted => _isOnboardingCompleted;
  bool get isAuthenticated => _isAuthenticated;
  bool get isDeviceFrameEnabled => _isDeviceFrameEnabled;
  int get currentTabIndex => _currentTabIndex;

  String get selectedCategory => _selectedCategory;
  double get selectedBudget => _selectedBudget;
  String get selectedLocation => _selectedLocation;
  String get selectedExperience => _selectedExperience;

  UserProfile? get currentUserProfile => _currentUserProfile;
  List<RoadmapStep> get roadmapSteps => _roadmapSteps;
  PricingCalculation get pricingCalculation => _pricingCalculation;
  List<MaterialItem> get pricingItems => _pricingCalculation.materials;
  double get totalIngredientsCost =>
      _pricingCalculation.materials.fold(0.0, (sum, m) => sum + m.unitCost);
  List<Supplier> get suppliers => _suppliers;
  String get supplierSearchQuery => _supplierSearchQuery;
  String get selectedSupplierCategory => _selectedSupplierCategory;

  // Filtered Suppliers for Directory View
  List<Supplier> get filteredSuppliers {
    return _suppliers.where((s) {
      final matchesSearch = s.name.toLowerCase().contains(_supplierSearchQuery.toLowerCase()) ||
          s.address.toLowerCase().contains(_supplierSearchQuery.toLowerCase()) ||
          s.linkedProductTags.any((t) => t.toLowerCase().contains(_supplierSearchQuery.toLowerCase()));
      final matchesCategory = _selectedSupplierCategory == 'All' || s.category == _selectedSupplierCategory;
      return matchesSearch && matchesCategory;
    }).toList();
  }

  // Progress metrics
  int get completedStepsCount => _roadmapSteps.where((s) => s.isCompleted).length;
  int get totalStepsCount => _roadmapSteps.length;
  double get overallProgressPercent =>
      totalStepsCount > 0 ? (completedStepsCount / totalStepsCount) : 0.0;

  // Actions
  void setTabIndex(int index) {
    _currentTabIndex = index;
    notifyListeners();
  }

  void toggleDeviceFrame() {
    _isDeviceFrameEnabled = !_isDeviceFrameEnabled;
    notifyListeners();
  }

  void setWizardCategory(String cat) {
    _selectedCategory = cat;
    _loadRoadmapForCategory(cat);
    notifyListeners();
  }

  void setWizardBudget(double val) {
    _selectedBudget = val;
    notifyListeners();
  }

  void setWizardLocation(String loc) {
    _selectedLocation = loc;
    notifyListeners();
  }

  void setWizardExperience(String exp) {
    _selectedExperience = exp;
    notifyListeners();
  }

  Future<void> completeWizardAndSave() async {
    _isOnboardingCompleted = true;
    await LocalStorageService.setOnboardingCompleted(true);
    await LocalStorageService.saveWizardData(
      category: _selectedCategory,
      budget: _selectedBudget,
      location: _selectedLocation,
      experience: _selectedExperience,
    );
    notifyListeners();
  }

  Future<void> authenticateUser({required String name, required String email}) async {
    _currentUserProfile = UserProfile(
      id: 'usr_${DateTime.now().millisecondsSinceEpoch}',
      name: name.isEmpty ? 'Filipino Entrepreneur' : name,
      email: email.isEmpty ? 'user@likhora.ph' : email,
      businessName: 'My $_selectedCategory Enterprise',
      businessType: _selectedCategory,
      budgetMin: _selectedBudget * 0.8,
      budgetMax: _selectedBudget * 1.2,
      location: _selectedLocation,
      experienceLevel: _selectedExperience,
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
    _isAuthenticated = true;
    await LocalStorageService.setAuthToken('token_authenticated');
    notifyListeners();
  }

  void signOut() async {
    _isAuthenticated = false;
    _currentUserProfile = null;
    await LocalStorageService.clearSession();
    notifyListeners();
  }

  Future<void> runAIRoadmapPersonalization() async {
    final updatedSteps = await AIService.personalizeRoadmapSteps(
      businessType: _selectedCategory,
      budget: _selectedBudget,
      location: _selectedLocation,
      experienceLevel: _selectedExperience,
      baseSteps: _roadmapSteps,
    );
    _roadmapSteps = updatedSteps;
    notifyListeners();
  }

  void toggleChecklistItem(String stepId, String itemId) {
    final stepIdx = _roadmapSteps.indexWhere((s) => s.id == stepId);
    if (stepIdx != -1) {
      final reqIdx = _roadmapSteps[stepIdx].requirements.indexWhere((r) => r.id == itemId);
      if (reqIdx != -1) {
        _roadmapSteps[stepIdx].requirements[reqIdx].isCompleted =
            !_roadmapSteps[stepIdx].requirements[reqIdx].isCompleted;

        // If all checklist items done, activate or complete
        bool allDone = _roadmapSteps[stepIdx].requirements.every((r) => r.isCompleted);
        if (allDone) {
          _roadmapSteps[stepIdx].status = StepStatus.completed;
          _unlockNextStep(stepIdx);
        }
        notifyListeners();
      }
    }
  }

  void markStepCompleted(String stepId) {
    final idx = _roadmapSteps.indexWhere((s) => s.id == stepId);
    if (idx != -1) {
      _roadmapSteps[idx].status = StepStatus.completed;
      for (var req in _roadmapSteps[idx].requirements) {
        req.isCompleted = true;
      }
      _unlockNextStep(idx);
      notifyListeners();
    }
  }

  void _unlockNextStep(int completedIndex) {
    if (completedIndex + 1 < _roadmapSteps.length) {
      if (_roadmapSteps[completedIndex + 1].status == StepStatus.locked) {
        _roadmapSteps[completedIndex + 1].status = StepStatus.active;
      }
    }
  }

  // Pricing Actions
  void updatePricingField({
    double? hourlyLaborRate,
    double? laborHoursPerBatch,
    double? monthlyOverheadAllocation,
    int? batchYield,
    double? targetMarginPercent,
  }) {
    if (hourlyLaborRate != null) _pricingCalculation.hourlyLaborRate = hourlyLaborRate;
    if (laborHoursPerBatch != null) _pricingCalculation.laborHoursPerBatch = laborHoursPerBatch;
    if (monthlyOverheadAllocation != null) _pricingCalculation.monthlyOverheadAllocation = monthlyOverheadAllocation;
    if (batchYield != null) _pricingCalculation.batchYield = batchYield;
    if (targetMarginPercent != null) _pricingCalculation.targetMarginPercent = targetMarginPercent;
    notifyListeners();
  }

  void updateIngredientCost(String id, double newCost) {
    final idx = _pricingCalculation.materials.indexWhere((m) => m.id == id);
    if (idx != -1) {
      _pricingCalculation.materials[idx].unitCost = newCost.clamp(1.0, 999.0);
      notifyListeners();
    }
  }

  void addMaterialItem(MaterialItem item) {
    _pricingCalculation.materials.add(item);
    notifyListeners();
  }

  void removeMaterialItem(String id) {
    _pricingCalculation.materials.removeWhere((m) => m.id == id);
    notifyListeners();
  }

  // Supplier Admin CRUD Actions
  void addSupplier(Supplier s) {
    _suppliers.insert(0, s);
    notifyListeners();
  }

  void updateSupplier(Supplier updated) {
    final idx = _suppliers.indexWhere((s) => s.id == updated.id);
    if (idx != -1) {
      _suppliers[idx] = updated;
      notifyListeners();
    }
  }

  void deleteSupplier(String supplierId) {
    _suppliers.removeWhere((s) => s.id == supplierId);
    notifyListeners();
  }

  void setSupplierSearchQuery(String query) {
    _supplierSearchQuery = query;
    notifyListeners();
  }

  void setSupplierCategoryFilter(String category) {
    _selectedSupplierCategory = category;
    notifyListeners();
  }

  // Init Data
  void _initDefaultState() {
    _pricingCalculation = PricingCalculation(
      id: 'calc_1',
      userId: 'usr_1',
      productName: 'Pork Silog',
      materials: [
        MaterialItem(id: 'm1', name: 'Pork (per serving)', unitCost: 32.0, quantityPerBatch: 1, unit: 'serving'),
        MaterialItem(id: 'm2', name: 'Rice (per serving)', unitCost: 12.0, quantityPerBatch: 1, unit: 'serving'),
        MaterialItem(id: 'm3', name: 'Cooking Oil & Spices', unitCost: 29.0, quantityPerBatch: 1, unit: 'portion'),
      ],
      hourlyLaborRate: 65.0,
      laborHoursPerBatch: 2.0,
      monthlyOverheadAllocation: 0.0,
      batchYield: 1,
      targetMarginPercent: 35.0,
      createdAt: DateTime.now(),
    );

    _suppliers = [
      Supplier(
        id: 'sup_1',
        name: 'Divisoria Wholesale Packaging Hub',
        category: 'Packaging',
        address: 'Tabora St., Divisoria, City of Manila',
        latitude: 14.5995,
        longitude: 120.9842,
        distanceKm: 4.2,
        linkedProductTags: ['Packaging', 'Bags', 'Cups', 'Sealer', 'Stickers'],
        contactInfo: '+63 917 555 0192',
        addedByAdminId: 'admin_1',
        createdAt: DateTime.now(),
      ),
      Supplier(
        id: 'sup_2',
        name: 'Bulacan Agro-Grains Wholesalers',
        category: 'Raw Ingredients',
        address: 'McArthur Highway, Malolos, Bulacan',
        latitude: 14.8527,
        longitude: 120.8160,
        distanceKm: 28.5,
        linkedProductTags: ['Sugar', 'Flour', 'Tapioca', 'Dairy', 'Produce'],
        contactInfo: '+63 920 444 8100',
        addedByAdminId: 'admin_1',
        createdAt: DateTime.now(),
      ),
      Supplier(
        id: 'sup_3',
        name: 'QC Digital Print & Label Hub',
        category: 'Printing',
        address: 'E. Rodriguez Sr. Ave, Quezon City',
        latitude: 14.6200,
        longitude: 121.0350,
        distanceKm: 2.1,
        linkedProductTags: ['Labels', 'Printing', 'Stickers', 'Banners'],
        contactInfo: '+63 918 222 9311',
        addedByAdminId: 'admin_1',
        createdAt: DateTime.now(),
      ),
      Supplier(
        id: 'sup_4',
        name: 'Cebu Commercial Food Equipment',
        category: 'Equipment',
        address: 'AS Fortuna St., Mandaue City, Cebu',
        latitude: 10.3157,
        longitude: 123.8854,
        distanceKm: 570.0,
        linkedProductTags: ['Cup Sealer', 'Blenders', 'Espresso', 'Equipment'],
        contactInfo: '+63 932 777 4010',
        addedByAdminId: 'admin_1',
        createdAt: DateTime.now(),
      ),
    ];

    _loadRoadmapForCategory(_selectedCategory);
  }

  void _loadRoadmapForCategory(String category) {
    _roadmapSteps = [
      RoadmapStep(
        id: 'step_1',
        title: 'Business Registration & DTI Permit',
        description:
            'Reserve your unique business name via DTI BNRS, obtain Barangay Clearance, and prepare BIR 1901 tax registration.',
        category: StepCategory.legal,
        estimatedCostMin: 500.0,
        estimatedCostMax: 1800.0,
        estimatedDurationDays: 5,
        status: StepStatus.active,
        requirements: [
          RoadmapChecklistItem(id: 'r1', title: 'Check name availability on DTI BNRS portal', isCompleted: true),
          RoadmapChecklistItem(id: 'r2', title: 'Obtain Barangay Business Clearance', isCompleted: true),
          RoadmapChecklistItem(id: 'r3', title: 'Register BIR Form 1901 & Authority to Print receipts'),
        ],
        aiAnnotation:
            'Likhora AI Tip: DTI BNRS registration takes under 30 mins online. Register as Sole Proprietorship for minimal fees.',
        linkedSupplierTags: ['Printing', 'Labels'],
      ),
      RoadmapStep(
        id: 'step_2',
        title: 'Costing & Profit Margin Calculation',
        description:
            'Use Likhora Pricing Calculator to calculate exact unit costs, direct labor, overhead allocations, and set healthy 35%+ profit margins.',
        category: StepCategory.costing,
        estimatedCostMin: 0.0,
        estimatedCostMax: 0.0,
        estimatedDurationDays: 2,
        status: StepStatus.locked,
        requirements: [
          RoadmapChecklistItem(id: 'r4', title: 'List all raw materials & packaging per unit'),
          RoadmapChecklistItem(id: 'r5', title: 'Estimate hourly labor rate & batch yield'),
          RoadmapChecklistItem(id: 'r6', title: 'Lock in suggested unit selling price'),
        ],
        aiAnnotation:
            'Likhora AI Tip: Direct packaging typically accounts for 8-12% of total batch cost in Philippine retail.',
        linkedSupplierTags: ['Packaging', 'Raw Ingredients'],
      ),
      RoadmapStep(
        id: 'step_3',
        title: 'Raw Material & Equipment Sourcing',
        description:
            'Source your initial inventory and heavy-duty machinery from verified suppliers with wholesale minimum order quantities (MOQ).',
        category: StepCategory.supplier,
        estimatedCostMin: 5000.0,
        estimatedCostMax: 25000.0,
        estimatedDurationDays: 7,
        status: StepStatus.locked,
        requirements: [
          RoadmapChecklistItem(id: 'r7', title: 'Order sample batches from packaging supplier'),
          RoadmapChecklistItem(id: 'r8', title: 'Negotiate bulk terms with ingredient wholesaler'),
          RoadmapChecklistItem(id: 'r9', title: 'Test equipment calibration & trial batch'),
        ],
        aiAnnotation:
            'Likhora AI Tip: Divisoria packaging wholesalers offer up to 30% savings on 500+ unit orders.',
        linkedSupplierTags: ['Packaging', 'Raw Ingredients', 'Equipment'],
      ),
      RoadmapStep(
        id: 'step_4',
        title: 'Branding, Packaging & Soft Launch',
        description:
            'Finalize waterproof vinyl labels, setup Facebook/TikTok business pages, and launch a 3-day soft launch trial for pre-orders.',
        category: StepCategory.launch,
        estimatedCostMin: 1500.0,
        estimatedCostMax: 5000.0,
        estimatedDurationDays: 4,
        status: StepStatus.locked,
        requirements: [
          RoadmapChecklistItem(id: 'r10', title: 'Print vinyl sticker labels with QC Print Hub'),
          RoadmapChecklistItem(id: 'r11', title: 'Setup FB Page & TikTok Shop account'),
          RoadmapChecklistItem(id: 'r12', title: 'Run 3-day soft launch pre-orders'),
        ],
        aiAnnotation:
            'Likhora AI Tip: Collect written reviews from 10 soft launch customers to build instant trust.',
        linkedSupplierTags: ['Printing', 'Packaging'],
      ),
    ];
  }
}
