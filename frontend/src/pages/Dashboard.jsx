import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import api from '../services/api';
import { 
  IndianRupee, Package, AlertTriangle, CalendarRange, TrendingUp, 
  Users, ShoppingBag, ArrowUpRight, ArrowDownRight, RefreshCw 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

const COLORS = ['#0ea0ea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const { refreshNotifications } = useNotifications();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [chartsData, setChartsData] = useState({ monthly: [], categories: [], topProducts: [] });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Fetch main dashboard metrics
      const statsRes = await api.get('/analytics/dashboard');
      if (statsRes.data.success) {
        setStats(statsRes.data.stats);
      }

      // 2. Fetch full analytics for graphs if Owner/Manager
      if (hasRole(['Owner', 'Manager'])) {
        const fullAnalyticsRes = await api.get('/analytics/full');
        if (fullAnalyticsRes.data.success) {
          const data = fullAnalyticsRes.data.analytics;
          setChartsData({
            monthly: data.salesHistoryMonthly || [],
            categories: data.categorySales || [],
            topProducts: data.productProfits || []
          });
        }
      }
    } catch (error) {
      console.error('Failed to load dashboard statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    refreshNotifications();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Loading live business overview...</p>
        </div>
      </div>
    );
  }

  const isRestricted = !hasRole(['Owner', 'Manager']); // Staff sees limited indicators

  return (
    <div className="space-y-6">
      
      {/* HEADER BANNER */}
      <div className="flex justify-between items-center glass-card p-6 rounded-2xl">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Welcome back, {user?.name}!</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Here is a quick overview of your marine supply operations today.</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors flex items-center gap-2 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5 text-gray-450" />
          <span className="hidden sm:inline">Refresh Data</span>
        </button>
      </div>

      {/* STATS CARD GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* TODAY SALES CARD */}
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4 hover-lift">
          <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-500 flex items-center justify-center shrink-0">
            <IndianRupee className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-450 dark:text-gray-400 uppercase tracking-wider">Today's Sales</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {formatCurrency(stats?.todaySales || 0)}
            </h3>
          </div>
        </div>

        {/* TODAY PROFIT CARD */}
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4 hover-lift">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center shrink-0">
            <TrendingUp className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-450 dark:text-gray-400 uppercase tracking-wider">Today's Profit</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {isRestricted ? '🔒 Restricted' : formatCurrency(stats?.todayProfit || 0)}
            </h3>
          </div>
        </div>

        {/* MONTHLY SALES CARD */}
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4 hover-lift">
          <div className="w-12 h-12 rounded-xl bg-brand-50 dark:bg-brand-950/20 text-brand-500 flex items-center justify-center shrink-0">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-450 dark:text-gray-400 uppercase tracking-wider">Monthly Sales</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {formatCurrency(stats?.monthlySales || 0)}
            </h3>
          </div>
        </div>

        {/* STOCK VALUATION CARD */}
        <div className="glass-card p-5 rounded-2xl flex items-center gap-4 hover-lift">
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-500 flex items-center justify-center shrink-0">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-450 dark:text-gray-400 uppercase tracking-wider">Stock Valuation</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {isRestricted ? '🔒 Restricted' : formatCurrency(stats?.currentInventoryValue || 0)}
            </h3>
          </div>
        </div>

      </div>

      {/* ALERT STRIP GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* LOW STOCK ALERT */}
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl text-center">
          <p className="text-[10px] uppercase font-bold tracking-wider text-amber-600 dark:text-amber-400">Low Stock Items</p>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 mt-1">{stats?.alerts?.lowStock || 0}</p>
        </div>

        {/* OUT OF STOCK ALERT */}
        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
          <p className="text-[10px] uppercase font-bold tracking-wider text-red-500 dark:text-red-400">Out of Stock</p>
          <p className="text-2xl font-extrabold text-red-500 dark:text-red-400 mt-1">{stats?.alerts?.outOfStock || 0}</p>
        </div>

        {/* EXPIRED ALERT */}
        <div className="bg-red-650/15 border border-red-500/20 p-4 rounded-xl text-center">
          <p className="text-[10px] uppercase font-bold tracking-wider text-red-600 dark:text-red-400">Expired Batches</p>
          <p className="text-2xl font-extrabold text-red-600 dark:text-red-400 mt-1">{stats?.alerts?.expired || 0}</p>
        </div>

        {/* EXPIRING SOON ALERT */}
        <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl text-center">
          <p className="text-[10px] uppercase font-bold tracking-wider text-orange-600 dark:text-orange-400">Expiring &lt;30d</p>
          <p className="text-2xl font-extrabold text-orange-600 dark:text-orange-400 mt-1">{stats?.alerts?.expiringSoon || 0}</p>
        </div>

      </div>

      {/* CHARTS GRAPHICS SECTION (OWNER/MANAGER ONLY) */}
      {!isRestricted && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* AREA SALES & PROFIT HISTORY CHART */}
          <div className="glass-card p-5 rounded-2xl lg:col-span-2">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Financial Trends (Last 6 Months)</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartsData.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea0ea" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0ea0ea" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" className="dark:stroke-gray-700" />
                  <XAxis dataKey="month" stroke="#9ca3af" fontSize={10} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Area type="monotone" dataKey="sales" name="Sales Revenue" stroke="#0ea0ea" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" dataKey="profit" name="Net Profit" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PIE CHART FOR CATEGORIES */}
          <div className="glass-card p-5 rounded-2xl">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">Category Revenue Share</h3>
            <div className="h-64 flex items-center justify-center relative">
              {chartsData.categories.length === 0 ? (
                <p className="text-xs text-gray-400">No category sales recorded.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartsData.categories}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {chartsData.categories.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                    <Legend 
                      verticalAlign="bottom" 
                      layout="horizontal" 
                      iconSize={8} 
                      wrapperStyle={{ fontSize: '10px', bottom: -5 }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

        </div>
      )}

      {/* RECENT SALES AND PURCHASES TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RECENT SALES */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Sales Invoices</h3>
            <span className="text-[10px] text-brand-500 font-semibold px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-900/10">POS Sales</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-2.5 rounded-l-lg">Invoice</th>
                  <th className="px-4 py-2.5">Customer</th>
                  <th className="px-4 py-2.5">Total</th>
                  <th className="px-4 py-2.5 rounded-r-lg">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                {stats?.recentSales?.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="text-center py-6 text-gray-400">No sale records available.</td>
                  </tr>
                ) : (
                  stats?.recentSales?.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850 transition-colors">
                      <td className="px-4 py-3 font-semibold text-brand-600 dark:text-brand-400">{sale.invoiceNumber}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{sale.customer?.name || 'Walk-In Customer'}</td>
                      <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{formatCurrency(sale.totalAmount)}</td>
                      <td className="px-4 py-3 text-gray-400">{new Date(sale.date).toLocaleDateString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RECENT PURCHASES (REVIEWS PERMISSIONS MAPPING) */}
        <div className="glass-card p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Recent Inward Purchases</h3>
            <span className="text-[10px] text-amber-500 font-semibold px-2 py-0.5 rounded bg-amber-50 dark:bg-amber-900/10">Stock In</span>
          </div>
          <div className="overflow-x-auto">
            {isRestricted ? (
              <div className="h-32 flex items-center justify-center text-xs text-gray-400">
                🔒 Access restricted. Purchases history is only visible to Managers and Owners.
              </div>
            ) : (
              <table className="w-full text-left text-xs text-gray-500 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-4 py-2.5 rounded-l-lg">Invoice</th>
                    <th className="px-4 py-2.5">Supplier</th>
                    <th className="px-4 py-2.5">Total Cost</th>
                    <th className="px-4 py-2.5 rounded-r-lg">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                  {stats?.recentPurchases?.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-6 text-gray-400">No purchases entered yet.</td>
                    </tr>
                  ) : (
                    stats?.recentPurchases?.map((pur) => (
                      <tr key={pur.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850 transition-colors">
                        <td className="px-4 py-3 font-semibold text-amber-600 dark:text-amber-400">{pur.invoiceNumber}</td>
                        <td className="px-4 py-3 text-gray-900 dark:text-white">{pur.supplier?.name}</td>
                        <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">{formatCurrency(pur.totalAmount)}</td>
                        <td className="px-4 py-3 text-gray-400">{new Date(pur.date).toLocaleDateString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Dashboard;
