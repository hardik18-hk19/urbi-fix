import 'package:flutter/material.dart';
import '../config/theme.dart';

class RatingWidget extends StatelessWidget {
  final double rating;
  final void Function(double) onRatingChanged;

  const RatingWidget({Key? key, required this.rating, required this.onRatingChanged})
      : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Row(
      children: List.generate(5, (index) {
        return IconButton(
          icon: Icon(
            index < rating ? Icons.star : Icons.star_border,
            color: AppColors.yellow,
          ),
          onPressed: () => onRatingChanged(index + 1.0),
        );
      }),
    );
  }
}