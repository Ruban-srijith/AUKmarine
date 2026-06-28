import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  BarChart3, TrendingUp, IndianRupee, Ban, RefreshCw, 
  ArrowUpRight, ArrowDownRight, PackageCheck 
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

const COLORS = ['#0ea0ea', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/full');
      if (res.data.success) {
        setData(res.data.analytics);
      }
    } catch (err) {
      console.error('Failed to fetch full analytics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Performing math calculations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between items-center bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm animate-fade-in">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-5.5 w-5.5 text-brand-500" />
            <span>Stock & Profit Analytics</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Deep analysis of stock turn rate, dead stocks, profit margins, and sales velocity.</p>
        </div>
        <button 
          onClick={fetchAnalytics}
          className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center gap-1.5 text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Recalculate</span>
        </button>
      </div>

      {/* METRIC CARD BAR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        
        {/* DEAD STOCK VALUE */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center gap-4 hover-lift">
          <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center shrink-0">
            <Ban className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-450 dark:text-gray-400 uppercase tracking-wider">Dead Stock Value (90 Days)</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              {formatCurrency(data?.deadStockValue || 0)}
            </h3>
            <span className="block text-[10px] text-gray-400 mt-1">Stock with 0 sales in the last 3 months</span>
          </div>
        </div>

        {/* MOCK TURNOVER RATIO */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center gap-4 hover-lift">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-500 flex items-center justify-center shrink-0">
            <PackageCheck className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-450 dark:text-gray-400 uppercase tracking-wider">Inventory Turnover Ratio</p>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">
              3.4x
            </h3>
            <span className="block text-[10px] text-gray-400 mt-1">Industry standard: 4.0x - 6.0x</span>
          </div>
        </div>

      </div>

      {/* VELOCITY LISTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* FAST MOVING */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-750">
            <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-white flex items-center gap-1">
              <span className="text-emerald-500">🔥</span> Fast Moving Products
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-600 dark:bg-emerald-900/10 px-2 py-0.5 rounded font-bold">&gt; 10 units sold</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-750">
            {data?.fastMoving?.length === 0 ? (
              <p className="text-center py-6 text-xs text-gray-400">No fast moving products recorded.</p>
            ) : (
              data?.fastMoving?.map(p => (
                <div key={p.id} className="py-2.5 flex justify-between text-xs items-center">
                  <div>
                    <span className="font-bold text-gray-850 dark:text-gray-250 block">{p.name}</span>
                    <span className="text-[9px] text-gray-400 font-mono">SKU: {p.code}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{p.sales} units sold</span>
                    <span className="block text-[9px] text-gray-400">Qty in stock: {p.quantity}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* SLOW MOVING / DEAD STOCK */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-750">
            <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-white flex items-center gap-1">
              <span className="text-red-500">❄️</span> Slow Moving / Dead Stocks
            </h3>
            <span className="text-[10px] bg-red-50 text-red-500 dark:bg-red-900/10 px-2 py-0.5 rounded font-bold">Unsold 90d</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-750">
            {data?.slowMoving?.length === 0 ? (
              <p className="text-center py-6 text-xs text-gray-400">No slow moving products recorded.</p>
            ) : (
              data?.slowMoving?.map(p => (
                <div key={p.id} className="py-2.5 flex justify-between text-xs items-center">
                  <div>
                    <span className="font-bold text-gray-850 dark:text-gray-250 block">{p.name}</span>
                    <span className="text-[9px] text-gray-400 font-mono">SKU: {p.code}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-amber-500">{p.sales} sold</span>
                    <span className="block text-[9px] text-gray-400">Qty in stock: {p.quantity}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* ADDITIONAL VISUAL CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PRODUCT PROFITABILITY */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
          <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-white mb-4">Top 10 Product Profitability</h3>
          <div className="h-64">
            {data?.productProfits?.length === 0 ? (
              <p className="text-center py-12 text-gray-400 text-xs">No sales recorded to compute product profits.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.productProfits} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" className="dark:stroke-gray-700" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={9} tickFormatter={(val) => val.substring(0, 10) + '...'} />
                  <YAxis stroke="#9ca3af" fontSize={10} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '10px' }} />
                  <Bar dataKey="revenue" name="Total Revenue" fill="#0ea0ea" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* OUTSTANDING CREDIT PROFILE COMPARISONS */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm">
          <h3 className="text-xs font-bold uppercase text-gray-900 dark:text-white mb-4">Top Customer Dues & Vendor Debts</h3>
          
          <div className="space-y-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Top Customer Outstanding Balances</span>
              <div className="space-y-1.5 text-xs">
                {data?.outstandingCustomers?.length === 0 ? (
                  <p className="text-gray-400">No outstanding customer balances.</p>
                ) : (
                  data?.outstandingCustomers?.map((c, i) => (
                    <div key={i} className="flex justify-between p-2 bg-amber-500/5 border border-amber-500/10 rounded-lg">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{c.name}</span>
                      <span className="font-extrabold text-amber-600 dark:text-amber-400">₹{c.outstandingBalance.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400 block mb-2">Top Supplier Outstanding Balances</span>
              <div className="space-y-1.5 text-xs">
                {data?.outstandingSuppliers?.length === 0 ? (
                  <p className="text-gray-400">No outstanding supplier balances.</p>
                ) : (
                  data?.outstandingSuppliers?.map((s, i) => (
                    <div key={i} className="flex justify-between p-2 bg-red-500/5 border border-red-500/10 rounded-lg">
                      <span className="font-semibold text-gray-800 dark:text-gray-200">{s.name}</span>
                      <span className="font-extrabold text-red-500 dark:text-red-400">₹{s.outstandingBalance.toFixed(2)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default Analytics;
