import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:likhora2/main.dart';

void main() {
  testWidgets('Likhora App Smoke Test', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 1200);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);

    await tester.pumpWidget(const LikhoraApp());
    await tester.pump(const Duration(seconds: 2));
    expect(find.byType(LikhoraApp), findsOneWidget);
  });
}
