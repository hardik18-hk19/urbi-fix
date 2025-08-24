import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';

class MapViewPage extends StatelessWidget {
  const MapViewPage({super.key});

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)?.settings.arguments as Map<String, dynamic>?;
    final double? lat = args?['lat'] as double?;
    final double? lng = args?['lng'] as double?;
    final String title = (args?['title'] as String?) ?? 'Map View';

    if (lat == null || lng == null) {
      return Scaffold(
        appBar: AppBar(title: Text(title)),
        body: const Center(child: Text('No location provided')),
      );
    }

    final center = LatLng(lat, lng);

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: FlutterMap(
        options: MapOptions(
          center: center,
          zoom: 15,
          interactiveFlags: InteractiveFlag.pinchZoom | InteractiveFlag.drag | InteractiveFlag.doubleTapZoom,
        ),
        children: [
          TileLayer(
            urlTemplate: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            subdomains: const ['a', 'b', 'c'],
            userAgentPackageName: 'com.urbifix.app',
          ),
          MarkerLayer(
            markers: [
              Marker(
                width: 44,
                height: 44,
                point: center,
                builder: (context) => _ConsumerMarker(),
              ),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // No controller ref for now; leave as placeholder for future recenter logic
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Map centered on consumer location')),
          );
        },
        child: const Icon(Icons.my_location_rounded, color: Colors.black),
      ),
    );
  }
}

class _ConsumerMarker extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        shape: BoxShape.circle,
        color: const Color(0xFFFFD600),
        border: Border.all(color: const Color(0xFFFFC1E3), width: 3),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.4),
            blurRadius: 6,
            offset: const Offset(0, 3),
          )
        ],
      ),
      child: const Center(
        child: Icon(Icons.person_pin_circle_rounded, size: 22, color: Colors.black),
      ),
    );
  }
}