import 'package:location/location.dart';
import 'package:shared_preferences/shared_preferences.dart';

class LocationHelper {
  static final Location _location = Location();

  // Requests permission, fetches current location, and stores it in SharedPreferences
  // Keys: 'last_lat', 'last_lng', 'last_loc_ts'
  static Future<LocationData?> getCurrentLocation() async {
    try {
      bool serviceEnabled = await _location.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await _location.requestService();
        if (!serviceEnabled) return null;
      }

      PermissionStatus permissionGranted = await _location.hasPermission();
      if (permissionGranted == PermissionStatus.denied) {
        permissionGranted = await _location.requestPermission();
        if (permissionGranted != PermissionStatus.granted) return null;
      }

      final data = await _location.getLocation();
      try {
        if (data.latitude != null && data.longitude != null) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setDouble('last_lat', data.latitude!);
          await prefs.setDouble('last_lng', data.longitude!);
          await prefs.setInt('last_loc_ts', DateTime.now().millisecondsSinceEpoch);
        }
      } catch (_) {
        // best-effort storing — ignore failures
      }
      return data;
    } catch (e) {
      // Swallow platform exceptions (e.g., SERVICE_STATUS_ERROR) and continue gracefully
      return null;
    }
  }
}
