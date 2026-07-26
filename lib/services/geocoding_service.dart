import 'dart:math';
import '../models/supplier_model.dart';

/// Geocoding API Integration Service
/// Converts supplier addresses to coordinates and calculates distances from user.
class GeocodingService {
  GeocodingService._();

  // Reference User Center Coordinate (e.g. Quezon City / Metro Manila)
  static const double userLat = 14.6507;
  static const double userLng = 121.0305;

  /// Calculates Haversine distance in kilometers between two lat/lng pairs
  static double calculateDistanceKm(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const p = 0.017453292519943295; // Math.PI / 180
    final a = 0.5 -
        cos((lat2 - lat1) * p) / 2 +
        cos(lat1 * p) * cos(lat2 * p) * (1 - cos((lon2 - lon1) * p)) / 2;
    return 12742 * asin(sqrt(a)); // 2 * R; R = 6371 km
  }

  /// Converts a Philippine address string into estimated coordinates
  static Future<Map<String, double>> geocodeAddress(String address) async {
    await Future.delayed(const Duration(milliseconds: 600));

    final addrLower = address.toLowerCase();

    if (addrLower.contains('manila') || addrLower.contains('divisoria')) {
      return {'latitude': 14.5995, 'longitude': 120.9842};
    } else if (addrLower.contains('bulacan')) {
      return {'latitude': 14.8527, 'longitude': 120.8160};
    } else if (addrLower.contains('cebu')) {
      return {'latitude': 10.3157, 'longitude': 123.8854};
    } else if (addrLower.contains('davao')) {
      return {'latitude': 7.1907, 'longitude': 125.4553};
    } else {
      // Default Metro Manila coordinate
      return {'latitude': 14.6091, 'longitude': 121.0223};
    }
  }

  /// Updates distanceKm field on supplier list based on user location
  static List<Supplier> calculateSupplierDistances(
    List<Supplier> suppliers,
    double originLat,
    double originLng,
  ) {
    return suppliers.map((s) {
      final dist = calculateDistanceKm(originLat, originLng, s.latitude, s.longitude);
      return s.copyWith(distanceKm: dist);
    }).toList();
  }
}
