class Formatters {
  static String currency(double amount) {
    return "₹${amount.toStringAsFixed(2)}";
  }

  static String truncate(String text, {int length = 50}) {
    return text.length > length ? '${text.substring(0, length)}...' : text;
  }
}
