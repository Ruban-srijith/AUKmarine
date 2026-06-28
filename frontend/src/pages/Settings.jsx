import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Settings, Save, Landmark, Globe, FileText, 
  RefreshCw, Check, AlertCircle 
} from 'lucide-react';

const SettingsPage = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [taxRate, setTaxRate] = useState(18);
  const [invoiceTemplate, setInvoiceTemplate] = useState('Standard');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get('/settings');
      if (res.data.success && res.data.settings) {
        const s = res.data.settings;
        setCompanyName(s.companyName || '');
        setLogoUrl(s.logoUrl || '');
        setGstNumber(s.gstNumber || '');
        setAddress(s.address || '');
        setEmail(s.email || '');
        setPhone(s.phone || '');
        setCurrency(s.currency || 'USD');
        setTaxRate(s.taxRate || 18);
        setInvoiceTemplate(s.invoiceTemplate || 'Standard');
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess(false);
    setErrorMsg('');

    const payload = {
      companyName,
      logoUrl,
      gstNumber,
      address,
      email,
      phone,
      currency,
      taxRate: parseFloat(taxRate),
      invoiceTemplate
    };

    try {
      const res = await api.put('/settings', payload);
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 2000);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div>
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">Loading system settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-2">
        <Settings className="h-5.5 w-5.5 text-brand-500 animate-spin-slow" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Company Configuration</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Define invoice print headers, default tax codes, currencies, and shop parameters.</p>
        </div>
      </div>

      {/* SETTINGS CARD CONTAINER */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm p-6 max-w-3xl">
        <form onSubmit={handleSaveSettings} className="space-y-6">
          
          {/* Messages */}
          {success && (
            <div className="p-3.5 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 text-xs rounded-xl flex items-center gap-2">
              <Check className="h-4.5 w-4.5" />
              <span>Configurations updated and saved successfully!</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-650 dark:text-red-400 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="h-4.5 w-4.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form groups */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            {/* COMPANY NAME */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Company Legal Name *</label>
              <input 
                type="text" 
                required 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)} 
                className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white font-semibold"
              />
            </div>

            {/* GST NUMBER */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">GSTIN / TAX Code</label>
              <input 
                type="text" 
                value={gstNumber} 
                onChange={(e) => setGstNumber(e.target.value)} 
                className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                placeholder="27AAAAA1111A1Z1"
              />
            </div>

            {/* LOGO */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Logo URL (Optional)</label>
              <input 
                type="text" 
                value={logoUrl} 
                onChange={(e) => setLogoUrl(e.target.value)} 
                className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                placeholder="https://..."
              />
            </div>

            {/* PHONE */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact Phone</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Contact Email</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
              />
            </div>

            {/* ADDRESS */}
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Store / Warehouse Address</label>
              <textarea 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                rows="2" 
                className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white resize-none"
              />
            </div>

            {/* CURRENCY */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Base Currency</label>
              <select 
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)} 
                className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white font-semibold"
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </select>
            </div>

            {/* BASE TAX */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Default GST Tax %</label>
              <input 
                type="number" 
                value={taxRate} 
                onChange={(e) => setTaxRate(e.target.value)} 
                className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
              />
            </div>

            {/* INVOICE TEMPLATE */}
            <div>
              <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">POS Print Template</label>
              <select 
                value={invoiceTemplate} 
                onChange={(e) => setInvoiceTemplate(e.target.value)} 
                className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
              >
                <option value="Standard">Standard Invoice Receipt</option>
                <option value="Thermal">Thermal 80mm Roll</option>
                <option value="Simple">Minimal Bill Draft</option>
              </select>
            </div>

          </div>

          {/* SAVE BUTTON */}
          <div className="pt-4 border-t border-gray-150 dark:border-gray-700 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-brand-500/20 flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save Configurations'}</span>
            </button>
          </div>

        </form>
      </div>

    </div>
  );
};

export default SettingsPage;
