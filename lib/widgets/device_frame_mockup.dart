import 'package:flutter/material.dart';

class DeviceFrameMockup extends StatelessWidget {
  final Widget child;
  final bool isFrameEnabled;
  final VoidCallback onToggleFrame;

  const DeviceFrameMockup({
    super.key,
    required this.child,
    this.isFrameEnabled = true,
    required this.onToggleFrame,
  });

  @override
  Widget build(BuildContext context) {
    if (!isFrameEnabled) {
      return Scaffold(
        body: child,
        floatingActionButton: FloatingActionButton.small(
          onPressed: onToggleFrame,
          backgroundColor: const Color(0xFF4A154B),
          child: const Icon(Icons.phone_iphone, color: Colors.white),
        ),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFE5E0D8), // Muted warm-gray canvas background
      body: SafeArea(
        child: Stack(
          alignment: Alignment.center,
          children: [
            Center(
              child: FittedBox(
                fit: BoxFit.contain,
                child: Container(
                  width: 412.0,
                  height: 852.0, // iPhone 16 Pro proportion
                  margin: const EdgeInsets.symmetric(vertical: 16.0),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(52.0),
                    border: Border.all(
                      color: const Color(0xFF1C1B20), // Dark titanium bezel
                      width: 12.0,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.18),
                        blurRadius: 32.0,
                        spreadRadius: 4.0,
                        offset: const Offset(0, 16),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(40.0),
                    child: Stack(
                      children: [
                        // Inner App Screen
                        Positioned.fill(child: child),

                        // Top Native iOS Status Bar
                        Positioned(
                          top: 0,
                          left: 0,
                          right: 0,
                          child: Container(
                            height: 48.0,
                            padding: const EdgeInsets.symmetric(horizontal: 28.0),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Text(
                                  '9:41',
                                  style: TextStyle(
                                    fontSize: 14.0,
                                    fontWeight: FontWeight.w700,
                                    color: Color(0xFF2A2130),
                                  ),
                                ),
                                Row(
                                  children: [
                                    Icon(Icons.signal_cellular_4_bar, size: 14.0, color: Color(0xFF2A2130)),
                                    SizedBox(width: 4.0),
                                    Icon(Icons.wifi, size: 14.0, color: Color(0xFF2A2130)),
                                    SizedBox(width: 4.0),
                                    Icon(Icons.battery_full, size: 16.0, color: Color(0xFF2A2130)),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Dynamic Island Pill
                        Positioned(
                          top: 10.0,
                          child: Container(
                            width: 120.0,
                            height: 32.0,
                            decoration: BoxDecoration(
                              color: Colors.black,
                              borderRadius: BorderRadius.circular(20.0),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                Container(
                                  width: 10.0,
                                  height: 10.0,
                                  margin: const EdgeInsets.only(right: 12.0),
                                  decoration: const BoxDecoration(
                                    color: Color(0xFF0F172A),
                                    shape: BoxShape.circle,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),

                        // Bottom Home Indicator Pill
                        Positioned(
                          bottom: 8.0,
                          left: 0,
                          right: 0,
                          child: Center(
                            child: Container(
                              width: 134.0,
                              height: 4.5,
                              decoration: BoxDecoration(
                                color: Colors.black.withValues(alpha: 0.3),
                                borderRadius: BorderRadius.circular(3.0),
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),

            // Hardware Toggle Frame Button
            Positioned(
              top: 16.0,
              right: 16.0,
              child: FloatingActionButton.small(
                onPressed: onToggleFrame,
                backgroundColor: const Color(0xFF4A154B),
                child: const Icon(Icons.fullscreen, color: Colors.white),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
