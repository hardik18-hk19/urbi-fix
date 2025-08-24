import 'package:flutter/material.dart';
import '../../../config/api_config.dart';
import '../../consumer/widgets/funding_tabs.dart';
import 'auto_assignment_status.dart';

class PostContentWithQr extends StatelessWidget {
  final String content;
  final Map<String, dynamic>? issueData;
  final Function(double)? onContribute;
  final bool isLoading;
  final VoidCallback? onStatusUpdate;
  
  const PostContentWithQr({
    super.key, 
    required this.content,
    this.issueData,
    this.onContribute,
    this.isLoading = false,
    this.onStatusUpdate,
  });

  @override
  Widget build(BuildContext context) {
    final lines = content.split('\n');
    String? qrUrl;
    String? payUrl; // to synthesize QR if server returns text fallback
    final otherLines = <String>[];

    for (final line in lines) {
      final trimmed = line.trim();
      final lower = trimmed.toLowerCase();
      if (lower.startsWith('qr:')) {
        final val = trimmed.substring(3).trim();
        qrUrl = val.isNotEmpty ? val : null;
      } else if (lower.startsWith('payment link/upi:')) {
        final val = trimmed.substring('payment link/upi:'.length).trim();
        if (val.isNotEmpty) payUrl = val;
        otherLines.add(line);
      } else {
        otherLines.add(line);
      }
    }

    final textWidget = otherLines.isEmpty
        ? const SizedBox.shrink()
        : Text(otherLines.join('\n'));

    if (qrUrl == null && payUrl == null) {
      return textWidget;
    }

    // Build full URL for server-provided QR (may be .png or .txt)
    String? fullUrl;
    if (qrUrl != null) {
      final uri = Uri.tryParse(qrUrl);
      final isAbsolute = uri != null && uri.hasScheme;
      fullUrl = isAbsolute ? qrUrl : "${ApiConfig.baseUrl}$qrUrl";
    }

    // If backend fell back to a .txt file, synthesize a QR from the payment link
    final isTextFile = (fullUrl ?? '').toLowerCase().endsWith('.txt');
    final displayUrl = (isTextFile && payUrl != null)
        ? 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + Uri.encodeComponent(payUrl)
        : fullUrl;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (otherLines.isNotEmpty) textWidget,
        if (otherLines.isNotEmpty) const SizedBox(height: 8),
        if (displayUrl != null)
          ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              displayUrl,
              height: 160,
              width: 160,
              fit: BoxFit.cover,
              errorBuilder: (_, __, ___) => Text('QR: $qrUrl'),
            ),
          ),
        // Add funding tabs when QR is present and we have issue data
        if (displayUrl != null && issueData != null && onContribute != null) ...[
          const SizedBox(height: 16),
          FundingTabs(
            currentAmount: (issueData!['funding_current'] as num?)?.toDouble() ?? 0.0,
            goalAmount: (issueData!['funding_goal'] as num?)?.toDouble() ?? 1000.0,
            onContribute: onContribute!,
            isLoading: isLoading,
          ),
        ],
        // Add auto-assignment status when we have issue data
        if (issueData != null) ...[
          const SizedBox(height: 16),
          AutoAssignmentStatus(
            issueData: issueData!,
            onStatusUpdate: onStatusUpdate,
          ),
        ],
      ],
    );
  }
}