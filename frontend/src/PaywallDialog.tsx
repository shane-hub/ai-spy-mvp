import React, { useState, useEffect, useRef } from 'react';
import { Award, Zap, Star, PlayCircle, X, Mail, ArrowRight, Loader2, QrCode } from 'lucide-react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

interface PaywallDialogProps {
    onClose: () => void;
    onLogin: (email: string, otp: string) => Promise<void>;
    onGoogleLogin: (idToken: string) => Promise<void>;
    onPurchaseBasic: () => Promise<string | undefined>;
    onPurchasePro: () => Promise<string | undefined>;
    onWatchAd: () => void;
    lang?: 'en' | 'zh';
}

const dict = {
    en: {
        title: "Unlock AI Spy",
        subtitle: "Get the ultimate truth with deep analysis.",
        loginTitle: "Login for 3 Scans",
        loginSub: "Email code or Google",
        basicTitle: "10 Scans Pack",
        basicSub: "¥1.99 - One time",
        proTitle: "Unlimited Scans (Monthly)",
        proSub: "¥19.9/mo - Deep Reports",
        adText: "Watch video to earn 1 scan",
        emailPlaceholder: "Enter your email...",
        otpPlaceholder: "6-digit code",
        sendCode: "Send Code",
        loginBtn: "Login",
        scanToPay: "Scan to Pay",
        useWechat: "Please use WeChat to scan the QR code"
    },
    zh: {
        title: "解锁 AI 侦探",
        subtitle: "获取深度分析，揭开最终真相",
        loginTitle: "登录解锁 3 次检测",
        loginSub: "邮箱验证码或 Google 登录",
        basicTitle: "10 次检测加油包",
        basicSub: "¥1.99 - 一次性购买",
        proTitle: "包月无限次检测 (PRO)",
        proSub: "¥19.9/自然月 - 无限次高级鉴定特权",
        adText: "观看广告视频获取 1 次检测",
        emailPlaceholder: "请输入您的邮箱...",
        otpPlaceholder: "6位验证码",
        sendCode: "获取验证码",
        loginBtn: "确认登录",
        scanToPay: "微信扫码支付",
        useWechat: "请使用手机微信“扫一扫”完成付款"
    }
};

export const PaywallDialog: React.FC<PaywallDialogProps> = ({
    onClose,
    onLogin,
    onGoogleLogin,
    onPurchaseBasic,
    onPurchasePro,
    onWatchAd,
    lang = 'en',
}) => {
    const t = dict[lang];
    const [step, setStep] = useState<'options' | 'email' | 'qrcode'>('options');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [countdown, setCountdown] = useState(0);
    const [sending, setSending] = useState(false);
    const [loggingIn, setLoggingIn] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const googleButtonRef = useRef<HTMLDivElement>(null);
    const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

    useEffect(() => {
        if (!googleClientId || step !== 'options') return;

        const renderButton = () => {
            if (!window.google || !googleButtonRef.current) return;
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: async ({ credential }) => {
                    if (!credential) return;
                    setErrorMsg('');
                    setLoggingIn(true);
                    try {
                        await onGoogleLogin(credential);
                    } catch (err: unknown) {
                        setErrorMsg(err instanceof Error ? err.message : 'Google login failed');
                    } finally {
                        setLoggingIn(false);
                    }
                }
            });
            googleButtonRef.current.replaceChildren();
            window.google.accounts.id.renderButton(googleButtonRef.current, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'continue_with',
                shape: 'pill',
                width: Math.min(320, googleButtonRef.current.clientWidth || 320),
                locale: lang === 'zh' ? 'zh_CN' : 'en'
            });
        };

        if (window.google) {
            renderButton();
            return;
        }

        let script = document.querySelector<HTMLScriptElement>('script[data-google-identity]');
        if (!script) {
            script = document.createElement('script');
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.dataset.googleIdentity = 'true';
            document.head.appendChild(script);
        }
        script.addEventListener('load', renderButton);
        return () => script?.removeEventListener('load', renderButton);
    }, [googleClientId, lang, onGoogleLogin, step]);

    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;
        if (countdown > 0) {
            timer = setTimeout(() => setCountdown(countdown - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [countdown]);

    const handleSendOtp = async () => {
        if (!email.includes('@')) {
            setErrorMsg('Invalid email address');
            return;
        }
        setErrorMsg('');
        setSending(true);
        try {
            await axios.post('/api/v1/auth/send-otp', { email });
            setCountdown(60);
        } catch (err: any) {
            setErrorMsg(err.response?.data?.msg || 'Failed to send OTP');
        } finally {
            setSending(false);
        }
    };

    const handleLoginSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg('');
        setLoggingIn(true);
        try {
            await onLogin(email, otp);
        } catch (err: any) {
            setErrorMsg(err.message || 'Login failed');
        } finally {
            setLoggingIn(false);
        }
    };

    const handlePurchase = async (type: 'basic' | 'pro') => {
        setLoggingIn(true);
        try {
            const url = type === 'basic' ? await onPurchaseBasic() : await onPurchasePro();
            if (url) {
                setQrCodeUrl(url);
                setStep('qrcode');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoggingIn(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative paywall-glass w-full max-w-sm rounded-3xl p-8 shadow-2xl animate-[fadeIn_0.3s_ease-out]">

                {/* Header Icon */}
                <div className="flex justify-center mb-6">
                    <div className="p-4 rounded-full bg-indigo-500/20 border-2 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                        <Award className="w-12 h-12 text-indigo-400" />
                    </div>
                </div>

                <h2 className="text-2xl font-black text-center text-white tracking-wide mb-2">
                    {t.title}
                </h2>
                <p className="text-center text-white/80 text-sm mb-8">
                    {t.subtitle}
                </p>

                <div className="space-y-4">
                    {step === 'options' ? (
                        <>
                            {/* US2: Login Incentive */}
                            <button
                                onClick={() => setStep('email')}
                                className="w-full relative group overflow-hidden rounded-2xl p-[1px] transition-transform hover:scale-[1.02]"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-purple-600 rounded-2xl opacity-80" />
                                <div className="relative flex items-center p-4 bg-white/10 rounded-[15px] hover:bg-white/20 transition-colors">
                                    <div className="p-2 bg-white/20 rounded-full shrink-0">
                                        <Award className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="ml-4 text-left flex-1">
                                        <div className="font-bold text-white text-lg">{t.loginTitle}</div>
                                        <div className="text-white/80 text-sm">{t.loginSub}</div>
                                    </div>
                                </div>
                            </button>

                            {googleClientId && (
                                <>
                                    <div className="flex items-center gap-3 text-white/40 text-xs">
                                        <div className="h-px flex-1 bg-white/10" />
                                        <span>{lang === 'zh' ? '或' : 'OR'}</span>
                                        <div className="h-px flex-1 bg-white/10" />
                                    </div>
                                    <div ref={googleButtonRef} className="flex min-h-10 justify-center" />
                                </>
                            )}

                            {errorMsg && <div className="text-rose-400 text-sm text-center font-medium bg-rose-500/10 py-2 rounded-lg">{errorMsg}</div>}

                            {/* US3: Basic Recharge */}
                            <button
                                onClick={() => handlePurchase('basic')}
                                disabled={loggingIn}
                                className="w-full relative group overflow-hidden rounded-2xl p-[1px] transition-transform hover:scale-[1.02] disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl opacity-80" />
                                <div className="relative flex items-center p-4 bg-white/10 rounded-[15px] hover:bg-white/20 transition-colors">
                                    <div className="p-2 bg-white/20 rounded-full shrink-0">
                                        <Zap className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="ml-4 text-left flex-1">
                                        <div className="font-bold text-white text-lg">{t.basicTitle}</div>
                                        <div className="text-white/80 text-sm">{t.basicSub}</div>
                                    </div>
                                </div>
                            </button>

                            {/* US3/US4: Subscription */}
                            <button
                                onClick={() => handlePurchase('pro')}
                                disabled={loggingIn}
                                className="w-full relative group overflow-hidden rounded-2xl p-[2px] transition-transform hover:scale-[1.02] disabled:opacity-50"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-amber-400 to-orange-500 rounded-2xl animate-pulse" />
                                <div className="relative flex items-center p-4 bg-black/40 rounded-[14px] hover:bg-black/20 transition-colors">
                                    <div className="p-2 bg-white/20 rounded-full shrink-0">
                                        <Star className="w-6 h-6 text-amber-400" />
                                    </div>
                                    <div className="ml-4 text-left flex-1">
                                        <div className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-200 text-lg">
                                            {t.proTitle}
                                        </div>
                                        <div className="text-white/80 text-sm">{t.proSub}</div>
                                    </div>
                                </div>
                            </button>

                            <div className="my-6 border-t border-white/10" />

                            {/* US5: Ad Fallback */}
                            <button
                                onClick={onWatchAd}
                                className="w-full flex justify-center items-center gap-2 py-2 text-white/70 hover:text-white transition-colors"
                            >
                                <PlayCircle className="w-4 h-4" />
                                <span className="text-sm font-medium underline decoration-white/30 decoration-dashed">
                                    {t.adText}
                                </span>
                            </button>
                        </>
                    ) : step === 'email' ? (
                        <form onSubmit={handleLoginSubmit} className="space-y-4 animate-[fadeIn_0.3s_ease-out]">
                            <div>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-white/40" />
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder={t.emailPlaceholder}
                                        className="w-full bg-black/40 border border-white/20 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-400 transition-colors"
                                    />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    required
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder={t.otpPlaceholder}
                                    className="flex-1 min-w-0 bg-black/40 border border-white/20 rounded-xl py-3 px-4 text-white text-center font-mono placeholder:text-white/30 placeholder:font-sans focus:outline-none focus:border-indigo-400 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={handleSendOtp}
                                    disabled={countdown > 0 || sending || !email}
                                    className="px-4 whitespace-nowrap shrink-0 bg-white/10 hover:bg-white/20 disabled:opacity-50 border border-white/20 rounded-xl text-white text-sm font-medium transition-colors min-w-[100px] flex items-center justify-center"
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : countdown > 0 ? `${countdown}s` : t.sendCode}
                                </button>
                            </div>

                            {errorMsg && <div className="text-rose-400 text-sm text-center font-medium bg-rose-500/10 py-2 rounded-lg">{errorMsg}</div>}

                            <button
                                type="submit"
                                disabled={loggingIn || otp.length < 6}
                                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                            >
                                {loggingIn ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{t.loginBtn} <ArrowRight className="w-5 h-5" /></>}
                            </button>

                            <button
                                type="button"
                                onClick={() => { setStep('options'); setErrorMsg(''); }}
                                className="w-full py-2 text-white/50 hover:text-white text-sm transition-colors"
                            >
                                ← Back
                            </button>
                        </form>
                    ) : (
                        <div className="flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
                            <div className="bg-white p-4 rounded-2xl shadow-xl mb-4 relative overflow-hidden group">
                                <QRCodeSVG value={qrCodeUrl} size={180} level="H" />
                                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center">
                                    <QrCode className="w-8 h-8 text-[#07C160] mb-2" />
                                    <p className="text-[#07C160] font-bold text-sm">WeChat Pay</p>
                                </div>
                            </div>
                            <h3 className="text-white font-bold text-lg mb-1">{t.scanToPay}</h3>
                            <p className="text-white/60 text-sm text-center mb-6">{t.useWechat}</p>

                            <div className="flex items-center gap-2 text-indigo-300 bg-indigo-500/10 px-4 py-2 rounded-full mb-6">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span className="text-sm font-medium">Waiting for payment...</span>
                            </div>

                            <button
                                type="button"
                                onClick={() => { setStep('options'); setQrCodeUrl(''); }}
                                className="w-full py-2 text-white/50 hover:text-white text-sm transition-colors"
                            >
                                ← Cancel Payment
                            </button>
                        </div>
                    )}
                </div>

                {/* Dismiss */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-white/50 hover:text-white p-2 transition-colors"
                >
                    <X className="w-6 h-6" />
                </button>

            </div>
        </div>
    );
};
