import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../config/theme.dart';
import '../../widgets/custom_button.dart';
import '../../widgets/custom_input.dart';
import '../../state/auth_state.dart';

class SignupPage extends StatefulWidget {
  final String? roleHint; // optional role hint from RoleSelector
  const SignupPage({super.key, this.roleHint});

  @override
  State<SignupPage> createState() => _SignupPageState();
}

class _SignupPageState extends State<SignupPage> {
  final TextEditingController nameController = TextEditingController();
  final TextEditingController emailController = TextEditingController();
  final TextEditingController passwordController = TextEditingController();
  final TextEditingController confirmPasswordController =
      TextEditingController();
  final _formKey = GlobalKey<FormState>();
  
  String selectedRole = 'consumer'; // default role

  @override
  void initState() {
    super.initState();
    if (widget.roleHint != null) {
      selectedRole = widget.roleHint!;
    }
  }

  @override
  void dispose() {
    nameController.dispose();
    emailController.dispose();
    passwordController.dispose();
    confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _handleSignup() async {
    if (!_formKey.currentState!.validate()) return;

    final authState = Provider.of<AuthState>(context, listen: false);

    final userData = {
      'name': nameController.text.trim(),
      'email': emailController.text.trim(),
      'password': passwordController.text,
      'role': selectedRole,
    };

    final success = await authState.signup(userData);

    if (success && mounted) {
      // After signup, go directly to the appropriate dashboard
      if (selectedRole == 'provider') {
        Navigator.pushReplacementNamed(context, '/provider_dashboard');
      } else {
        Navigator.pushReplacementNamed(context, '/consumer_dashboard');
      }
    } else if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authState.error ?? "Signup failed"),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final roleTitle = widget.roleHint != null 
        ? 'Create ${widget.roleHint!.substring(0, 1).toUpperCase() + widget.roleHint!.substring(1)} Account'
        : 'Create Account';
    
    return Scaffold(
      backgroundColor: appTheme.scaffoldBackgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          child: ConstrainedBox(
            constraints: BoxConstraints(
              minHeight: MediaQuery.of(context).size.height - 
                        MediaQuery.of(context).padding.top - 
                        MediaQuery.of(context).padding.bottom - 32,
            ),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                Text(roleTitle,
                    style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 8),
                Text("Sign up to get started",
                    style: Theme.of(context).textTheme.bodyMedium),
                const SizedBox(height: 20),

                // Role Selection (if not pre-selected)
                if (widget.roleHint == null) ...[
                  const Text("I want to:", style: TextStyle(fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  Column(
                    children: [
                      RadioListTile<String>(
                        title: const Text('Get Help'),
                        subtitle: const Text('Consumer - Find helpers for your needs'),
                        value: 'consumer',
                        groupValue: selectedRole,
                        onChanged: (value) => setState(() => selectedRole = value!),
                        contentPadding: EdgeInsets.zero,
                      ),
                      RadioListTile<String>(
                        title: const Text('Provide Help'),
                        subtitle: const Text('Provider - Offer your services to others'),
                        value: 'provider',
                        groupValue: selectedRole,
                        onChanged: (value) => setState(() => selectedRole = value!),
                        contentPadding: EdgeInsets.zero,
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],

                // Name
                CustomInput(
                  controller: nameController,
                  label: "Full Name",
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your full name';
                    }
                    if (value.length < 2) {
                      return 'Name must be at least 2 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),

                // Email
                CustomInput(
                  controller: emailController,
                  label: "Email",
                  keyboardType: TextInputType.emailAddress,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your email';
                    }
                    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$')
                        .hasMatch(value)) {
                      return 'Please enter a valid email';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),

                // Password
                CustomInput(
                  controller: passwordController,
                  label: "Password",
                  obscureText: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a password';
                    }
                    if (value.length < 6) {
                      return 'Password must be at least 6 characters';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),

                // Confirm Password
                CustomInput(
                  controller: confirmPasswordController,
                  label: "Confirm Password",
                  obscureText: true,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please confirm your password';
                    }
                    if (value != passwordController.text) {
                      return 'Passwords do not match';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 20),

                // Signup Button
                Consumer<AuthState>(
                  builder: (context, authState, child) {
                    return CustomButton(
                      text: authState.isLoading
                          ? "Creating Account..."
                          : "Sign Up",
                      onPressed: authState.isLoading
                          ? null
                          : () {
                              _handleSignup();
                            },
                      loading: authState.isLoading,
                    );
                  },
                ),
                const SizedBox(height: 20),

                // Navigate to Login
                TextButton(
                  onPressed: () {
                    Navigator.pushNamed(context, "/login");
                  },
                  child: const Text("Already have an account? Login"),
                ),
              ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
