import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users, CreditCard, Activity, AlertTriangle,
  TrendingUp, Activity as ActivityIcon, BadgeCheck, Lock, LogOut
} from 'lucide-react';

// Configure Axios defaults
axios.defaults.baseURL = '/';

// ==========================================
// API & Types
// ==========================================
interface AdminStats {
  metrics: {
    total_users: number;
    total_revenue_cny: number;
    total_scans: number;
    fake_scans_ratio: number;
  };
  recent_users: Array<{
    id: string;
    display_name: string;
    created_at: string;
    auth_provider: string;
  }>;
  recent_orders: Array<{
    order_no: string;
    amount_cents: number;
    package_type: string;
    paid_at: string;
    user: { display_name: string };
  }>;
}

// ==========================================
// Login Page Component
// ==========================================
const LoginPage = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [shaking, setShaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await axios.post('/api/v1/admin/login', { password });
      if (res.data.data?.token) {
        localStorage.setItem('admin_token', res.data.data.token);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.msg || '密码错误或已被限制请求');
      setShaking(true);
      setTimeout(() => setShaking(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="mb-8 flex items-center gap-3">
        <div className="p-3 bg-indigo-500 rounded-xl shadow-[0_0_30px_rgba(99,102,241,0.5)]">
          <Activity className="text-white w-8 h-8" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-tight">AI Spy <span className="text-indigo-400">管理后台</span></h1>
      </div>

      <div className={`w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-3xl shadow-2xl ${shaking ? 'animate-shake' : ''}`}>
        <h2 className="text-xl font-bold text-white mb-6 text-center">受限访问：内部管控系统</h2>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                required
                className="block w-full pl-11 pr-3 py-4 border border-slate-600 bg-slate-800/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                placeholder="请输入安全管理口令"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="mt-2 text-sm text-rose-400 font-medium">{error}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 border border-transparent rounded-xl shadow-sm text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-all font-sans"
          >
            {loading ? '身份校验中...' : '安全授权登录'}
          </button>
        </form>
      </div>
    </div>
  );
};


// ==========================================
// Dashboard Component
// ==========================================
const Dashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Axios interceptor to catch 401s globally within Dashboard
  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('admin_token');
          navigate('/login');
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [navigate]);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('admin_token');
      if (!token) {
        navigate('/login');
        return;
      }

      const res = await axios.get('/api/v1/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // 30s Auto Refresh
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  if (loading || !stats) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <ActivityIcon className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-slate-500 font-medium animate-pulse">正在从远端机房同步全局平台数据...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans p-4 md:p-8">

      <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <div className="p-2 bg-indigo-600 rounded-lg shadow-lg shadow-indigo-600/30">
              <Activity className="text-white w-6 h-6" />
            </div>
            AI Spy <span className="text-indigo-600">管理后台</span>
          </h1>
          <p className="text-slate-500 mt-2 font-medium">业务全景监控面板实时刷新指标 (秒级延迟)</p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 rounded-lg shadow-sm font-semibold transition-all"
        >
          <LogOut className="w-4 h-4" />
          注销登录
        </button>
      </header>

      {/* Top Level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-500">
            <Users className="w-24 h-24 text-blue-600" />
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">全局注册用户</p>
              <h3 className="text-4xl font-black text-slate-800">{stats.metrics.total_users.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600">
              <Users className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 flex items-center text-emerald-600 text-xs font-semibold relative z-10">
            <TrendingUp className="w-4 h-4 mr-1" />
            <span className="animate-pulse">持续刷新追踪</span>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-500">
            <CreditCard className="w-24 h-24 text-emerald-600" />
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">历史流水沉淀 (人民币)</p>
              <h3 className="text-4xl font-black text-slate-800">¥{stats.metrics.total_revenue_cny.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
            </div>
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
              <CreditCard className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-500">
            <ActivityIcon className="w-24 h-24 text-indigo-600" />
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">总计完成分析检测服务</p>
              <h3 className="text-4xl font-black text-slate-800">{stats.metrics.total_scans.toLocaleString()}</h3>
            </div>
            <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
              <ActivityIcon className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 relative overflow-hidden group hover:shadow-xl transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-150 transition-transform duration-500">
            <AlertTriangle className="w-24 h-24 text-rose-600" />
          </div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">图片被拦截鉴定为 AI 的占比</p>
              <h3 className="text-4xl font-black text-rose-600">{(stats.metrics.fake_scans_ratio * 100).toFixed(1)}%</h3>
            </div>
            <div className="p-3 bg-rose-100 rounded-xl text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-200 rounded-full h-2">
            <div className="bg-gradient-to-r from-rose-400 to-rose-600 h-2 rounded-full transition-all duration-1000" style={{ width: `${stats.metrics.fake_scans_ratio * 100}%` }}></div>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Recent Users */}
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col border border-slate-200">
          <div className="p-5 border-b border-slate-200/60 bg-white/60">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-500" />
              近线新增注册客流
            </h3>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">客户昵称属性</th>
                  <th className="px-5 py-3">授权来源分类</th>
                  <th className="px-5 py-3">并入中心库时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/40">
                {stats.recent_users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-800 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-xs shadow-sm">
                          {u.display_name.charAt(0)}
                        </div>
                        {u.display_name}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded-full border border-slate-200 shadow-sm">
                        {u.auth_provider === 'WECHAT' ? '💬 微信直登' : u.auth_provider === 'GMAIL' ? '📧 谷歌账户' : u.auth_provider}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-500 shrink-0">
                      {new Date(u.created_at).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.recent_users.length === 0 && (
              <div className="p-10 text-center text-slate-400 font-medium">暂时没有捕获到新的注册玩家动向。</div>
            )}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="glass-card rounded-2xl overflow-hidden flex flex-col border border-slate-200">
          <div className="p-5 border-b border-slate-200/60 bg-white/60">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <BadgeCheck className="w-5 h-5 text-emerald-500" />
              平台最新成功付款订单队列
            </h3>
          </div>
          <div className="p-0 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                  <th className="px-5 py-3">消费详情</th>
                  <th className="px-5 py-3">消费者标识</th>
                  <th className="px-5 py-3">收益净额</th>
                  <th className="px-5 py-3">结单快照时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white/40">
                {stats.recent_orders.map(o => (
                  <tr key={o.order_no} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-4 font-mono text-xs text-slate-500 flex flex-col gap-1">
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 font-bold rounded-[4px] w-fit">
                        {o.package_type === 'BASIC_10' ? "💳 基础小食包 (充10次)" : o.package_type === 'PRO_50' ? "🚀 专业不限次月卡" : o.package_type}
                      </span>
                      <span className="truncate w-24 text-[10px]" title={o.order_no}>{o.order_no.split('-')[0]}...</span>
                    </td>
                    <td className="px-5 py-4 text-sm font-bold text-slate-700">
                      {o.user.display_name}
                    </td>
                    <td className="px-5 py-4 font-black text-emerald-600">
                      ¥{(o.amount_cents / 100).toFixed(2)}
                    </td>
                    <td className="px-5 py-4 text-xs font-medium text-slate-500">
                      {new Date(o.paid_at).toLocaleString('zh-CN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.recent_orders.length === 0 && (
              <div className="p-10 text-center text-slate-400 font-medium">暂时没有新的客户结单动作。</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};


// ==========================================
// Main App Router
// ==========================================
function App() {
  return (
    <Router basename="/admin">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Dashboard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
