import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_colors.dart';
import '../theme/app_typography.dart';

class SupplierDirectoryScreen extends StatefulWidget {
  const SupplierDirectoryScreen({super.key});

  @override
  State<SupplierDirectoryScreen> createState() => _SupplierDirectoryScreenState();
}

class _SupplierDirectoryScreenState extends State<SupplierDirectoryScreen> {
  int _selectedCategory = 0;
  final categories = ['All', 'Rice & Grains', 'Meat', 'Packaging', 'Ne...'];

  @override
  Widget build(BuildContext context) {
    final appState = Provider.of<AppStateProvider>(context);
    final suppliers = appState.suppliers;

    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        bottom: false,
        child: SingleChildScrollView(
          padding: const EdgeInsets.only(left: 20.0, right: 20.0, top: 12.0, bottom: 100.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Top Bar Header & Action Buttons
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const SizedBox(),
                  Row(
                    children: [
                      // Bell Button with red dot
                      Stack(
                        children: [
                          Container(
                            width: 40.0,
                            height: 40.0,
                            decoration: BoxDecoration(
                              color: Colors.white,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.05),
                                  blurRadius: 10.0,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Icon(
                              CupertinoIcons.bell,
                              size: 20.0,
                              color: AppColors.textDark,
                            ),
                          ),
                          Positioned(
                            top: 8.0,
                            right: 8.0,
                            child: Container(
                              width: 8.0,
                              height: 8.0,
                              decoration: const BoxDecoration(
                                color: Color(0xFFEF4444),
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(width: 10.0),
                      // Filter Sliders Button
                      Container(
                        width: 40.0,
                        height: 40.0,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.05),
                              blurRadius: 10.0,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          CupertinoIcons.slider_horizontal_3,
                          size: 20.0,
                          color: AppColors.textDark,
                        ),
                      ),
                    ],
                  ),
                ],
              ),

              const SizedBox(height: 4.0),

              // Title & Subtitle
              Text(
                'Suppliers',
                style: AppTypography.largeTitle(),
              ),
              const SizedBox(height: 4.0),
              const Text(
                'Matched to your next step',
                style: TextStyle(
                  fontSize: 14.0,
                  color: AppColors.textMuted,
                  fontWeight: FontWeight.w500,
                ),
              ),

              const SizedBox(height: 18.0),

              // Search Bar
              Container(
                height: 48.0,
                padding: const EdgeInsets.symmetric(horizontal: 16.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24.0),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 8.0,
                      offset: const Offset(0, 2),
                    ),
                  ],
                ),
                child: Row(
                  children: const [
                    Icon(CupertinoIcons.search, size: 20.0, color: Color(0xFF0284C7)),
                    SizedBox(width: 12.0),
                    Expanded(
                      child: Text(
                        'Search suppliers or products',
                        style: TextStyle(
                          fontSize: 14.0,
                          color: Color(0xFF9CA3AF),
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 14.0),

              // Location Selector Bar
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: const [
                      Icon(CupertinoIcons.location_solid, size: 16.0, color: Color(0xFF0284C7)),
                      SizedBox(width: 6.0),
                      Text.rich(
                        TextSpan(
                          children: [
                            TextSpan(
                              text: 'Showing near ',
                              style: TextStyle(fontSize: 13.0, color: AppColors.textMuted),
                            ),
                            TextSpan(
                              text: 'Pasig City',
                              style: TextStyle(
                                fontSize: 13.0,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  GestureDetector(
                    onTap: () {},
                    child: const Text(
                      'Change',
                      style: TextStyle(
                        fontSize: 13.0,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0284C7),
                      ),
                    ),
                  ),
                ],
              ),

              const SizedBox(height: 14.0),

              // Category Filter Pills (Horizontal Scroll)
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: List.generate(categories.length, (idx) {
                    final isSelected = idx == _selectedCategory;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: GestureDetector(
                        onTap: () => setState(() => _selectedCategory = idx),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 180),
                          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 9.0),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.aubergine : Colors.white,
                            borderRadius: BorderRadius.circular(20.0),
                            boxShadow: isSelected
                                ? [
                                    BoxShadow(
                                      color: AppColors.aubergine.withValues(alpha: 0.2),
                                      blurRadius: 8.0,
                                      offset: const Offset(0, 2),
                                    ),
                                  ]
                                : null,
                          ),
                          child: Text(
                            categories[idx],
                            style: TextStyle(
                              fontSize: 13.0,
                              fontWeight: isSelected ? FontWeight.bold : FontWeight.w600,
                              color: isSelected ? Colors.white : AppColors.textDark,
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),

              const SizedBox(height: 16.0),

              // Map Preview Banner
              Container(
                height: 150.0,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(22.0),
                  color: const Color(0xFFE2E8F0),
                  image: const DecorationImage(
                    image: NetworkImage('https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80'),
                    fit: BoxFit.cover,
                  ),
                ),
                child: Stack(
                  children: [
                    // Gradient overlay
                    Container(
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(22.0),
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withValues(alpha: 0.1),
                            Colors.black.withValues(alpha: 0.3),
                          ],
                        ),
                      ),
                    ),
                    // Centered Pin
                    Center(
                      child: Container(
                        width: 36.0,
                        height: 36.0,
                        decoration: BoxDecoration(
                          color: const Color(0xFF38BDF8),
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 3.0),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.2),
                              blurRadius: 8.0,
                              offset: const Offset(0, 3),
                            ),
                          ],
                        ),
                        child: const Center(
                          child: Icon(
                            CupertinoIcons.location_solid,
                            size: 18.0,
                            color: Colors.white,
                          ),
                        ),
                      ),
                    ),
                    // Bottom Right "Open map" Pill
                    Positioned(
                      bottom: 12.0,
                      right: 12.0,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 8.0),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20.0),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.1),
                              blurRadius: 6.0,
                            ),
                          ],
                        ),
                        child: const Row(
                          children: [
                            Icon(CupertinoIcons.paperplane_fill, size: 12.0, color: AppColors.aubergine),
                            SizedBox(width: 6.0),
                            Text(
                              'Open map',
                              style: TextStyle(
                                fontSize: 12.5,
                                fontWeight: FontWeight.bold,
                                color: AppColors.textDark,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16.0),

              // Light Blue AI Card ("Context-aware picks")
              Container(
                padding: const EdgeInsets.all(18.0),
                decoration: BoxDecoration(
                  color: const Color(0xFFE0F2FE),
                  borderRadius: BorderRadius.circular(20.0),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 38.0,
                      height: 38.0,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.8),
                        shape: BoxShape.circle,
                      ),
                      child: const Center(
                        child: Icon(
                          CupertinoIcons.sparkles,
                          size: 18.0,
                          color: Color(0xFF0284C7),
                        ),
                      ),
                    ),
                    const SizedBox(width: 14.0),
                    const Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Context-aware picks',
                            style: TextStyle(
                              fontSize: 14.0,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0284C7),
                            ),
                          ),
                          SizedBox(height: 4.0),
                          Text(
                            'These 3 suppliers cover the rice, meat, and packaging your active cost sheet needs — closest and cheapest first.',
                            style: TextStyle(
                              fontSize: 13.0,
                              color: Color(0xFF334155),
                              height: 1.35,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 28.0),

              // Section: 3 suppliers nearby
              const Text(
                '3 suppliers nearby',
                style: TextStyle(
                  fontSize: 20.0,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textDark,
                  letterSpacing: -0.4,
                ),
              ),

              const SizedBox(height: 14.0),

              // Supplier Card 1: Marikina Rice Trading
              _buildSupplierCard(
                name: 'Marikina Rice Trading',
                priceIndicator: '₱',
                rating: '4.8',
                location: '1.2 km · Marikina City',
                tags: ['Sinandomeng', 'Bulk sacks', 'Delivery'],
              ),

              const SizedBox(height: 12.0),

              // Supplier Card 2: Pasig Fresh Meats
              _buildSupplierCard(
                name: 'Pasig Fresh Meats',
                priceIndicator: '₱₱',
                rating: '4.9',
                location: '2.5 km · Pasig City',
                tags: ['Pork Belly', 'Fresh Cut', 'Daily Stock'],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSupplierCard({
    required String name,
    required String priceIndicator,
    required String rating,
    required String location,
    required List<String> tags,
  }) {
    return Container(
      padding: const EdgeInsets.all(18.0),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22.0),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 10.0,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44.0,
                height: 44.0,
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(14.0),
                ),
                child: const Center(
                  child: Icon(
                    CupertinoIcons.location_solid,
                    size: 20.0,
                    color: Color(0xFF16A34A),
                  ),
                ),
              ),
              const SizedBox(width: 12.0),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: const TextStyle(
                        fontSize: 16.0,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textDark,
                      ),
                    ),
                    const SizedBox(height: 2.0),
                    Row(
                      children: [
                        const Icon(CupertinoIcons.star_fill, size: 12.0, color: Color(0xFFF59E0B)),
                        const SizedBox(width: 3.0),
                        Text(
                          rating,
                          style: const TextStyle(
                            fontSize: 12.0,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textDark,
                          ),
                        ),
                        const SizedBox(width: 6.0),
                        Text(
                          '📍 $location',
                          style: const TextStyle(
                            fontSize: 12.0,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              Text(
                priceIndicator,
                style: const TextStyle(
                  fontSize: 14.0,
                  fontWeight: FontWeight.bold,
                  color: AppColors.textMuted,
                ),
              ),
            ],
          ),

          const SizedBox(height: 14.0),

          // Tag Pills Row
          Wrap(
            spacing: 6.0,
            runSpacing: 6.0,
            children: tags.map((t) {
              return Container(
                padding: const EdgeInsets.symmetric(horizontal: 10.0, vertical: 4.0),
                decoration: BoxDecoration(
                  color: const Color(0xFFDCFCE7),
                  borderRadius: BorderRadius.circular(10.0),
                ),
                child: Text(
                  t,
                  style: const TextStyle(
                    fontSize: 11.5,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF16A34A),
                  ),
                ),
              );
            }).toList(),
          ),

          const SizedBox(height: 16.0),

          // Action Buttons Row (Contact vs Add to plan)
          Row(
            children: [
              Expanded(
                child: Container(
                  height: 42.0,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF3E8FF),
                    borderRadius: BorderRadius.circular(20.0),
                  ),
                  child: const Center(
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(CupertinoIcons.phone_fill, size: 14.0, color: AppColors.aubergine),
                        SizedBox(width: 6.0),
                        Text(
                          'Contact',
                          style: TextStyle(
                            fontSize: 14.0,
                            fontWeight: FontWeight.bold,
                            color: AppColors.aubergine,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10.0),
              Expanded(
                child: Container(
                  height: 42.0,
                  decoration: BoxDecoration(
                    color: const Color(0xFFE5A93C),
                    borderRadius: BorderRadius.circular(20.0),
                  ),
                  child: const Center(
                    child: Text(
                      'Add to plan',
                      style: TextStyle(
                        fontSize: 14.0,
                        fontWeight: FontWeight.bold,
                        color: AppColors.textDark,
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
