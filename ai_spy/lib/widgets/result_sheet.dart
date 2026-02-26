import 'dart:ui';
import 'package:flutter/material.dart';
import '../l10n/app_localizations.dart';
import 'bouncy_button.dart';

class ResultSheet extends StatelessWidget {
  final bool isFake;
  final double confidence;
  final VoidCallback onUnlock;
  final VoidCallback onClose;

  const ResultSheet({
    super.key,
    required this.isFake,
    required this.confidence,
    required this.onUnlock,
    required this.onClose,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    bool isDanger = isFake;
    Color primaryColor = isDanger ? const Color(0xFFFF4B4B) : const Color(0xFF00D084);
    String title = isDanger ? l10n.fakeAlertTitle : l10n.organicTitle;
    String scanPercent = "${(confidence * 100).toStringAsFixed(1)}%";
    String description = isDanger 
        ? l10n.fakeDescription
        : l10n.realDescription;

    return ClipRRect(
      borderRadius: const BorderRadius.vertical(top: Radius.circular(40)),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 20, sigmaY: 20),
        child: Container(
          decoration: BoxDecoration(
            color: Colors.white.withOpacity(0.8), // more opaque for readability
            border: Border(top: BorderSide(color: Colors.white.withOpacity(0.9), width: 1.5)),
          ),
          padding: const EdgeInsets.only(left: 32, right: 32, top: 16, bottom: 48),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              // Drag Handle
              Container(width: 48, height: 6, decoration: BoxDecoration(color: Colors.black26, borderRadius: BorderRadius.circular(10))),
              const SizedBox(height: 24),
              
              // Verdict Header
              Text(
                title,
                style: TextStyle(fontSize: 28, fontWeight: FontWeight.w900, color: primaryColor),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              if (isFake) // Only show confidence on AI detection usually to build trust
                Text(
                  "\${l10n.confidencePrefix}: $scanPercent",
                  style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black87),
                ),
              const SizedBox(height: 16),
              Text(
                description,
                style: const TextStyle(fontSize: 15, color: Colors.black87, height: 1.4),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // Deep Analysis / Heatmap / Paywall
              if (isDanger) 
                _buildPaywallBox(context, primaryColor)
              else 
                 _buildShareBox(context, primaryColor),
              
              const SizedBox(height: 24),
              TextButton(
                onPressed: onClose,
                child: Text(l10n.scanAnother, style: const TextStyle(color: Colors.black54, fontWeight: FontWeight.bold, fontSize: 16)),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPaywallBox(BuildContext context, Color themeColor) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: [
           BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
        ]
      ),
      clipBehavior: Clip.antiAlias,
      child: Stack(
        children: [
          // Simulated Heatmap Blur effect underneath
          Positioned.fill(
             child: Opacity(
               opacity: 0.3,
               child: Container(
                  decoration: const BoxDecoration(
                    gradient: RadialGradient(
                      colors: [Colors.orange, Colors.purple, Colors.red, Colors.transparent],
                      radius: 2.5,
                    )
                  ),
               ),
             )
          ),
          Positioned.fill(
            child: BackdropFilter(
              filter: ImageFilter.blur(sigmaX: 10, sigmaY: 10),
              child: Container(color: Colors.black.withOpacity(0.05)),
            ),
          ),
          
          // Paywall Content
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              children: [
                Icon(Icons.lock_outline, size: 40, color: Colors.indigo),
                const SizedBox(height: 12),
                Text(
                  AppLocalizations.of(context)!.unlockReportTitle,
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.black87),
                ),
                const SizedBox(height: 8),
                Text(
                  AppLocalizations.of(context)!.unlockReportDesc,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 13, color: Colors.black87),
                ),
                const SizedBox(height: 20),
                
                // Purchase Button
                BouncyButton(
                  onPressed: onUnlock,
                  child: SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: AbsorbPointer(
                      child: ElevatedButton(
                        onPressed: () {},
                        style: ElevatedButton.styleFrom(
                          backgroundColor: themeColor,
                          foregroundColor: Colors.white,
                          elevation: 8,
                          shadowColor: themeColor.withOpacity(0.6),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        child: Text(AppLocalizations.of(context)!.revealTruthBtn, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ),
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildShareBox(BuildContext context, Color themeColor) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: Colors.white, width: 2),
        boxShadow: [
           BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10, offset: const Offset(0, 4))
        ]
      ),
      child: Column(
        children: [
          const Icon(Icons.verified, size: 48, color: Colors.green),
          const SizedBox(height: 16),
          BouncyButton(
            onPressed: onUnlock, // Reusing onUnlock for mock sharing
            child: SizedBox(
              width: double.infinity,
              height: 56,
              child: AbsorbPointer(
                child: ElevatedButton.icon(
                  onPressed: () {},
                  icon: const Icon(Icons.ios_share),
                  label: Text(AppLocalizations.of(context)!.shareVerdict, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: themeColor,
                    foregroundColor: Colors.white,
                    elevation: 4,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
              ),
            ),
          )
        ],
      ),
    );
  }
}
