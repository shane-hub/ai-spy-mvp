import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Search, ImagePlus, ShieldAlert, ShieldCheck, Globe, History, X, UploadCloud, FileCheck2 } from 'lucide-react';
import { PaywallDialog } from './PaywallDialog';
import { ScanOrb, type ScanState } from './ScanOrb';

// Simple i18n Dictionary
const dict = {
  en: {
    title: "AI Image Detector",
    subtitle: "Upload an image to check if it's AI-generated",
    heroEyebrow: "INTERACTIVE FORENSICS",
    brandTagline: "Image authenticity analysis",
    heroCta: "Start a free scan",
    historyCta: "View history",
    demoTitle: "Live analysis workspace",
    demoActive: "Ready for your image",
    demoHint: "Your preview stays in this browser until you submit it.",
    workflowEyebrow: "HOW IT WORKS",
    workflowTitle: "From upload to evidence in seconds",
    workflowSubtitle: "A focused workflow that keeps the result understandable and reviewable.",
    stepUploadTitle: "Upload an image",
    stepUploadBody: "Choose a JPG, PNG, or WebP image from your device.",
    stepAnalyzeTitle: "Run the analysis",
    stepAnalyzeBody: "We inspect visual signals and available provenance data.",
    stepResultTitle: "Review the result",
    stepResultBody: "See the risk level, probability, and supporting signals together.",
    evidenceEyebrow: "BUILT FOR CLARITY",
    evidenceTitle: "A probability is a signal, not a verdict.",
    evidenceBody: "AI Spy presents the evidence behind each scan so you can make the final call with context.",
    signalProvenance: "Provenance signals",
    signalModel: "Model analysis",
    signalDecision: "Human review",
    selectImage: "Tap to select an image",
    scanning: "Scanning Image...",
    detectBadge: "DETECT AI",
    detectBtn: "Analyze Image Now",
    aiGen: "AI Generated",
    natural: "Natural Image",
    confidence: "Confidence Score",
    historyTitle: "Scan History",
    noHistory: "No scans yet. Try uploading an image above!",
    retest: "Scan Another",
    historyDescFake: "This image is likely AI-generated, with an AI probability of",
    historyDescReal: "This image appears to be natural, with an AI probability of only"
  },
  zh: {
    title: "AI 图像鉴定",
    subtitle: "上传可疑图片，即刻检测是否为 AI 生成",
    heroEyebrow: "交互式图像取证",
    brandTagline: "图像真实性分析",
    heroCta: "免费开始鉴定",
    historyCta: "查看历史记录",
    demoTitle: "实时鉴定工作区",
    demoActive: "等待上传图片",
    demoHint: "图片提交前只保留在当前浏览器中。",
    workflowEyebrow: "使用流程",
    workflowTitle: "从上传到证据，只需几秒",
    workflowSubtitle: "专注的鉴定流程，让结果更容易理解，也更方便复核。",
    stepUploadTitle: "上传图片",
    stepUploadBody: "从设备中选择 JPG、PNG 或 WebP 图片。",
    stepAnalyzeTitle: "开始分析",
    stepAnalyzeBody: "检查视觉信号和可用的来源信息。",
    stepResultTitle: "查看结果",
    stepResultBody: "同时查看风险等级、概率和支持信号。",
    evidenceEyebrow: "清晰透明",
    evidenceTitle: "概率是信号，不是最终结论。",
    evidenceBody: "AI Spy 展示每次鉴定背后的依据，让你结合上下文做出最终判断。",
    signalProvenance: "来源信息",
    signalModel: "模型分析",
    signalDecision: "人工复核",
    selectImage: "点击挑选一张图片并检测",
    scanning: "深度神经网络分析中...",
    detectBadge: "鹰眼鉴定",
    detectBtn: "开始鉴定原图",
    aiGen: "AI 合成",
    natural: "真实影像",
    confidence: "置信度",
    historyTitle: "历史记录",
    noHistory: "暂无扫描记录，赶快鉴定你的第一张图吧！",
    retest: "重新检测",
    historyDescFake: "经鉴定，这大概率是一张 AI 合成图片。AI 生成概率高达：",
    historyDescReal: "经鉴定，这大概率是自然拍摄的真实影像。AI 生成概率仅为："
  }
};

type Lang = 'en' | 'zh';

interface HistoryItem {
  id: string;
  time: number;
  is_fake: boolean;
  confidence: number;
}

function App() {
  const [lang, setLang] = useState<Lang>('en');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{ is_fake: boolean; confidence_score: number } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [showPaywall, setShowPaywall] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [mascotState, setMascotState] = useState<ScanState>('idle');
  const [showResultCard, setShowResultCard] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = dict[lang];

  useEffect(() => {
    if (!localStorage.getItem('x_device_id')) {
      localStorage.setItem('x_device_id', uuidv4());
    }
    // Load local history
    const storedHistory = localStorage.getItem('ai_spy_history');
    if (storedHistory) {
      try {
        setHistoryItems(JSON.parse(storedHistory));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, []);

  const toggleLang = () => {
    setLang(prev => prev === 'en' ? 'zh' : 'en');
    setMascotState('idle');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreview(URL.createObjectURL(selected));
      setResult(null);
      setShowResultCard(false);
      setErrorMsg(null);
      setMascotState('selected');
    }
  };

  const handleDetect = async () => {
    if (!file) return;

    setIsLoading(true);
    setErrorMsg(null);
    setResult(null);
    setShowResultCard(false);
    setMascotState('scanning');

    const formData = new FormData();
    formData.append('image', file);
    const deviceId = localStorage.getItem('x_device_id') || uuidv4();

    setMascotState('scanning');

    try {
      const userToken = localStorage.getItem('user_token');
      const res = await axios.post('/api/v1/detect', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-Device-ID': deviceId,
          ...(userToken ? { Authorization: `Bearer ${userToken}` } : {})
        }
      });

      const payload = res.data.data;
      setResult(payload);
      setIsLoading(false);

      const resultState: ScanState = payload.is_fake ? 'fake' : 'real';
      setMascotState(resultState);

      // Show result card after mascot reacts
      setTimeout(() => setShowResultCard(true), 1300);

      // Update History
      const newItem: HistoryItem = { id: uuidv4(), time: Date.now(), is_fake: payload.is_fake, confidence: payload.confidence_score };
      const updatedHistory = [newItem, ...historyItems];
      setHistoryItems(updatedHistory);
      localStorage.setItem('ai_spy_history', JSON.stringify(updatedHistory));

    } catch (err: any) {
      setIsLoading(false);
      if (err.response?.status === 402) {
        setMascotState('idle');
        setShowPaywall(true);
      } else {
        setMascotState('error');
        setErrorMsg(err.response?.data?.msg || 'An error occurred during detection.');
        setTimeout(() => setMascotState('idle'), 3000);
      }
    }
  };

  const openFilePicker = () => fileInputRef.current?.click();

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-blue-200/50 blur-3xl" />
        <div className="absolute -bottom-40 -right-24 h-[30rem] w-[30rem] rounded-full bg-emerald-100/70 blur-3xl" />
      </div>

      <header className="relative z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-sm font-black tracking-tight text-white shadow-lg shadow-slate-900/15">
              AI
            </div>
            <div>
              <p className="font-display text-lg font-bold leading-none text-slate-900">AI Spy</p>
              <p className="mt-1 text-xs text-slate-500">{t.brandTagline}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowHistory(true); setMascotState('idle'); }}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
            >
              <History className="h-4 w-4" />
              <span className="hidden sm:inline">{t.historyCta}</span>
            </button>
            <button
              onClick={toggleLang}
              className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium uppercase text-slate-600 transition-colors hover:border-slate-300 hover:text-slate-900"
              aria-label="Switch language"
            >
              <Globe className="h-4 w-4" />
              {lang}
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-16 lg:grid-cols-[0.88fr_1.12fr] lg:gap-16 lg:px-8 lg:py-24">
          <div className="max-w-xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
              <Search className="h-3.5 w-3.5" />
              {t.heroEyebrow}
            </div>
            <h1 className="font-display text-4xl font-bold leading-[1.08] tracking-tight text-slate-950 sm:text-6xl">
              {t.title}
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-8 text-slate-600 sm:text-xl">
              {t.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                onClick={openFilePicker}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:bg-blue-700 active:translate-y-0"
              >
                <UploadCloud className="h-5 w-5" />
                {t.heroCta}
              </button>
              <button
                onClick={() => { setShowHistory(true); setMascotState('idle'); }}
                className="cursor-pointer inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3.5 font-semibold text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100"
              >
                {t.historyCta}
              </button>
            </div>
            <div className="mt-8 flex items-start gap-3 border-t border-slate-200 pt-5 text-sm leading-6 text-slate-500">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
              <span>{t.evidenceBody}</span>
            </div>
          </div>

          <div id="upload-card" className="rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-slate-900/10 sm:p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-semibold text-slate-900">{t.demoTitle}</p>
                <p className="mt-1 text-xs text-slate-500">{t.demoHint}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                {t.demoActive}
              </span>
            </div>

            <div className="rounded-2xl bg-slate-100 p-4 sm:p-6">
              <div className="flex min-h-[17rem] items-center justify-center rounded-xl border border-slate-200 bg-white p-4">
                {!showResultCard && (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <ScanOrb state={mascotState} preview={preview} className="h-48 w-48 sm:h-56 sm:w-56" />
                    <p className="text-sm font-medium text-slate-500">{isLoading ? t.scanning : t.demoActive}</p>
                  </div>
                )}

                {showResultCard && result && (
                  <div className={`w-full max-w-md rounded-2xl border bg-white p-6 text-center animate-slide-up ${result.is_fake ? 'border-red-200' : 'border-emerald-200'}`}>
                    <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full ${result.is_fake ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {result.is_fake ? <ShieldAlert className="h-8 w-8" /> : <ShieldCheck className="h-8 w-8" />}
                    </div>
                    <h3 className={`text-2xl font-bold ${result.is_fake ? 'text-red-600' : 'text-emerald-600'}`}>
                      {result.is_fake ? t.aiGen : t.natural}
                    </h3>
                    <p className="mt-2 text-sm text-slate-500">{t.confidence}</p>
                    <p className="mt-1 font-mono text-4xl font-bold text-slate-900">{(result.confidence_score * 100).toFixed(1)}%</p>
                  </div>
                )}
              </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
            <button
              onClick={openFilePicker}
              onMouseEnter={() => { if (mascotState === 'idle') setMascotState('selected'); }}
              onMouseLeave={() => { if (mascotState === 'selected' && !file) setMascotState('idle'); }}
              className="group relative mt-5 flex h-32 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 transition-colors hover:border-blue-400 hover:bg-blue-50/40"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-2 text-center">
                  <span className="rounded-full bg-blue-100 p-3 text-blue-600 transition-colors group-hover:bg-blue-200">
                    <ImagePlus className="h-6 w-6" />
                  </span>
                  <span className="text-sm font-semibold text-slate-700">{t.selectImage}</span>
                </span>
              )}
            </button>

            {file && !showResultCard && (
              <button
                onClick={handleDetect}
                disabled={isLoading}
                className="mt-4 flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-blue-600 py-3.5 font-semibold text-white transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? <Search className="h-5 w-5 animate-spin" /> : <FileCheck2 className="h-5 w-5" />}
                {isLoading ? t.scanning : t.detectBtn}
              </button>
            )}

            {showResultCard && result && (
              <button
                onClick={() => {
                  setResult(null);
                  setFile(null);
                  setPreview(null);
                  setShowResultCard(false);
                  setMascotState('idle');
                }}
                className="mt-4 w-full cursor-pointer rounded-lg border border-slate-300 bg-white py-3.5 font-semibold text-slate-700 transition-colors hover:bg-slate-100"
              >
                {t.retest}
              </button>
            )}

            {errorMsg && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-center text-sm font-medium text-red-700">{errorMsg}</div>}
          </div>
        </section>

        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600">{t.workflowEyebrow}</p>
              <h2 className="mt-3 font-display text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">{t.workflowTitle}</h2>
              <p className="mt-4 text-slate-600">{t.workflowSubtitle}</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {[
                { number: '01', icon: <UploadCloud className="h-7 w-7" />, title: t.stepUploadTitle, body: t.stepUploadBody, color: 'bg-blue-100 text-blue-700' },
                { number: '02', icon: <Search className="h-7 w-7" />, title: t.stepAnalyzeTitle, body: t.stepAnalyzeBody, color: 'bg-emerald-100 text-emerald-700' },
                { number: '03', icon: <FileCheck2 className="h-7 w-7" />, title: t.stepResultTitle, body: t.stepResultBody, color: 'bg-violet-100 text-violet-700' },
              ].map((step) => (
                <div key={step.number} className="rounded-2xl border border-slate-200 bg-slate-50 p-6 transition-all hover:-translate-y-1 hover:bg-white hover:shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${step.color}`}>{step.icon}</div>
                    <span className="font-mono text-sm font-bold text-slate-300">{step.number}</span>
                  </div>
                  <h3 className="mt-6 text-lg font-bold text-slate-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 rounded-3xl bg-slate-900 px-6 py-10 text-white sm:px-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">{t.evidenceEyebrow}</p>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">{t.evidenceTitle}</h2>
              <p className="mt-4 max-w-xl leading-7 text-slate-300">{t.evidenceBody}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[t.signalProvenance, t.signalModel, t.signalDecision].map((signal, index) => (
                <div key={signal} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-400/15 text-sm font-bold text-blue-300">{index + 1}</span>
                  <span className="text-sm font-medium text-slate-200">{signal}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {showHistory && (
        <div className="fixed inset-0 z-40 flex justify-start">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.3s_ease-out]" onClick={() => { setShowHistory(false); setMascotState('idle'); }} />
          <div className="relative w-80 h-full bg-[var(--color-brand-surface)] border-r border-white/10 shadow-2xl flex flex-col animate-[slideInLeft_0.4s_cubic-bezier(0.16,1,0.3,1)]">
            <div className="p-6 border-b border-white/10 flex justify-between items-center">
              <h2 className="text-white font-bold text-xl">{t.historyTitle}</h2>
              <button onClick={() => { setShowHistory(false); setMascotState('idle'); }} className="cursor-pointer text-white/50 hover:text-white pb-1"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto flex flex-col gap-3">
              {historyItems.length === 0 ? (
                <div className="text-white/40 text-center mt-10 text-sm">{t.noHistory}</div>
              ) : (
                [...historyItems].sort((a, b) => b.time - a.time).map(item => (
                  <div key={item.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex flex-col gap-2">
                    <div className="flex justify-between items-center">
                      <span className="text-white/50 text-xs font-mono">
                        {
                          (() => {
                            const d = new Date(item.time);
                            return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
                          })()
                        }
                      </span>
                      {item.is_fake ? (
                        <span className="text-red-400 text-[10px] font-bold px-2 py-0.5 bg-red-400/10 rounded-md uppercase tracking-wider">{t.aiGen}</span>
                      ) : (
                        <span className="text-emerald-400 text-[10px] font-bold px-2 py-0.5 bg-emerald-400/10 rounded-md uppercase tracking-wider">{t.natural}</span>
                      )}
                    </div>
                    <div className="text-white/80 text-sm mt-1 leading-relaxed">
                      {item.is_fake ? t.historyDescFake : t.historyDescReal} <span className={`font-bold font-mono ${item.is_fake ? "text-red-400" : "text-emerald-400"}`}>{(item.confidence * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showPaywall && (
        <PaywallDialog
          lang={lang}
          onClose={() => setShowPaywall(false)}
          onLogin={async (email, otp) => {
            try {
              const res = await axios.post('/api/v1/auth/login', {
                provider: 'EMAIL',
                email,
                otp,
              });
              localStorage.setItem('user_token', res.data.data.token);
              alert(lang === 'zh' ? '✅ 登录成功！已获取账户凭证，可以选购套餐了。' : '✅ Login Successful! JWT obtained. You can now purchase packages.');
              // We won't close paywall so they can click purchase
            } catch (e: any) {
              alert(e.response?.data?.msg || 'Login Failed');
              throw e; // throw to let PaywallDialog know it failed
            }
          }}
          onGoogleLogin={async (idToken) => {
            try {
              const res = await axios.post('/api/v1/auth/login', {
                provider: 'GMAIL',
                id_token: idToken,
              });
              localStorage.setItem('user_token', res.data.data.token);
              alert(lang === 'zh' ? '✅ Google 登录成功！已获得 3 次检测。' : '✅ Google login successful! You received 3 scans.');
            } catch (e: unknown) {
              const message = axios.isAxiosError(e) ? e.response?.data?.msg || 'Google Login Failed' : 'Google Login Failed';
              alert(message);
              throw new Error(message);
            }
          }}
          onPurchaseBasic={async () => {
            const token = localStorage.getItem('user_token');
            if (!token) { alert('Please Login first!'); return undefined; }

            try {
              await axios.post('/api/v1/payments/create-order',
                { package_type: 'BASIC_10' },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              // Simply record the pending order in backend, then show static QR
              return 'STATIC_QR';

            } catch (e) { console.error('Order Error', e); alert('Payment Error. Are you logged in?'); return undefined; }
          }}
          onPurchasePro={async () => {
            const token = localStorage.getItem('user_token');
            if (!token) { alert('Please Login first!'); return undefined; }
            try {
              await axios.post('/api/v1/payments/create-order',
                { package_type: 'PRO_50' },
                { headers: { Authorization: `Bearer ${token}` } }
              );
              return 'STATIC_QR';
            } catch (e) { alert('Error creating PRO order'); return undefined; }
          }}
          onWatchAd={async () => {
            const token = localStorage.getItem('user_token');
            if (!token) return alert('Please Login first to receive ad rewards!');

            try {
              // Simulate watching a 3s ad
              alert('Simulating watching a video ad for 3 seconds...');
              setTimeout(async () => {
                // S2S Mock callback bypass
                await axios.post('/api/v1/payments/webhook/ads', {
                  user_id: 1, // Will fail if user ID is not 1, but this is just to show structure.
                });
                alert('Ad reward should be processed via Server Webhook!');
              }, 3000);
            } catch (e) { console.error(e); }
          }}
        />
      )}
    </div >
  );
}

export default App;
