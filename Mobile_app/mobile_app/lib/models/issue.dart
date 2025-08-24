class Issue {
  final String id;
  final String title;
  final String description;
  final double? lat;
  final double? lng;
  final String status;
  final String? imageUrl;
  final Map<String, dynamic>? ai;

  Issue({
    required this.id,
    required this.title,
    required this.description,
    this.lat,
    this.lng,
    this.status = 'open',
    this.imageUrl,
    this.ai,
  });

  factory Issue.fromJson(Map<String, dynamic> json) => Issue(
        id: json['id'].toString(),
        title: json['title'] ?? '',
        description: json['description'] ?? '',
        lat: json['lat'] != null ? (json['lat'] as num).toDouble() : null,
        lng: json['lng'] != null ? (json['lng'] as num).toDouble() : null,
        status: json['status'] ?? 'open',
        imageUrl: json['image_url'],
        ai: json['ai'],
      );

  Map<String, dynamic> toJson() => {
        "id": id,
        "title": title,
        "description": description,
        "lat": lat,
        "lng": lng,
        "status": status,
        "image_url": imageUrl,
        "ai": ai,
      };
}
