import 'package:flutter/material.dart';
import 'package:location/location.dart';
import '../../services/forum_service.dart';
import '../../config/theme.dart';

class CreatePostPage extends StatefulWidget {
  const CreatePostPage({super.key});

  @override
  State<CreatePostPage> createState() => _CreatePostPageState();
}

class _CreatePostPageState extends State<CreatePostPage> {
  final titleController = TextEditingController();
  final descController = TextEditingController();
  final service = ForumService();
  bool loading = false;
  double? _lat;
  double? _lng;

  Future<void> _pickLocation() async {
    try {
      final location = Location();
      // Request service and permission if needed
      bool serviceEnabled = await location.serviceEnabled();
      if (!serviceEnabled) {
        serviceEnabled = await location.requestService();
        if (!serviceEnabled) return; // user declined
      }
      PermissionStatus permissionGranted = await location.hasPermission();
      if (permissionGranted == PermissionStatus.denied) {
        permissionGranted = await location.requestPermission();
        if (permissionGranted != PermissionStatus.granted) return; // user declined
      }

      final loc = await location.getLocation();
      setState(() {
        _lat = loc.latitude;
        _lng = loc.longitude;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Location attached: ${_lat?.toStringAsFixed(5)}, ${_lng?.toStringAsFixed(5)}')),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to get location: $e')),
      );
    }
  }

  Future<void> _post() async {
    if (titleController.text.isEmpty || descController.text.isEmpty) return;
    
    setState(() => loading = true);
    try {
      final issue = await service.createIssue({
        'title': titleController.text,
        'description': descController.text,
        'lat': _lat,
        'lng': _lng,
        'analyze': true, // Enable AI classification
      });
      if (!mounted) return;

      // If a complaint draft is present, show confirmation bottom sheet
      final draft = issue['complaint_draft'] as String?;
      final issueId = (issue['id'] as num?)?.toInt();
      if (draft != null && issueId != null) {
        await showModalBottomSheet(
          context: context,
          isScrollControlled: true,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
          ),
          builder: (_) {
            final draftController = TextEditingController(text: draft);
            bool sending = false;
            return StatefulBuilder(
              builder: (context, setModalState) {
                return Padding(
                  padding: EdgeInsets.only(
                    bottom: MediaQuery.of(context).viewInsets.bottom,
                    left: 16,
                    right: 16,
                    top: 16,
                  ),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Complaint Draft',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Review and edit before sending to the concerned authority.',
                        style: TextStyle(color: Colors.black54),
                      ),
                      const SizedBox(height: 12),
                      TextField(
                        controller: draftController,
                        maxLines: 12,
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: sending
                                  ? null
                                  : () async {
                                      setModalState(() => sending = true);
                                      try {
                                        await service.escalateIssue(issueId, draft: draftController.text);
                                        if (!context.mounted) return;
                                        // Show success state in-place before closing
                                        setModalState(() {});
                                        ScaffoldMessenger.of(context).showSnackBar(
                                          const SnackBar(content: Text('Complaint sent to authority.')),
                                        );
                                        await Future.delayed(const Duration(milliseconds: 500));
                                        if (!context.mounted) return;
                                        Navigator.of(context).pop();
                                        Navigator.of(context).pop();
                                      } catch (e) {
                                        setModalState(() => sending = false);
                                        if (context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(content: Text('Failed to send: $e')),
                                          );
                                        }
                                      }
                                    },
                              icon: Icon(sending ? Icons.check_circle : Icons.send),
                              label: Text(sending ? 'Sent' : 'Send to Authority'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                );
              },
            );
          },
        );
      } else {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Post created successfully!')),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    } finally {
      setState(() => loading = false);
    }
  }

  @override
  void initState() {
    super.initState();
    // Auto-attach location by default
    _pickLocation();
  }

  @override
  Widget build(BuildContext context) {
    // Theme-aware colors for readable inputs in light and dark modes
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final fillColor = isDark ? const Color(0xFF1F2937) : const Color(0xFFF7FAFC); // dark slate vs light gray
    final textColor = isDark ? Colors.white : Colors.black87;
    final labelColor = isDark ? Colors.white70 : Colors.black54;
    final hintColor = isDark ? Colors.white60 : Colors.black45;
    final borderColor = isDark ? Colors.white24 : Colors.black26;

    OutlineInputBorder inputBorder(Color color) => OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: color),
        );

    return Scaffold(
      appBar: AppBar(title: const Text("Create Community Post")),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Share a community issue or concern',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Color(0xFF2D3748),
                ),
              ),
              const SizedBox(height: 8),
              const Text(
                'Your post will be automatically analyzed by AI to help categorize and route it to the right officials.',
                style: TextStyle(
                  fontSize: 14,
                  color: Color(0xFF4A5568),
                ),
              ),
              const SizedBox(height: 24),
              TextField(
                controller: titleController,
                cursorColor: labelColor,
                style: TextStyle(color: textColor),
                decoration: InputDecoration(
                  labelText: "Title",
                  hintText: "Brief summary of the issue",
                  labelStyle: TextStyle(color: labelColor),
                  hintStyle: TextStyle(color: hintColor),
                  border: inputBorder(borderColor),
                  enabledBorder: inputBorder(borderColor),
                  focusedBorder: inputBorder(labelColor),
                  filled: true,
                  fillColor: fillColor,
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descController,
                cursorColor: labelColor,
                style: TextStyle(color: textColor),
                decoration: InputDecoration(
                  labelText: "Description",
                  hintText: "Provide detailed information about the issue",
                  labelStyle: TextStyle(color: labelColor),
                  hintStyle: TextStyle(color: hintColor),
                  border: inputBorder(borderColor),
                  enabledBorder: inputBorder(borderColor),
                  focusedBorder: inputBorder(labelColor),
                  filled: true,
                  fillColor: fillColor,
                  alignLabelWithHint: true,
                ),
                maxLines: 6,
                textInputAction: TextInputAction.newline,
              ),
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.lightPink.withOpacity(0.2),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: AppColors.lightPink.withOpacity(0.6)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.auto_awesome, color: AppColors.yellow),
                    const SizedBox(width: 12),
                    const Expanded(
                      child: Text(
                        'AI will automatically categorize your post and notify relevant officials',
                        style: TextStyle(
                          fontSize: 13,
                          color: Colors.black,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: loading ? null : _pickLocation,
                      icon: const Icon(Icons.my_location),
                      label: Text(
                        _lat != null && _lng != null
                            ? 'Location attached: ${_lat!.toStringAsFixed(4)}, ${_lng!.toStringAsFixed(4)}'
                            : 'Attach My Location',
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              SizedBox(
                height: 50,
                child: ElevatedButton(
                  onPressed: loading ? null : _post,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF667eea),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: loading
                      ? const Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                              ),
                            ),
                            SizedBox(width: 12),
                            Text("Posting..."),
                          ],
                        )
                      : const Text(
                          "Create Post",
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
