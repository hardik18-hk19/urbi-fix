import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/consumer_service.dart';
import '../../utils/location_helper.dart' as loc;

class ConsumerSetupPage extends StatefulWidget {
  const ConsumerSetupPage({super.key});

  @override
  State<ConsumerSetupPage> createState() => _ConsumerSetupPageState();
}

class _ConsumerSetupPageState extends State<ConsumerSetupPage> {
  final _formKey = GlobalKey<FormState>();
  final _auth = AuthService();
  final _consumerService = ConsumerService();

  final _nameCtrl = TextEditingController();
  final _ageCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _addressCtrl = TextEditingController();
  final _latCtrl = TextEditingController();
  final _lngCtrl = TextEditingController();

  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _checkExistingAndPrefill();
  }

  Future<void> _checkExistingAndPrefill() async {
    setState(() { _loading = true; _error = null; });
    try {
      // If consumer profile already exists, skip setup and go to dashboard
      await _consumerService.getMyConsumer();
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/consumer_dashboard');
      return;
    } catch (_) {
      // Not found or error: continue to prefill from account and show setup form
    } finally {
      setState(() { _loading = false; });
    }
    await _prefillFromMe();
  }

  Future<void> _prefillFromMe() async {
    setState(() { _loading = true; _error = null; });
    try {
      final me = await _auth.getMe();
      _nameCtrl.text = me['name'] ?? '';
      _phoneCtrl.text = me['phone'] ?? '';
    } catch (e) {
      _error = e.toString();
    } finally {
      setState(() { _loading = false; });
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
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      // Save name/phone to user
      await _auth.updateMe({'name': _nameCtrl.text.trim(), 'phone': _phoneCtrl.text.trim()});
      // Save consumer profile
      await _consumerService.saveConsumer({
        'age': int.tryParse(_ageCtrl.text),
        'phone': _phoneCtrl.text.trim(),
        'address': _addressCtrl.text.trim(),
        'lat': double.tryParse(_latCtrl.text),
        'lng': double.tryParse(_lngCtrl.text),
      });
      if (!mounted) return;
      Navigator.pushReplacementNamed(context, '/consumer_dashboard');
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      setState(() { _loading = false; });
    }
  }

  @override
  void dispose() {
    _nameCtrl.dispose();
    _ageCtrl.dispose();
    _phoneCtrl.dispose();
    _addressCtrl.dispose();
    _latCtrl.dispose();
    _lngCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Setup Consumer Profile')),
      body: _loading && _nameCtrl.text.isEmpty
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
                    TextFormField(
                      controller: _nameCtrl,
                      decoration: const InputDecoration(labelText: 'Name'),
                      validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _ageCtrl,
                      decoration: const InputDecoration(labelText: 'Age'),
                      keyboardType: TextInputType.number,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _phoneCtrl,
                      decoration: const InputDecoration(labelText: 'Phone Number'),
                      keyboardType: TextInputType.phone,
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _addressCtrl,
                      decoration: const InputDecoration(labelText: 'Address (optional)'),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _latCtrl,
                            decoration: const InputDecoration(labelText: 'Latitude'),
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _lngCtrl,
                            decoration: const InputDecoration(labelText: 'Longitude'),
                            keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    OutlinedButton.icon(
                      onPressed: _useCurrentLocation,
                      icon: const Icon(Icons.my_location_rounded),
                      label: const Text('Use Current Location'),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: _loading ? null : _save,
                        child: const Text('Save & Continue'),
                      ),
                    )
                  ],
                ),
              ),
            ),
    );
  }
}