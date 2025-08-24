import 'package:flutter/material.dart';
import '../services/booking_service.dart';

class BookingState extends ChangeNotifier {
  final BookingService _bookingService = BookingService();
  List<dynamic> _bookings = [];
  bool _loading = false;

  List<dynamic> get bookings => _bookings;
  bool get isLoading => _loading;

  Future<void> fetchBookings() async {
    _loading = true;
    notifyListeners();

    _bookings = await _bookingService.getBookings();

    _loading = false;
    notifyListeners();
  }

  Future<void> createBooking(Map<String, dynamic> bookingData) async {
    _loading = true;
    notifyListeners();

    await _bookingService.createBooking(bookingData);
    await fetchBookings();

    _loading = false;
    notifyListeners();
  }
}
