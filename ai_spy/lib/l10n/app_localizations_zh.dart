// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Chinese (`zh`).
class AppLocalizationsZh extends AppLocalizations {
  AppLocalizationsZh([String locale = 'zh']) : super(locale);

  @override
  String get appName => 'AI-Spy (AI侦探)';

  @override
  String get waitingText => '瓜宝正在等待你的照片...';

  @override
  String get scanningText => '正在扫描像素... 紧张得满头大汗...';

  @override
  String get dropPhotoTitle => '丢进真相探测机';

  @override
  String get choosePhoto => '从相册选择';

  @override
  String get takePicture => '拍一张照片';

  @override
  String get fakeAlertTitle => '🚨 假图警告！';

  @override
  String get organicTitle => '✅ 100% 纯正天然';

  @override
  String get confidencePrefix => '瓜宝的确信度：';

  @override
  String get fakeDescription => '哇哦。似乎有人试图蒙混过关，我们在这张图中检测到了大量的 AI 生成痕迹。';

  @override
  String get realDescription => '你可以睡个安稳觉了。这张照片确实是真实人类在现实世界中拍摄的。';

  @override
  String get unlockReportTitle => '解锁深度分析报告';

  @override
  String get unlockReportDesc => '查看确切的 Midjourney / SD 像素生成痕迹热力图。';

  @override
  String get revealTruthBtn => '支付 ￥4.9 揭晓真相';

  @override
  String get shareVerdict => '分享检测结果';

  @override
  String get scanAnother => '再检测一张';

  @override
  String get historyTitle => '历史记录';

  @override
  String get historyLocalDisclaimer => '记录仅保存在你的本机设备上。';

  @override
  String get restorePurchases => '恢复购买';

  @override
  String get appVersionLabel => 'AI-Spy MVP v1.0\n为寻找真相而生。';

  @override
  String get readyNextScan => '准备好进行下一次检测！';

  @override
  String get backendError => '后端服务错误：';

  @override
  String get fakeToast => '🔥 假图警告！存在极高的 AI 生成概率！ 🔥';

  @override
  String get realToast => '✅ 已确认纯正天然来源！';

  @override
  String get restoreSuccessToast => '✅ 购买记录恢复成功！';

  @override
  String get mockIapUnlockedToast => '模拟内购：解锁成功！ ✨';

  @override
  String get historyTimeJustNow => '刚刚';

  @override
  String get historyTime2Hrs => '2 小时前';

  @override
  String get historyTimeYesterday => '昨天';
}
