import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_en.dart';
import 'app_localizations_zh.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations? of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations);
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[
    Locale('en'),
    Locale('zh'),
  ];

  /// No description provided for @appName.
  ///
  /// In en, this message translates to:
  /// **'AI-Spy'**
  String get appName;

  /// No description provided for @waitingText.
  ///
  /// In en, this message translates to:
  /// **'Our goofy friend is waiting for your photo...'**
  String get waitingText;

  /// No description provided for @scanningText.
  ///
  /// In en, this message translates to:
  /// **'Scanning pixels... sweat is dropping...'**
  String get scanningText;

  /// No description provided for @dropPhotoTitle.
  ///
  /// In en, this message translates to:
  /// **'Drop it in the Truth Machine'**
  String get dropPhotoTitle;

  /// No description provided for @choosePhoto.
  ///
  /// In en, this message translates to:
  /// **'Choose Photo'**
  String get choosePhoto;

  /// No description provided for @takePicture.
  ///
  /// In en, this message translates to:
  /// **'Take a Picture'**
  String get takePicture;

  /// No description provided for @fakeAlertTitle.
  ///
  /// In en, this message translates to:
  /// **'🚨 FAKE ALERT!'**
  String get fakeAlertTitle;

  /// No description provided for @organicTitle.
  ///
  /// In en, this message translates to:
  /// **'✅ 100% ORGANIC'**
  String get organicTitle;

  /// No description provided for @confidencePrefix.
  ///
  /// In en, this message translates to:
  /// **'Guabao\'s Confidence'**
  String get confidencePrefix;

  /// No description provided for @fakeDescription.
  ///
  /// In en, this message translates to:
  /// **'Wow. Someone is trying to pull a fast one. We detected heavy AI-generated artifacts in this image.'**
  String get fakeDescription;

  /// No description provided for @realDescription.
  ///
  /// In en, this message translates to:
  /// **'You can sleep well tonight. This image was captured by a real human in the real world.'**
  String get realDescription;

  /// No description provided for @unlockReportTitle.
  ///
  /// In en, this message translates to:
  /// **'Unlock Deep Analysis Report'**
  String get unlockReportTitle;

  /// No description provided for @unlockReportDesc.
  ///
  /// In en, this message translates to:
  /// **'See exactly which pixels were generated by Midjourney/Stable Diffusion.'**
  String get unlockReportDesc;

  /// No description provided for @revealTruthBtn.
  ///
  /// In en, this message translates to:
  /// **'Reveal Truth for ¥4.9'**
  String get revealTruthBtn;

  /// No description provided for @shareVerdict.
  ///
  /// In en, this message translates to:
  /// **'Share Verdict'**
  String get shareVerdict;

  /// No description provided for @scanAnother.
  ///
  /// In en, this message translates to:
  /// **'Scan Another Photo'**
  String get scanAnother;

  /// No description provided for @historyTitle.
  ///
  /// In en, this message translates to:
  /// **'History'**
  String get historyTitle;

  /// No description provided for @historyLocalDisclaimer.
  ///
  /// In en, this message translates to:
  /// **'History is stored only on this device.'**
  String get historyLocalDisclaimer;

  /// No description provided for @restorePurchases.
  ///
  /// In en, this message translates to:
  /// **'Restore Purchases'**
  String get restorePurchases;

  /// No description provided for @appVersionLabel.
  ///
  /// In en, this message translates to:
  /// **'AI-Spy MVP v1.0\nBuilt for truth.'**
  String get appVersionLabel;

  /// No description provided for @readyNextScan.
  ///
  /// In en, this message translates to:
  /// **'Ready for the next scan!'**
  String get readyNextScan;

  /// No description provided for @backendError.
  ///
  /// In en, this message translates to:
  /// **'Backend Error:'**
  String get backendError;

  /// No description provided for @fakeToast.
  ///
  /// In en, this message translates to:
  /// **'🔥 FAKE ALERT! High AI Probability! 🔥'**
  String get fakeToast;

  /// No description provided for @realToast.
  ///
  /// In en, this message translates to:
  /// **'✅ Pure natural origin confirmed!'**
  String get realToast;

  /// No description provided for @restoreSuccessToast.
  ///
  /// In en, this message translates to:
  /// **'✅ Purchases Restored Successfully!'**
  String get restoreSuccessToast;

  /// No description provided for @mockIapUnlockedToast.
  ///
  /// In en, this message translates to:
  /// **'Mock IAP: Unlocked! ✨'**
  String get mockIapUnlockedToast;

  /// No description provided for @historyTimeJustNow.
  ///
  /// In en, this message translates to:
  /// **'Just Now'**
  String get historyTimeJustNow;

  /// No description provided for @historyTime2Hrs.
  ///
  /// In en, this message translates to:
  /// **'2 hrs ago'**
  String get historyTime2Hrs;

  /// No description provided for @historyTimeYesterday.
  ///
  /// In en, this message translates to:
  /// **'Yesterday'**
  String get historyTimeYesterday;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['en', 'zh'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'en':
      return AppLocalizationsEn();
    case 'zh':
      return AppLocalizationsZh();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
