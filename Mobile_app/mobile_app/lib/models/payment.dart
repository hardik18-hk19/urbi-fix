class Payment {
  final String id;
  final String bookingId;
  final double amount;
  final String status;

  Payment({
    required this.id,
    required this.bookingId,
    required this.amount,
    this.status = "pending",
  });

  factory Payment.fromJson(Map<String, dynamic> json) => Payment(
        id: json['id'].toString(),
        bookingId: json['bookingId'].toString(),
        amount: (json['amount'] as num).toDouble(),
        status: json['status'] ?? "pending",
      );

  Map<String, dynamic> toJson() => {
        "id": id,
        "bookingId": bookingId,
        "amount": amount,
        "status": status,
      };
}
