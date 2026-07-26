import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/supplier_model.dart';
import '../providers/app_state_provider.dart';
import '../theme/app_colors.dart';

class AdminSupplierModal extends StatefulWidget {
  final Supplier? supplierToEdit;

  const AdminSupplierModal({super.key, this.supplierToEdit});

  @override
  State<AdminSupplierModal> createState() => _AdminSupplierModalState();
}

class _AdminSupplierModalState extends State<AdminSupplierModal> {
  late TextEditingController _nameCtrl;
  late TextEditingController _categoryCtrl;
  late TextEditingController _addressCtrl;
  late TextEditingController _contactCtrl;
  late TextEditingController _tagsCtrl;

  @override
  void initState() {
    super.initState();
    final s = widget.supplierToEdit;
    _nameCtrl = TextEditingController(text: s?.name ?? '');
    _categoryCtrl = TextEditingController(text: s?.category ?? 'Packaging');
    _addressCtrl = TextEditingController(text: s?.address ?? 'Manila');
    _contactCtrl = TextEditingController(text: s?.contactInfo ?? '+63 917 555 0192');
    _tagsCtrl = TextEditingController(text: s?.linkedProductTags.join(', ') ?? 'Packaging, Wholesale');
  }

  void _saveSupplier() {
    if (_nameCtrl.text.isEmpty) return;

    final appState = Provider.of<AppStateProvider>(context, listen: false);

    if (widget.supplierToEdit == null) {
      final newSupplier = Supplier(
        id: 'sup_${DateTime.now().millisecondsSinceEpoch}',
        name: _nameCtrl.text,
        category: _categoryCtrl.text,
        address: _addressCtrl.text,
        latitude: 14.5995,
        longitude: 120.9842,
        distanceKm: 5.0,
        linkedProductTags: _tagsCtrl.text.split(',').map((t) => t.trim()).toList(),
        contactInfo: _contactCtrl.text,
        addedByAdminId: 'admin_1',
        createdAt: DateTime.now(),
      );
      appState.addSupplier(newSupplier);
    } else {
      final updated = widget.supplierToEdit!.copyWith(
        name: _nameCtrl.text,
        category: _categoryCtrl.text,
        address: _addressCtrl.text,
        contactInfo: _contactCtrl.text,
        linkedProductTags: _tagsCtrl.text.split(',').map((t) => t.trim()).toList(),
      );
      appState.updateSupplier(updated);
    }

    Navigator.pop(context);
  }

  void _deleteSupplier() {
    if (widget.supplierToEdit != null) {
      final appState = Provider.of<AppStateProvider>(context, listen: false);
      appState.deleteSupplier(widget.supplierToEdit!.id);
      Navigator.pop(context);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEditing = widget.supplierToEdit != null;

    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.vertical(top: Radius.circular(28.0)),
      ),
      child: SafeArea(
        top: false,
        child: Column(
          children: [
            const SizedBox(height: 10.0),
            Center(
              child: Container(
                width: 36.0,
                height: 4.0,
                decoration: BoxDecoration(
                  color: AppColors.hairlineBorder,
                  borderRadius: BorderRadius.circular(2.0),
                ),
              ),
            ),
            const SizedBox(height: 12.0),

            // Header
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20.0),
              child: Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8.0),
                    decoration: const BoxDecoration(
                      color: AppColors.aubergine,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(
                      CupertinoIcons.building_2_fill,
                      color: Colors.white,
                      size: 18.0,
                    ),
                  ),
                  const SizedBox(width: 10.0),
                  Text(
                    isEditing ? 'Edit Supplier Listing' : 'Add New Supplier (Admin)',
                    style: const TextStyle(
                      fontSize: 17.0,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textDark,
                    ),
                  ),
                  const Spacer(),
                  CupertinoButton(
                    padding: EdgeInsets.zero,
                    onPressed: () => Navigator.pop(context),
                    child: const Icon(
                      CupertinoIcons.xmark_circle_fill,
                      color: AppColors.textMuted,
                      size: 24.0,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 12.0),

            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 20.0),
                children: [
                  _FormSection(title: 'Supplier Name', controller: _nameCtrl, placeholder: 'e.g. Manila Packaging Supply'),
                  _FormSection(title: 'Category', controller: _categoryCtrl, placeholder: 'Packaging / Ingredients / Equipment / Printing'),
                  _FormSection(title: 'Address', controller: _addressCtrl, placeholder: 'Full address details'),
                  _FormSection(title: 'Contact Number', controller: _contactCtrl, placeholder: '+63 917 ...'),
                  _FormSection(title: 'Search Tags (comma separated)', controller: _tagsCtrl, placeholder: 'Packaging, Bottle, Custom'),
                ],
              ),
            ),

            // Bottom Buttons
            Padding(
              padding: const EdgeInsets.all(20.0),
              child: Row(
                children: [
                  if (isEditing) ...[
                    CupertinoButton(
                      color: AppColors.pinkRed,
                      borderRadius: BorderRadius.circular(14.0),
                      onPressed: _deleteSupplier,
                      child: const Icon(CupertinoIcons.trash, color: Colors.white),
                    ),
                    const SizedBox(width: 12.0),
                  ],
                  Expanded(
                    child: CupertinoButton(
                      color: AppColors.yellow,
                      borderRadius: BorderRadius.circular(14.0),
                      onPressed: _saveSupplier,
                      child: Text(
                        isEditing ? 'Save Changes' : 'Publish Supplier',
                        style: const TextStyle(
                          fontSize: 15.0,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textDark,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FormSection extends StatelessWidget {
  final String title;
  final TextEditingController controller;
  final String placeholder;
  final int maxLines;

  const _FormSection({
    required this.title,
    required this.controller,
    required this.placeholder,
    this.maxLines = 1,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 12.0,
              fontWeight: FontWeight.w600,
              color: AppColors.textMuted,
            ),
          ),
          const SizedBox(height: 4.0),
          CupertinoTextField(
            controller: controller,
            placeholder: placeholder,
            maxLines: maxLines,
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 10.0),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12.0),
              border: Border.all(color: AppColors.hairlineBorder),
            ),
          ),
        ],
      ),
    );
  }
}
