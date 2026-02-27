import 'dart:ui';
import 'package:flutter/material.dart';
import '../l10n/app_localizations.dart';

class HistoryDrawer extends StatelessWidget {
  final VoidCallback onRestorePurchases;
  final List<Map<String, dynamic>> scanHistory;

  const HistoryDrawer({
    super.key,
    required this.onRestorePurchases,
    required this.scanHistory,
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
                  
                  // Dynamic History List
                  Expanded(
                    child: ListView(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      children: [
                        if (scanHistory.isEmpty)
                          const Padding(
                            padding: EdgeInsets.all(32.0),
                            child: Center(
                              child: Text(
                                "No scans yet. Try detecting something!",
                                textAlign: TextAlign.center,
                                style: TextStyle(color: Colors.black45),
                              ),
                            ),
                          )
                        else
                          ...scanHistory.map((item) {
                            final bool isFake = item['isFake'] as bool;
                            final double conf = item['confidence'] as double;
                            // Time formatting simplified for MVP
                            final String timeStr = l10n.historyTimeJustNow;
                            final String titleStr = isFake ? l10n.fakeAlertTitle : l10n.organicTitle;
                            
                            // If it's organic, the API confidence (e.g., 0.01) means 1% AI / 99% Organic. 
                            // We should show the Organic confidence (99.0%) next to the Organic title.
                            final double displayScore = isFake ? conf : (1.0 - conf);
                            final String confStr = "${(displayScore * 100).toStringAsFixed(1)}%";
                            final Color color = isFake ? Colors.red : Colors.green;

                            return _buildHistoryItem(timeStr, titleStr, confStr, color);
                          }).toList(),
                        
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
