import 'dart:ui';
import 'package:flutter/material.dart';
import 'l10n/app_localizations.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_localizations/flutter_localizations.dart';

import 'widgets/bouncy_button.dart';
import 'widgets/result_sheet.dart';
import 'widgets/history_drawer.dart';

void main() {
  runApp(const AiSpyApp());
}

final ValueNotifier<Locale> appLocale = ValueNotifier(const Locale('en'));

// ... unchanged AiSpyApp ...

class AiSpyApp extends StatelessWidget {
  const AiSpyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<Locale>(
      valueListenable: appLocale,
      builder: (context, locale, child) {
        return MaterialApp(
          debugShowCheckedModeBanner: false,
          title: 'AI Spy',
          locale: locale,
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          theme: ThemeData(
            fontFamily: 'Quicksand',
            fontFamilyFallback: const ['PingFang SC', 'Heiti SC', 'Microsoft YaHei', 'sans-serif'],
            colorScheme: ColorScheme.fromSeed(
              seedColor: const Color(0xFF8E7BFF),
              brightness: Brightness.light,
            ),
            useMaterial3: true,
          ),
          home: const MascotDetectorScreen(),
        );
      },
    );
  }
}

class MascotDetectorScreen extends StatefulWidget {
  const MascotDetectorScreen({super.key});

  @override
  State<MascotDetectorScreen> createState() => _MascotDetectorScreenState();
}

class _MascotDetectorScreenState extends State<MascotDetectorScreen> with SingleTickerProviderStateMixin {
  final ImagePicker _picker = ImagePicker();
  
  late AnimationController _animController;
  late Animation<double> _breatheAnimation;
  late Animation<double> _floatAnimation;

  bool _isLoading = false;
  String? _resultText; // Set to null initially to allow translation lookup in build()
  bool _isFakeResult = false;
  bool _hasResult = false;
  
  // Real History State
  List<Map<String, dynamic>> _scanHistory = [];

  @override
  void initState() {
    super.initState();
    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);

    _breatheAnimation = Tween<double>(begin: 1.0, end: 1.05).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOutSine)
    );
    _floatAnimation = Tween<double>(begin: -10.0, end: 10.0).animate(
      CurvedAnimation(parent: _animController, curve: Curves.easeInOutSine)
    );
  }

  void _triggerInput(String type, String name, dynamic value) {
    // Legacy Rive hook, now adapted for Flutter animation speed
    if (name == 'isScanning' && value == true) {
      _animController.duration = const Duration(milliseconds: 500);
      _animController.repeat(reverse: true);
    } else if (name == 'isScanning' && value == false) {
      _animController.duration = const Duration(seconds: 2);
      _animController.repeat(reverse: true);
    }
  }

  void _showResultSheet(bool isFake, double confidence) {
     setState(() {
       _isFakeResult = isFake;
       _hasResult = true;
     });
     showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ResultSheet(
        isFake: isFake,
        confidence: confidence,
        onUnlock: () {
          // TODO: Impl IAP
          Navigator.pop(context);
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Mock IAP: Unlocked! ✨'))
          );
        },
        onClose: () {
          Navigator.pop(context);
          setState(() {
            _resultText = null;
            _hasResult = false;
            // Back to idle
            _triggerInput('bool', 'isScanning', false);
          });
        },
      ),
    );
  }

  Future<void> _pickAndAnalyzeImage(ImageSource source) async {
    // requestFullMetadata: false prevents 5-10 second iOS 14+ gallery lag
    final XFile? image = await _picker.pickImage(
      source: source, 
      requestFullMetadata: false
    );
    if (image == null) return;

    setState(() {
      _isLoading = true;
      _resultText = AppLocalizations.of(context)!.scanningText;
    });
    // For character or similar files we guess input names:
    _triggerInput('bool', 'isChecking', true);
    _triggerInput('bool', 'isScanning', true);

    try {
      var request = http.MultipartRequest(
        'POST', 
        Uri.parse('https://ai-spy-3owq.onrender.com/api/v1/detect')
      );
      
      request.fields['auth_token'] = 'my_super_secure_client_secret_for_flutter';
      var fileBytes = await image.readAsBytes();
      var multipartFile = http.MultipartFile.fromBytes(
        'image',
        fileBytes,
        filename: image.name.isNotEmpty ? image.name : 'upload.jpg',
      );
      request.files.add(multipartFile);

      var response = await request.send();
      
      if (response.statusCode == 200) {
        String responseStr = await response.stream.bytesToString();
        bool isFake = responseStr.contains('"is_fake":true'); 
        
        // Extract mock confidence score we built in the backend
        double confidence = 0.88; // Default fallback
        try {
           final regex = RegExp(r'"confidence_score":([0-9.]+)');
           final match = regex.firstMatch(responseStr);
           if (match != null) {
              confidence = double.parse(match.group(1)!);
           }
        } catch (_) {}

        setState(() {
          _triggerInput('bool', 'isChecking', false);
          _triggerInput('bool', 'isScanning', false);
          if (isFake) {
            _triggerInput('trigger', 'fail', null);
            _triggerInput('trigger', 'shocked', null);
            _resultText = AppLocalizations.of(context)!.fakeToast;
          } else {
            _triggerInput('trigger', 'success', null);
            _triggerInput('trigger', 'approved', null);
            _resultText = AppLocalizations.of(context)!.realToast;
          }
        });
        
        // Add to History
        _scanHistory.insert(0, {
          'time': DateTime.now(),
          'isFake': isFake,
          'confidence': confidence
        });
        
        // POP THE SHEET
        _showResultSheet(isFake, confidence);
        
      } else {
        String respBody = await response.stream.bytesToString();
        throw Exception("HTTP ${response.statusCode}: $respBody");
      }
    } catch (e) {
      print("Upload Error Caught: $e");
      setState(() {
          _triggerInput('bool', 'isChecking', false);
          _triggerInput('bool', 'isScanning', false);
          _triggerInput('trigger', 'fail', null);
          _triggerInput('trigger', 'confused', null);
        _resultText = "\${AppLocalizations.of(context)!.backendError} $e";
      });
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  @override
  void dispose() {
    _animController.dispose();
    super.dispose();
  }

// add import at top of main.dart
  void _handleRestorePurchases() {
    // Show a mock loading indicator and then success
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator()),
    );
    Future.delayed(const Duration(seconds: 2), () {
      Navigator.pop(context); // close dialog
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Purchases Restored Successfully!'),
          backgroundColor: Colors.green,
        )
      );
    });
  }

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    String displayText = _resultText ?? l10n.waitingText;

    return Scaffold(
      backgroundColor: const Color(0xFFE8F0FF), // Soft background
      drawer: HistoryDrawer(
        onRestorePurchases: _handleRestorePurchases,
        scanHistory: _scanHistory,
      ),
      body: Stack(
        children: [
          // 1. BACKGROUND GRADIENT LAYER
          Positioned.fill(
            child: Container(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: _hasResult
                      ? (_isFakeResult
                          ? [Colors.red.shade900, Colors.red.shade700]
                          : [Colors.green.shade900, Colors.green.shade700])
                      : [const Color(0xFF1E1E2C), const Color(0xFF2D2A4A)],
                ),
              ),
            ),
          ),
          
          // 2. MASCOT LAYER (Animated Flutter Graphic)
          Positioned(
            top: MediaQuery.of(context).size.height * 0.15,
            left: 0,
            right: 0,
            child: AnimatedBuilder(
              animation: _animController,
              builder: (context, child) {
                return Transform.translate(
                  offset: Offset(0, _floatAnimation.value),
                  child: Transform.scale(
                    scale: _breatheAnimation.value,
                    child: Center(
                      child: Container(
                        width: 250,
                        height: 250,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          boxShadow: [
                            BoxShadow(
                              color: (_isLoading ? Colors.cyan : (_hasResult ? (_isFakeResult ? Colors.red : Colors.green) : Colors.purple)).withOpacity(0.5),
                              blurRadius: _isLoading ? 50 : 30,
                              spreadRadius: _isLoading ? 20 : 10,
                            )
                          ],
                          image: const DecorationImage(
                            image: AssetImage('assets/icon.png'),
                            fit: BoxFit.cover,
                          )
                        ),
                      ),
                    ),
                  ),
                );
              },
            ),
          ),
          
          // 3. FOREGROUND GLASSMORPHISM UI LAYER
          SafeArea(
            child: Column(
              children: [
                const SizedBox(height: 20),
                // Title App Bar Glass
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 24),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      // Drawer Button (Menu)
                      Builder(
                        builder: (context) => IconButton(
                          icon: const Icon(Icons.menu, color: Colors.indigo, size: 32),
                          onPressed: () => Scaffold.of(context).openDrawer(),
                        ),
                      ),
                      
                      _buildGlassContainer(
                        child: const Padding(
                          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(Icons.troubleshoot, color: Colors.indigo),
                              SizedBox(width: 8),
                              Text(
                                'AI-Spy',
                                style: TextStyle(
                                  fontSize: 24,
                                  fontWeight: FontWeight.w900,
                                  color: Colors.indigo,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      // Language Toggle (EN/ZH)
                      Builder(
                        builder: (context) => IconButton(
                          icon: const Icon(Icons.language, color: Colors.indigo, size: 28),
                          onPressed: () {
                            // Toggle between en and zh
                            if (appLocale.value.languageCode == 'en') {
                              appLocale.value = const Locale('zh');
                            } else {
                              appLocale.value = const Locale('en');
                            }
                          },
                        ),
                      ),
                    ]
                  ),
                ),
                
                const Spacer(),
                
                // Upload Card Glass
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: _buildGlassContainer(
                    child: Padding(
                      padding: const EdgeInsets.all(24.0),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            l10n.dropPhotoTitle,
                            style: const TextStyle(
                              fontSize: 18, 
                              fontWeight: FontWeight.bold,
                              color: Colors.black87
                            ),
                          ),
                          const SizedBox(height: 24),
                          
                          // Big Upload Button
                          BouncyButton(
                            onPressed: _isLoading 
                                ? null 
                                : () => _pickAndAnalyzeImage(ImageSource.gallery),
                            child: SizedBox(
                              width: double.infinity,
                              height: 60,
                              child: AbsorbPointer( // Stop Flutter's internal ripple from stealing the pointer
                                child: ElevatedButton.icon(
                                  onPressed: () {},
                                  icon: const Icon(Icons.photo_library),
                                  label: Text(
                                    l10n.choosePhoto, 
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)
                                  ),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: Colors.white,
                                    foregroundColor: const Color(0xFF8E7BFF),
                                    elevation: 8,
                                    shadowColor: const Color(0xFF8E7BFF).withOpacity(0.5),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(20)
                                    )
                                  ),
                                ),
                              ),
                            ),
                          ),
                          
                          // Only the main upload button remains
                        ],
                      ),
                    ),
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Status / Reaction Bar
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 32),
                  child: _buildGlassContainer(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        children: [
                          if (_isLoading) 
                            const SizedBox(
                              width: 20, height: 20, 
                              child: CircularProgressIndicator(strokeWidth: 2)
                            )
                          else
                            const Icon(Icons.info_outline, color: Colors.deepPurple),
                          
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              displayText,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                                color: Colors.black87
                              ),
                            ),
                          )
                        ],
                      ),
                    ),
                  ),
                ),
                
                const SizedBox(height: 48), // Bottom padding
              ],
            ),
          )
        ],
      ),
    );
  }

  // Reusable Glassmorphism Container Widget
  Widget _buildGlassContainer({required Widget child}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(32),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withValues(alpha: 0.3),
            borderRadius: BorderRadius.circular(32),
            border: Border.all(
              color: Colors.white.withValues(alpha: 0.5),
              width: 1.5,
            ),
          ),
          child: child,
        ),
      ),
    );
  }
}
