import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../services/auth_service.dart';
import '../../utils/location_helper.dart';
import '../../state/auth_state.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';

class UserProfilePage extends StatefulWidget {
  final bool setupMode; // when true, we show a banner prompting initial setup
  final String? nextRoute; // optional route to continue to after setup
  const UserProfilePage({super.key, this.setupMode = false, this.nextRoute});

  @override
  State<UserProfilePage> createState() => _UserProfilePageState();
}

class _UserProfilePageState extends State<UserProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _auth = AuthService();

  bool _loading = false;
  String? _error;
  Map<String, dynamic>? _me;

  late TextEditingController _nameCtrl;
  late TextEditingController _emailCtrl;
  late TextEditingController _phoneCtrl;
  late TextEditingController _avatarCtrl;

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController();
    _emailCtrl = TextEditingController();
    _phoneCtrl = TextEditingController();
    _avatarCtrl = TextEditingController();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final me = await _auth.getMe();
      setState(() {
        _me = me;
        _nameCtrl.text = me['name'] ?? '';
        _emailCtrl.text = me['email'] ?? '';
        _phoneCtrl.text = me['phone'] ?? '';
        _avatarCtrl.text = me['avatar_url'] ?? '';
      });
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      final patch = {
        'name': _nameCtrl.text.trim(),
        'phone': _phoneCtrl.text.trim(),
        'avatar_url': _avatarCtrl.text.trim(),
      };
      await _auth.updateMe(patch);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
      await _load();
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _phoneCtrl.dispose();
    _avatarCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final avatarUrl = _avatarCtrl.text.trim();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile'),
        actions: [
          IconButton(
            tooltip: 'Logout',
            icon: const Icon(Icons.logout_rounded),
            onPressed: _loading
                ? null
                : () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (ctx) => AlertDialog(
                        title: const Text('Logout'),
                        content: const Text('Are you sure you want to logout?'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(ctx, false),
                            child: const Text('Cancel'),
                          ),
                          ElevatedButton(
                            onPressed: () => Navigator.pop(ctx, true),
                            child: const Text('Logout'),
                          ),
                        ],
                      ),
                    );
                    if (confirmed != true) return;
                    setState(() => _loading = true);
                    try {
                      await context.read<AuthState>().logout();
                      if (!mounted) return;
                      Navigator.pushNamedAndRemoveUntil(context, '/role', (_) => false);
                    } catch (_) {
                      // ignore
                    } finally {
                      if (mounted) setState(() => _loading = false);
                    }
                  },
          ),
        ],
      ),
      body: _loading && _me == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (widget.setupMode)
                      Container(
                        width: double.infinity,
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text(
                          'Complete your profile and allow location to get better matches nearby.',
                          style: TextStyle(color: Colors.black, fontWeight: FontWeight.w600),
                        ),
                      ),

                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                      ),

                    Center(
                      child: Stack(
                        children: [
                          CircleAvatar(
                            radius: 44,
                            backgroundColor: const Color(0xFFFFC1E3),
                            backgroundImage: avatarUrl.isNotEmpty
                                ? NetworkImage(avatarUrl)
                                : const AssetImage('assets/images/avatar_placeholder.png') as ImageProvider,
                          ),
                          Positioned(
                            bottom: 0,
                            right: 0,
                            child: Row(children: [
                              // Paste URL
                              InkWell(
                                onTap: () async {
                                  final clip = await Clipboard.getData('text/plain');
                                  final text = clip?.text?.trim() ?? '';
                                  if (text.startsWith('http')) {
                                    _avatarCtrl.text = text;
                                    setState(() {});
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Pasted URL from clipboard')),
                                    );
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(content: Text('Copy an image URL to clipboard, then tap the link icon to paste')),
                                    );
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  margin: const EdgeInsets.only(right: 6),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(14),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.1),
                                        blurRadius: 6,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                  ),
                                  child: const Icon(Icons.link_rounded, size: 18, color: Color(0xFF764ba2)),
                                ),
                              ),
                              // Pick and upload file
                              InkWell(
                                onTap: () async {
                                  try {
                                    final picker = ImagePicker();
                                    final picked = await picker.pickImage(source: ImageSource.gallery, maxWidth: 1024, maxHeight: 1024, imageQuality: 85);
                                    if (picked == null) return;
                                    setState(() => _loading = true);
                                    final file = File(picked.path);
                                    final updated = await _auth.uploadAvatar(file);
                                    _avatarCtrl.text = (updated['avatar_url'] ?? '').toString();
                                    setState(() {});
                                    if (!mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Avatar updated')));
                                  } catch (e) {
                                    if (!mounted) return;
                                    ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed to upload avatar: $e')));
                                  } finally {
                                    if (mounted) setState(() => _loading = false);
                                  }
                                },
                                child: Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(14),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.1),
                                        blurRadius: 6,
                                        offset: const Offset(0, 3),
                                      ),
                                    ],
                                  ),
                                  child: const Icon(Icons.camera_alt_rounded, size: 18, color: Color(0xFF764ba2)),
                                ),
                              ),
                            ]),
                          ),
                        ],
                      ),
                    ),

                    const SizedBox(height: 20),

                    TextFormField(
                      controller: _nameCtrl,
                      decoration: const InputDecoration(labelText: 'Name'),
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _emailCtrl,
                      decoration: const InputDecoration(labelText: 'Email (read-only)'),
                      enabled: false,
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _phoneCtrl,
                      decoration: const InputDecoration(labelText: 'Phone'),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _avatarCtrl,
                      decoration: const InputDecoration(labelText: 'Avatar URL (optional)'),
                      keyboardType: TextInputType.url,
                      onChanged: (_) => setState(() {}),
                    ),

                    const SizedBox(height: 20),

                    // Location permission CTA
                    SizedBox(
                      width: double.infinity,
                      child: OutlinedButton.icon(
                        icon: const Icon(Icons.my_location_rounded),
                        onPressed: () async {
                          final loc = await LocationHelper.getCurrentLocation();
                          final ok = loc != null;
                          if (!mounted) return;
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text(ok ? 'Location enabled' : 'Location not granted')),
                          );
                        },
                        label: const Text('Allow Location Access'),
                      ),
                    ),

                    const SizedBox(height: 12),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _loading ? null : () async {
                          await _save();
                          if (!mounted) return;
                          if (widget.setupMode && widget.nextRoute != null) {
                            Navigator.pushReplacementNamed(context, widget.nextRoute!);
                          }
                        },
                        child: Text(widget.setupMode ? 'Save & Continue' : 'Save'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}