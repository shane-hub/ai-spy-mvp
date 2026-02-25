import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter_gen/gen_l10n/app_localizations.dart';

class HistoryDrawer extends StatelessWidget {
  final VoidCallback onRestorePurchases;

  const HistoryDrawer({
    super.key,
    required this.onRestorePurchases,
  });

  @override
  Widget build(BuildContext context) {
    final l10n = AppLocalizations.of(context)!;
    
    return Drawer(
      backgroundColor: Colors.transparent,
      child: ClipRRect(
        borderRadius: const BorderRadius.only(
          topRight: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
        child: BackdropFilter(
          filter: ImageFilter.blur(sigmaX: 15, sigmaY: 15),
          child: Container(
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.85),
              border: Border(
                right: BorderSide(color: Colors.white.withOpacity(0.9), width: 1.5),
              ),
            ),
            child: SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                   Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
                    child: Row(
                      children: [
                         const Icon(Icons.history, color: Colors.indigo, size: 28),
                         const SizedBox(width: 12),
                         Text(
                           l10n.historyTitle, 
                           style: const TextStyle(
                              fontSize: 24, 
                              fontWeight: FontWeight.w900,
                              color: Colors.indigo
                           )
                         ),
                      ],
                    ),
                  ),
                  const Divider(color: Colors.black12, height: 1),
                  
                  // Mock History List
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      children: [
                        _buildHistoryItem(l10n.historyTimeJustNow, l10n.fakeAlertTitle, "88.0%", Colors.red),
                        _buildHistoryItem(l10n.historyTime2Hrs, l10n.organicTitle, "92.1%", Colors.green),
                        _buildHistoryItem(l10n.historyTimeYesterday, l10n.fakeAlertTitle, "99.9%", Colors.red),
                        
                        Padding(
                          padding: const EdgeInsets.all(24.0),
                          child: Text(
                            l10n.historyLocalDisclaimer,
                            textAlign: TextAlign.center,
                            style: const TextStyle(fontSize: 12, color: Colors.black45),
                          ),
                        )
                      ],
                    ),
                  ),

                  // Bottom Settings area (Restore Purchases)
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: const BoxDecoration(
                      color: Colors.white70,
                      border: Border(top: BorderSide(color: Colors.black12))
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        ElevatedButton.icon(
                          onPressed: () {
                            Navigator.pop(context); // close drawer
                            onRestorePurchases();
                          },
                          icon: const Icon(Icons.restore),
                          label: Text(l10n.restorePurchases),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.indigo.shade50,
                            foregroundColor: Colors.indigo,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12)
                            )
                          ),
                        ),
                        const SizedBox(height: 12),
                        Text(
                          l10n.appVersionLabel,
                          textAlign: TextAlign.center,
                          style: const TextStyle(fontSize: 11, color: Colors.black45),
                        )
                      ],
                    ),
                  )
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHistoryItem(String time, String title, String score, Color color) {
    return ListTile(
      leading: Container(
        width: 12, height: 12,
        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
      ),
      title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
      subtitle: Text(time, style: const TextStyle(color: Colors.black54, fontSize: 12)),
      trailing: Text(score, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
      onTap: () {
        // Future feature: View old scan details
      },
    );
  }
}
