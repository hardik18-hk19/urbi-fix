import 'dart:math';
import 'package:flutter/material.dart';
import '../../services/negotiation_service.dart';
import '../../services/booking_service.dart';
import '../../utils/location_helper.dart';
import '../../config/theme.dart';
import '../provider/provider_list_page.dart';

class NegotiationPage extends StatefulWidget {
  final int productId;
  final String productName;
  final double listPrice;
  final double minPrice;
  final bool intelligent; // if true, uses AI endpoints
  final int? providerId; // optional preselected provider
  final String? serviceCategory; // optional for auto booking

  const NegotiationPage({
    super.key,
    required this.productId,
    required this.productName,
    required this.listPrice,
    required this.minPrice,
    this.intelligent = true,
    this.providerId,
    this.serviceCategory,
  });

  @override
  State<NegotiationPage> createState() => _NegotiationPageState();
}

class _NegotiationPageState extends State<NegotiationPage> {
  final NegotiationService _service = NegotiationService();
  final BookingService _booking = BookingService();
  final TextEditingController _msgCtrl = TextEditingController();
  final ScrollController _scrollCtrl = ScrollController();

  late final String _sessionId;
  bool _loading = true;
  String? _error;

  // chat history: list of maps {role: 'user'|'bot', message: string}
  final List<Map<String, String>> _messages = [];

  // negotiation outcome
  String _status = 'ongoing';
  double? _agreedPrice;
  
  // track last user message to pass as note in handoff
  String? _lastUserMessage;

  @override
  void initState() {
    super.initState();
    _sessionId = 'mob-${DateTime.now().millisecondsSinceEpoch}-${Random().nextInt(9999)}';
    _start();
  }

  Future<void> _start() async {
    setState(() { _loading = true; _error = null; });
    try {
      await _service.startSession(
        sessionId: _sessionId,
        productId: widget.productId,
        productName: widget.intelligent ? 'Auto-detect' : widget.productName,
        listPrice: widget.listPrice,
        minPrice: widget.minPrice,
        intelligent: widget.intelligent,
      );
      setState(() { _loading = false; });
    } catch (e) {
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  Future<void> _send() async {
    final text = _msgCtrl.text.trim();
    if (text.isEmpty || _loading) return;
    setState(() {
      _messages.add({'role': 'user', 'message': text});
      _lastUserMessage = text;
      _msgCtrl.clear();
    });
    _scrollToBottom();

    try {
      final res = await _service.chat(
        sessionId: _sessionId,
        userMessage: text,
        intelligent: widget.intelligent,
      );
      final reply = res['reply']?.toString() ?? '...';
      final status = (res['status'] ?? 'ongoing').toString();
      final price = (res['final_price'] as num?)?.toDouble();
      setState(() {
        _messages.add({'role': 'bot', 'message': reply});
        _status = status;
        _agreedPrice = price ?? _agreedPrice;
      });
      _scrollToBottom();
    } catch (e) {
      setState(() { _messages.add({'role': 'bot', 'message': 'Error: $e'}); });
      _scrollToBottom();
    }
  }

  Future<void> _proceedToBooking() async {
    if (_status != 'accepted' || _agreedPrice == null) return;
    setState(() { _loading = true; });
    try {
      Map<String, dynamic> booking;
      if (widget.providerId != null) {
        // Create booking with a specific provider
        booking = await _booking.createBooking({
          'provider_id': widget.providerId,
          'service_category': widget.serviceCategory ?? widget.productName,
          'notes': 'Agreed price via negotiation: ₹${_agreedPrice!.toStringAsFixed(0)}',
          // price can be set later by provider accept/update; we store in notes here
        });
      } else {
        // Auto booking to nearest provider with optional category
        final loc = await LocationHelper.getCurrentLocation();
        booking = await _booking.createAutoBooking(
          consumerLat: loc?.latitude ?? 0.0,
          consumerLng: loc?.longitude ?? 0.0,
          serviceCategory: widget.serviceCategory ?? widget.productName,
          notes: 'Agreed price via negotiation: ₹${_agreedPrice!.toStringAsFixed(0)}',
          withinKm: 5.0,
        );
      }
      if (!mounted) return;
      // Optionally, push the agreed price to booking status for visibility
      try {
        await _booking.updateBookingStatus(
          (booking['id'] as num).toInt(),
          {
            'status': 'requested',
            'price_amount': _agreedPrice,
            'price_currency': 'INR',
          },
        );
      } catch (_) {
        // ignore if backend disallows; notes already contain price
      }
      Navigator.pushReplacementNamed(context, '/booking_status', arguments: booking['id']);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to create booking: $e')),
      );
    } finally {
      if (mounted) setState(() { _loading = false; });
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent + 80,
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _connectToProvider() async {
    // If a provider is already specified for this negotiation, create a booking directly
    final note = _lastUserMessage == null ? '' : 'User budget note: ${_lastUserMessage!}';
    if (widget.providerId != null) {
      try {
        final loc = await LocationHelper.getCurrentLocation();
        final booking = await _booking.createBooking({
          'provider_id': widget.providerId,
          'service_category': widget.serviceCategory ?? widget.productName,
          'notes': 'Negotiation handoff. $note',
          if (loc != null) 'consumer_lat': loc.latitude,
          if (loc != null) 'consumer_lng': loc.longitude,
        });
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Request sent to provider. You can chat via booking notes.')),
        );
        Navigator.pushReplacementNamed(context, '/booking_status', arguments: booking['id']);
        return;
      } catch (e) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Failed to connect to provider: $e')),
          );
        }
      }
    }

    // Otherwise, navigate to provider list so user can pick and start a manual booking with their note
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Connecting you to a provider to chat...')),
    );
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => ProviderListPage(
          preselectedCategory: widget.serviceCategory ?? widget.productName,
          handoffNote: note,
        ),
      ),
    );
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final accepted = _status == 'accepted' && _agreedPrice != null;
    return Scaffold(
      appBar: AppBar(
        title: Text('Negotiate - ${widget.productName}'),
      ),
      body: Column(
        children: [
          if (_loading)
            const LinearProgressIndicator(minHeight: 2),
          if (_error != null)
            Container(
              width: double.infinity,
              color: Colors.red.withOpacity(0.1),
              padding: const EdgeInsets.all(12),
              child: Text(_error!, style: const TextStyle(color: Colors.red)),
            ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Chip(label: Text('List: ₹${widget.listPrice.toStringAsFixed(0)}')),
                const SizedBox(width: 8),
                Chip(label: Text('Min: ₹${widget.minPrice.toStringAsFixed(0)}')),
                const SizedBox(width: 8),
                if (widget.intelligent)
                  const Chip(label: Text('AI')),
                const Spacer(),
                if (accepted)
                  Chip(
                    label: Text('Agreed: ₹${_agreedPrice!.toStringAsFixed(0)}'),
                    backgroundColor: AppColors.lightPink,
                    labelStyle: const TextStyle(color: Colors.black),
                  ),
              ],
            ),
          ),
          if (_status == 'handoff')
            Container(
              margin: const EdgeInsets.symmetric(horizontal: 12),
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppColors.lightPink.withOpacity(0.2),
                border: Border.all(color: AppColors.lightPink.withOpacity(0.6)),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.support_agent, color: AppColors.yellow),
                  const SizedBox(width: 8),
                  const Expanded(child: Text('Budget seems below the minimum. Connect to provider to discuss a custom scope.')),
                  TextButton.icon(
                    onPressed: _connectToProvider,
                    icon: const Icon(Icons.chat),
                    label: const Text('Connect'),
                  )
                ],
              ),
            ),
          Expanded(
            child: ListView.builder(
              controller: _scrollCtrl,
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              itemCount: _messages.length,
              itemBuilder: (_, i) {
                final m = _messages[i];
                final isUser = m['role'] == 'user';
                return Align(
                  alignment: isUser ? Alignment.centerRight : Alignment.centerLeft,
                  child: Container(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    padding: const EdgeInsets.all(12),
                    constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.8),
                    decoration: BoxDecoration(
                      gradient: isUser
                          ? const LinearGradient(colors: [AppColors.yellow, AppColors.lightPink])
                          : null,
                      color: isUser ? null : Theme.of(context).colorScheme.surface,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      m['message'] ?? '',
                      style: TextStyle(color: isUser ? Colors.black : Colors.white),
                    ),
                  ),
                );
              },
            ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 6, 12, 12),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _msgCtrl,
                          decoration: const InputDecoration(
                            hintText: 'Type your offer or message (e.g., Can you do for 700?)',
                            border: OutlineInputBorder(),
                            isDense: true,
                          ),
                          onSubmitted: (_) => _send(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: _send,
                        icon: const Icon(Icons.send),
                        color: AppColors.yellow,
                      )
                    ],
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton.icon(
                      onPressed: accepted && !_loading ? _proceedToBooking : null,
                      icon: const Icon(Icons.assignment_turned_in_rounded),
                      label: Text(accepted
                          ? 'Proceed to booking at ₹${_agreedPrice!.toStringAsFixed(0)}'
                          : 'Agree on a price to proceed'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: accepted ? AppColors.yellow : Colors.grey,
                        foregroundColor: Colors.black,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}