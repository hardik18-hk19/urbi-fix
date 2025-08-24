class AIResult {
  final String category;
  final String severity;
  final List<String> tags;
  final List<String> reasons;

  AIResult({
    required this.category,
    required this.severity,
    required this.tags,
    required this.reasons,
  });

  factory AIResult.fromJson(Map<String, dynamic> json) => AIResult(
        category: json['category'] ?? '',
        severity: json['severity'] ?? '',
        tags: List<String>.from(json['tags'] ?? []),
        reasons: List<String>.from(json['reasons'] ?? []),
      );

  Map<String, dynamic> toJson() => {
        "category": category,
        "severity": severity,
        "tags": tags,
        "reasons": reasons,
      };
}
