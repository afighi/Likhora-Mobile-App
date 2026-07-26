import 'package:shared_preferences/shared_preferences.dart';

class LocalStorageService {
  static const String _keyOnboardingDone = 'likhora_onboarding_completed';
  static const String _keyUserCategory = 'likhora_user_category';
  static const String _keyUserBudget = 'likhora_user_budget';
  static const String _keyUserLocation = 'likhora_user_location';
  static const String _keyUserExperience = 'likhora_user_experience';
  static const String _keyAuthToken = 'likhora_auth_token';

  static Future<bool> isOnboardingCompleted() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getBool(_keyOnboardingDone) ?? false;
  }

  static Future<void> setOnboardingCompleted(bool value) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool(_keyOnboardingDone, value);
  }

  static Future<void> saveWizardData({
    required String category,
    required double budget,
    required String location,
    required String experience,
  }) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyUserCategory, category);
    await prefs.setDouble(_keyUserBudget, budget);
    await prefs.setString(_keyUserLocation, location);
    await prefs.setString(_keyUserExperience, experience);
  }

  static Future<Map<String, dynamic>> loadWizardData() async {
    final prefs = await SharedPreferences.getInstance();
    return {
      'category': prefs.getString(_keyUserCategory) ?? 'Food & Beverage',
      'budget': prefs.getDouble(_keyUserBudget) ?? 30000.0,
      'location': prefs.getString(_keyUserLocation) ?? 'Quezon City',
      'experience': prefs.getString(_keyUserExperience) ?? 'First-Timer',
    };
  }

  static Future<bool> isAuthenticated() async {
    final prefs = await SharedPreferences.getInstance();
    return (prefs.getString(_keyAuthToken) ?? '').isNotEmpty;
  }

  static Future<void> setAuthToken(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_keyAuthToken, token);
  }

  static Future<void> clearSession() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyAuthToken);
  }
}
