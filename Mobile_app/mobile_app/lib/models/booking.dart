class Booking {
  final String id;
  final String providerId;
  final String userId;
  final DateTime date;
  final String status;

  Booking({
    required this.id,
    required this.providerId,
    required this.userId,
    required this.date,
    this.status = "pending",
  });

  factory Booking.fromJson(Map<String, dynamic> json) => Booking(
        id: json['id'].toString(),
        providerId: json['providerId'].toString(),
        userId: json['userId'].toString(),
        date: DateTime.parse(json['date']),
        status: json['status'] ?? "pending",
      );

  Map<String, dynamic> toJson() => {
        "id": id,
        "providerId": providerId,
        "userId": userId,
        "date": date.toIso8601String(),
        "status": status,
      };
}
