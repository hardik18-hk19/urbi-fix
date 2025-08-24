class ProviderModel {
  final String id;
  final String name;
  final String skill;
  final double rating;
  final String? profileImage;

  ProviderModel({
    required this.id,
    required this.name,
    required this.skill,
    required this.rating,
    this.profileImage,
  });

  factory ProviderModel.fromJson(Map<String, dynamic> json) => ProviderModel(
        id: json['id'].toString(),
        name: json['name'] ?? '',
        skill: json['skill'] ?? '',
        rating: (json['rating'] ?? 0).toDouble(),
        profileImage: json['profileImage'],
      );

  Map<String, dynamic> toJson() => {
        "id": id,
        "name": name,
        "skill": skill,
        "rating": rating,
        "profileImage": profileImage,
      };
}
