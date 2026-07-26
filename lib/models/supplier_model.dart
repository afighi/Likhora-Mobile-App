class Supplier {
  final String id;
  String name;
  String category; // Packaging, Raw Ingredients, Equipment, Printing
  String address;
  double latitude;
  double longitude;
  double distanceKm;
  List<String> linkedProductTags;
  String contactInfo;
  String addedByAdminId;
  DateTime createdAt;

  Supplier({
    required this.id,
    required this.name,
    required this.category,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.distanceKm = 0.0,
    required this.linkedProductTags,
    required this.contactInfo,
    required this.addedByAdminId,
    required this.createdAt,
  });

  Supplier copyWith({
    String? name,
    String? category,
    String? address,
    double? latitude,
    double? longitude,
    double? distanceKm,
    List<String>? linkedProductTags,
    String? contactInfo,
    String? addedByAdminId,
  }) {
    return Supplier(
      id: id,
      name: name ?? this.name,
      category: category ?? this.category,
      address: address ?? this.address,
      latitude: latitude ?? this.latitude,
      longitude: longitude ?? this.longitude,
      distanceKm: distanceKm ?? this.distanceKm,
      linkedProductTags: linkedProductTags ?? this.linkedProductTags,
      contactInfo: contactInfo ?? this.contactInfo,
      addedByAdminId: addedByAdminId ?? this.addedByAdminId,
      createdAt: createdAt,
    );
  }
}
