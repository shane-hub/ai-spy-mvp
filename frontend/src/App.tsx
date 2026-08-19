import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { Search, ImagePlus, ShieldAlert, ShieldCheck, Globe, History, X } from 'lucide-react';
import { PaywallDialog } from './PaywallDialog';
import { ScanOrb, type ScanState } from './ScanOrb';

// Simple i18n Dictionary
const dict = {
  en: {
    title: "AI Image Detector",
    subtitle: "Upload an image to check if it's AI-generated",
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

  return (
    <div className="min-h-screen flex flex-col pt-4 p-5 font-sans text-gray-100 relative overflow-hidden bg-[#0F172A]">
      {/* Background: idle — subtle blue+green tech glow */}
      <div
        className="absolute inset-0 transition-opacity duration-1000 pointer-events-none"
        style={{ opacity: (!result || isLoading) ? 1 : 0 }}
      >
        <div className="absolute top-[-15%] left-[-10%] w-[55%] h-[55%] bg-blue-600/15 rounded-full blur-[140px]" />
        <div className="absolute bottom-[-5%] right-[-10%] w-[55%] h-[55%] bg-emerald-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[35%] left-[25%] w-[35%] h-[35%] bg-slate-500/8 rounded-full blur-[80px]" />
      </div>

      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: (result && !isLoading && result.is_fake) ? 1 : 0 }}
      >
        <div className="absolute top-0 left-[-10%] w-full h-[60%] bg-red-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[80%] h-[80%] bg-orange-600/10 rounded-full blur-[100px]" />
      </div>

      <div
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: (result && !isLoading && !result.is_fake) ? 1 : 0 }}
      >
        <div className="absolute top-0 right-[-10%] w-[80%] h-[60%] bg-emerald-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-full h-[70%] bg-teal-500/10 rounded-full blur-[100px]" />
      </div>

      {/* Top Navbar */}
      <div className="relative z-20 flex justify-between items-center w-full max-w-sm mx-auto mb-3">
        <button
          onClick={() => { setShowHistory(true); setMascotState('idle'); }}
          className="cursor-pointer p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:bg-slate-700/80 hover:text-white transition-all duration-200 backdrop-blur-md"
        >
          <History className="w-5 h-5" />
        </button>
        <button
          onClick={toggleLang}
          className="cursor-pointer flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:bg-slate-700/80 hover:text-white transition-all duration-200 backdrop-blur-md"
        >
          <Globe className="w-4 h-4" />
          <span className="text-sm font-semibold uppercase">{lang}</span>
        </button>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto flex flex-col gap-6 flex-1">

        {/* Header Title */}
        <div className="text-center mt-1 mb-1">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 backdrop-blur-md shadow-lg mb-3">
            <Search className="w-3 h-3 text-emerald-400" />
            <span className="font-bold text-emerald-300 tracking-widest text-xs uppercase">{t.detectBadge}</span>
          </div>
          <h1 className="font-display text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-300">
            {t.title}
          </h1>
          <p className="text-slate-400 mt-1.5 text-sm">{t.subtitle}</p>
        </div>

        {/* Center Area: Mascot always visible, result card slides in after */}
        <div className="flex justify-center relative my-2">
          {/* Mascot - always shown, changes expression based on state */}
          {!showResultCard && (
            <ScanOrb
              state={mascotState}
              preview={preview}
              className="w-48 h-48"
            />
          )}

          {/* Result card - slides in 1.3s after detection */}
          {showResultCard && result && (
            <div className={`w-full glass-panel rounded-3xl p-6 text-center animate-slide-up border-t ${result.is_fake ? 'border-red-500/30' : 'border-emerald-500/30'}`}>
              <div className={`inline-flex p-3 rounded-full mb-3 ${result.is_fake ? 'bg-red-500/10 text-red-400 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.2)]'}`}>
                {result.is_fake ? <ShieldAlert className="w-8 h-8" /> : <ShieldCheck className="w-8 h-8" />}
              </div>
              <h3 className={`text-2xl font-black mb-2 uppercase tracking-wide ${result.is_fake ? 'text-red-400' : 'text-emerald-400'}`}>
                {result.is_fake ? t.aiGen : t.natural}
              </h3>
              <div className="inline-flex flex-col items-center mt-1 px-5 py-2 rounded-2xl bg-black/20 border border-white/5">
                <span className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
                  {lang === 'zh' ? 'AI 生成概率' : 'AI Probability'}
                </span>
                <span className="text-white font-mono text-xl font-bold">
                  {(result.confidence_score * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Upload Card */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col gap-5 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-b from-white/[0.08] to-transparent pointer-events-none" />

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={() => { fileInputRef.current?.click(); }}
            onMouseEnter={() => { if (mascotState === 'idle') setMascotState('selected'); }}
            onMouseLeave={() => { if (mascotState === 'selected' && !file) setMascotState('idle'); }}
            className="cursor-pointer w-full h-40 relative rounded-2xl flex flex-col items-center justify-center gap-3 transition-all duration-300 overflow-hidden"
          >
            <div className={`absolute inset-0 border-2 border-dashed rounded-2xl transition-colors ${preview ? 'border-transparent' : 'border-white/20 group-hover:border-blue-400/50'}`} />

            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <>
                <div className="p-4 rounded-full bg-white/5 group-hover:bg-blue-500/20 transition-colors">
                  <ImagePlus className="w-8 h-8 text-blue-300" />
                </div>
                <span className="text-white/70 font-medium text-sm">{t.selectImage}</span>
              </>
            )}
          </button>

          {file && !showResultCard && (
            <button
              onClick={handleDetect}
              disabled={isLoading}
              className="cursor-pointer w-full py-4 rounded-2xl font-bold text-white btn-green active:scale-[0.98] disabled:opacity-60 disabled:active:scale-100 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Search className="w-5 h-5 animate-spin" />
                  {t.scanning}
                </>
              ) : (
                t.detectBtn
              )}
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
              className="cursor-pointer w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold hover:bg-white/10 transition-colors"
            >
              {t.retest || 'Scan Another'}
            </button>
          )}

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center font-medium p-3 rounded-xl mt-2">
              {errorMsg}
            </div>
          )}
        </div>
      </div>

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
