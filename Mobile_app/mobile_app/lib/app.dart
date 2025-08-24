import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'routes.dart';
import 'config/theme.dart';
import 'state/auth_state.dart';
import 'state/issue_state.dart';
import 'state/ai_state.dart';
import 'state/provider_state.dart';
import 'state/booking_state.dart';
import 'state/forum_state.dart';

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthState()),
        ChangeNotifierProvider(create: (_) => IssueState()),
        ChangeNotifierProvider(create: (_) => AIState()),
        ChangeNotifierProvider(create: (_) => ProviderState()),
        ChangeNotifierProvider(create: (_) => BookingState()),
        ChangeNotifierProvider(create: (_) => ForumState()),
      ],
      child: MaterialApp(
        title: "UrbiFix",
        theme: appTheme,
        debugShowCheckedModeBanner: false,
        initialRoute: Routes.splash,
        routes: Routes.getRoutes(),
      ),
    );
  }
}
