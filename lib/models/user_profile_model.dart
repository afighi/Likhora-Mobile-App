class UserProfile {
  final String id;
  String name;
  String email;
  String businessName;
  String businessType; // Food, Retail, Services, Agriculture, Digital
  double budgetMin;
  double budgetMax;
  String location;
  String experienceLevel;
  DateTime createdAt;
  DateTime updatedAt;

  UserProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.businessName,
    required this.businessType,
    required this.budgetMin,
    required this.budgetMax,
    required this.location,
    required this.experienceLevel,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'businessName': businessName,
        'businessType': businessType,
        'budgetMin': budgetMin,
        'budgetMax': budgetMax,
        'location': location,
        'experienceLevel': experienceLevel,
        'createdAt': createdAt.toIso8601String(),
        'updatedAt': updatedAt.toIso8601String(),
      };

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
        id: json['id'] ?? '',
        name: json['name'] ?? '',
        email: json['email'] ?? '',
        businessName: json['businessName'] ?? '',
        businessType: json['businessType'] ?? 'Food & Beverage',
        budgetMin: (json['budgetMin'] as num?)?.toDouble() ?? 5000.0,
        budgetMax: (json['budgetMax'] as num?)?.toDouble() ?? 50000.0,
        location: json['location'] ?? 'Quezon City',
        experienceLevel: json['experienceLevel'] ?? 'First-Timer',
        createdAt: DateTime.tryParse(json['createdAt'] ?? '') ?? DateTime.now(),
        updatedAt: DateTime.tryParse(json['updatedAt'] ?? '') ?? DateTime.now(),
      );
}
