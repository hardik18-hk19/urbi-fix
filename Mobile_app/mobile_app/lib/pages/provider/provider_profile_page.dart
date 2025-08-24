import 'package:flutter/material.dart';
import '../../services/provider_service.dart';
import '../../services/auth_service.dart';
import '../../utils/location_helper.dart' as loc;
import '../../config/theme.dart';

class ProviderProfilePage extends StatefulWidget {
  final bool setupMode; // when true, used for initial one-time setup
  const ProviderProfilePage({super.key, this.setupMode = false});

  @override
  State<ProviderProfilePage> createState() => _ProviderProfilePageState();
}

class _ProviderProfilePageState extends State<ProviderProfilePage> {
  final _formKey = GlobalKey<FormState>();
  final _service = ProviderService();
  final _auth = AuthService();
  Map<String, dynamic>? _me;
  bool _loading = false;
  String? _error;

  // Form fields
  late TextEditingController _nameCtrl; // display from user
  late TextEditingController _ageCtrl;
  late TextEditingController _phoneCtrl; // display from user
  late TextEditingController _addressCtrl;
  late TextEditingController _bioCtrl;
  late TextEditingController _skillsCtrl;
  late TextEditingController _latCtrl;
  late TextEditingController _lngCtrl;
  bool _active = true;

  // Skills selection helpers
  final List<String> _defaultSkills = const [
    'Cleaning', 'Cooking', 'Repairs', 'Babysitting', 'Elderly Care', 'Plumbing', 'Electrical', 'Gardening'
  ];
  final Set<String> _selectedSkills = {};

  @override
  void initState() {
    super.initState();
    _nameCtrl = TextEditingController();
    _ageCtrl = TextEditingController();
    _phoneCtrl = TextEditingController();
    _addressCtrl = TextEditingController();
    _bioCtrl = TextEditingController();
    _skillsCtrl = TextEditingController();
    _latCtrl = TextEditingController();
    _lngCtrl = TextEditingController();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      // Load user info for name/phone display
      final user = await _auth.getMe();
      // Then provider profile (if exists)
      final me = await _service.getMyProvider();
      setState(() {
        _me = me;
        _nameCtrl.text = (user['name'] ?? '').toString();
        _phoneCtrl.text = (user['phone'] ?? '').toString();
        _ageCtrl.text = (me['age']?.toString() ?? '');
        _addressCtrl.text = me['address'] ?? '';
        _bioCtrl.text = me['bio'] ?? '';
        _skillsCtrl.text = me['skills'] ?? '';
        // Initialize selected skills from comma-separated string
        final s = (me['skills'] ?? '').toString();
        _selectedSkills
          ..clear()
          ..addAll(s.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty));
        _latCtrl.text = (me['lat']?.toString() ?? '');
        _lngCtrl.text = (me['lng']?.toString() ?? '');
        _active = (me['active'] ?? true) as bool;
      });
      // Prompt for location if missing
      if ((_latCtrl.text.isEmpty || _lngCtrl.text.isEmpty)) {
        Future.microtask(() => _useCurrentLocation());
      }
    } catch (e) {
      try {
        // If provider not found load only user so we can show name/phone
        final user = await _auth.getMe();
        setState(() {
          _me = null;
          _error = null;
          // Keep name/phone visible even if provider profile not found
          _nameCtrl.text = (user['name'] ?? '').toString();
          _phoneCtrl.text = (user['phone'] ?? '').toString();
        });
      } catch (_) {
        setState(() => _error = e.toString());
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  Future<void> _useCurrentLocation() async {
    final data = await loc.LocationHelper.getCurrentLocation();
    if (data != null) {
      setState(() {
        _latCtrl.text = data.latitude?.toString() ?? '';
        _lngCtrl.text = data.longitude?.toString() ?? '';
      });
    }
  }

  Future<void> _save() async {
    setState(() { _loading = true; _error = null; });
    try {
      final payload = {
        'bio': _bioCtrl.text.trim(),
        'skills': _skillsCtrl.text.trim(), // comma-separated tags
        'age': int.tryParse(_ageCtrl.text),
        'address': _addressCtrl.text.trim(),
        'lat': double.tryParse(_latCtrl.text),
        'lng': double.tryParse(_lngCtrl.text),
        'active': _active,
        'radius_km': 5.0, // Default radius
      };
      
      if (_me == null) {
        // Create new provider profile
        await _service.createProviderProfile(payload);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Provider profile created successfully!')));
        if (widget.setupMode) {
          Navigator.pushReplacementNamed(context, '/provider_dashboard');
          return;
        }
      } else {
        // Update existing provider profile
        await _service.updateProviderProfile(_me!['id'] as int, payload);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
      }
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
    _ageCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _bioCtrl.dispose();
    _skillsCtrl.dispose();
    _latCtrl.dispose();
    _lngCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_me == null ? "Setup Provider Profile" : "Provider Profile")),
      body: _loading && _me == null
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.only(bottom: 12),
                        child: Text(_error!, style: const TextStyle(color: Colors.redAccent)),
                      ),
                    Row(
                      children: [
                        Container(
                          width: 72,
                          height: 72,
                          decoration: BoxDecoration(
                            color: Colors.black,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: const Color(0xFFFFC1E3), width: 2),
                            image: const DecorationImage(
                              image: AssetImage('assets/images/avatar_placeholder.png'),
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              TextFormField(
                                controller: _nameCtrl,
                                decoration: const InputDecoration(labelText: 'Full Name (from account)'),
                                enabled: false,
                              ),
                              const SizedBox(height: 8),
                              TextFormField(
                                controller: _phoneCtrl,
                                decoration: const InputDecoration(labelText: 'Phone (from account)'),
                                enabled: false,
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),

                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _ageCtrl,
                            decoration: const InputDecoration(labelText: 'Age'),
                            keyboardType: TextInputType.number,
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _addressCtrl,
                            decoration: const InputDecoration(labelText: 'Address'),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    TextFormField(
                      controller: _bioCtrl,
                      decoration: const InputDecoration(labelText: 'Bio'),
                      maxLines: 3,
                    ),
                    const SizedBox(height: 12),

                    // Skills selection (chips) + free-text fallback remains
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _defaultSkills.map((label) {
                        final selected = _selectedSkills.contains(label);
                        return FilterChip(
                          label: Text(label),
                          selected: selected,
                          onSelected: (v) {
                            setState(() {
                              if (v) {
                                _selectedSkills.add(label);
                              } else {
                                _selectedSkills.remove(label);
                              }
                              _skillsCtrl.text = _selectedSkills.join(',');
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _skillsCtrl,
                      decoration: const InputDecoration(
                        labelText: 'Additional skills (comma-separated) — optional',
                        helperText: 'Selected chips will sync here; you can type custom ones too',
                      ),
                      onChanged: (v) {
                        final parsed = v.split(',').map((e) => e.trim()).where((e) => e.isNotEmpty).toSet();
                        setState(() {
                          _selectedSkills
                            ..clear()
                            ..addAll(parsed);
                        });
                      },
                    ),
                    const SizedBox(height: 12),

                    // Read-only rating + jobs done overview
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, color: Color(0xFFFFE66D), size: 20),
                        const SizedBox(width: 6),
                        Text(
                          ((_me != null ? (((_me!['rating'] as num?)?.toDouble()) ?? 0.0) : 0.0).toStringAsFixed(1)),
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                        const SizedBox(width: 12),
                        Text('Jobs: ${_me != null ? (_me!['jobs_done'] ?? 0) : 0}'),
                      ],
                    ),
                    const SizedBox(height: 12),

                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        TextFormField(
                          controller: _latCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Latitude',
                            hintText: 'e.g., 40.7128',
                          ),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        ),
                        const SizedBox(height: 12),
                        TextFormField(
                          controller: _lngCtrl,
                          decoration: const InputDecoration(
                            labelText: 'Longitude',
                            hintText: 'e.g., -74.0060',
                          ),
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                        ),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            OutlinedButton.icon(
                              icon: const Icon(Icons.my_location_rounded),
                              onPressed: _useCurrentLocation,
                              label: const Text('Use Current Location'),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: AppColors.lightPink.withOpacity(0.2),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: AppColors.lightPink.withOpacity(0.6)),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.info_outline, color: AppColors.yellow, size: 16),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Use your current location to help customers find you nearby',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.black,
                                    fontWeight: FontWeight.w500,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    Row(
                      children: [
                        const Text('Availability'),
                        const SizedBox(width: 8),
                        Switch(value: _active, onChanged: (v) => setState(() => _active = v)),
                        const SizedBox(width: 8),
                        Text(_active ? 'Available' : 'Busy'),
                      ],
                    ),

                    const SizedBox(height: 16),

                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _save,
                        child: Text(_me == null ? 'Create Profile' : 'Save Changes'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}
