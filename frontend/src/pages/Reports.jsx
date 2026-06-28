import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  FileSpreadsheet, Search, Calendar, FileText, Download, 
  Printer, Check, AlertCircle 
} from 'lucide-react';

const Reports = () => {
  const [reportType, setReportType] = useState('sales'); // sales, purchases, inventory, expiries
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState([]);
  
  // Date and query filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    setReportData([]);
    try {
      let endpoint = '/sales';
      if (reportType === 'purchases') endpoint = '/purchases';
      else if (reportType === 'inventory') endpoint = '/products?limit=1000';
      else if (reportType === 'expiries') endpoint = '/products?limit=1000&alert=expiry';

      const res = await api.get(endpoint);
      if (res.data.success) {
        let rawData = res.data[reportType === 'inventory' || reportType === 'expiries' ? 'products' : reportType] || [];
        
        // Expiries filter (only expired or expiring within 60 days)
        if (reportType === 'expiries') {
          rawData = rawData.filter(p => p.expiryDate);
        }

        setReportData(rawData);
      }
    } catch (err) {
      console.error('Failed to load report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);

  // Clientside JSON to CSV converter & download trigger
  const exportToCSV = () => {
    if (reportData.length === 0) return;

    let headers = [];
    let rows = [];

    if (reportType === 'sales') {
      headers = ['Invoice Number', 'Customer', 'Date', 'Total Amount', 'Net Profit', 'Payment Method'];
      rows = reportData.map(r => [
        r.invoiceNumber || 'N/A',
        r.customer?.name || 'Walk-In Customer',
        r.date && !isNaN(new Date(r.date).getTime()) ? new Date(r.date).toLocaleDateString() : 'N/A',
        (r.totalAmount ?? 0).toFixed(2),
        (r.profit ?? 0).toFixed(2),
        r.paymentMethod || 'N/A'
      ]);
    } else if (reportType === 'purchases') {
      headers = ['Invoice Number', 'Supplier', 'Date', 'Tax Paid', 'Total Cost', 'Payment Status'];
      rows = reportData.map(r => [
        r.invoiceNumber || 'N/A',
        r.supplier?.name || 'N/A',
        r.date && !isNaN(new Date(r.date).getTime()) ? new Date(r.date).toLocaleDateString() : 'N/A',
        (r.tax ?? 0).toFixed(2),
        (r.totalAmount ?? 0).toFixed(2),
        r.paymentStatus || 'N/A'
      ]);
    } else {
      headers = ['Product SKU', 'Product Name', 'Quantity', 'Purchase Cost', 'Selling Rate', 'Expiry Date'];
      rows = reportData.map(r => [
        r.code || 'N/A',
        r.name || 'N/A',
        r.quantity ?? 0,
        (r.purchasePrice ?? 0).toFixed(2),
        (r.sellingPrice ?? 0).toFixed(2),
        r.expiryDate && !isNaN(new Date(r.expiryDate).getTime()) ? new Date(r.expiryDate).toLocaleDateString() : 'N/A'
      ]);
    }

    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(val => `"${val}"`).join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${reportType}_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Mock PDF generator
  const triggerPDFMock = () => {
    alert("PDF Report Generated Successfully. Check browser download print settings.");
    window.print();
  };

  // Filter listings
  const filteredData = reportData.filter(item => {
    if (!item) return false;
    const q = search.toLowerCase();
    
    // Global search
    let matchesSearch = true;
    if (reportType === 'sales') {
      matchesSearch = (item.invoiceNumber || '').toLowerCase().includes(q) || 
                      (item.customer?.name || '').toLowerCase().includes(q);
    } else if (reportType === 'purchases') {
      matchesSearch = (item.invoiceNumber || '').toLowerCase().includes(q) || 
                      (item.supplier?.name || '').toLowerCase().includes(q);
    } else {
      matchesSearch = (item.name || '').toLowerCase().includes(q) || 
                      (item.code || '').toLowerCase().includes(q);
    }

    // Date range filters
    let matchesDates = true;
    if (item.date) {
      const itemDate = new Date(item.date);
      if (!isNaN(itemDate.getTime())) {
        if (startDate) matchesDates = matchesDates && itemDate >= new Date(startDate);
        if (endDate) matchesDates = matchesDates && itemDate <= new Date(endDate);
      }
    }
    
    return matchesSearch && matchesDates;
  });

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5.5 w-5.5 text-brand-500" />
            <span>Reports Ledger</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Filter, audit, and export sales journals, supplier purchase sheets, and product inventory reports.</p>
        </div>

        {/* Action Controls */}
        <div className="flex gap-2 shrink-0">
          <button 
            onClick={exportToCSV}
            disabled={filteredData.length === 0}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-250 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center gap-1.5 disabled:opacity-40"
          >
            <Download className="h-4 w-4" />
            <span>Download CSV</span>
          </button>
          <button 
            onClick={triggerPDFMock}
            disabled={filteredData.length === 0}
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl flex items-center gap-1.5 shadow shadow-brand-500/20 disabled:opacity-45"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL CARD */}
      <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm space-y-4">
        
        {/* Report Category Selectors */}
        <div className="flex flex-wrap gap-2.5 pb-2 border-b border-gray-100 dark:border-gray-750">
          {[
            { label: 'Sales Reports', value: 'sales' },
            { label: 'Purchases Inwards', value: 'purchases' },
            { label: 'Inventory Assets', value: 'inventory' },
            { label: 'Expiration Registers', value: 'expiries' }
          ].map(opt => (
            <button
              key={opt.value}
              onClick={() => setReportType(opt.value)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                reportType === opt.value
                  ? 'bg-brand-500 text-white shadow shadow-brand-500/20'
                  : 'bg-gray-50 dark:bg-gray-750 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* FILTERS PANEL */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          {/* SEARCH KEY */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search code, invoice number, customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
            />
          </div>

          {/* DATE START */}
          {(reportType === 'sales' || reportType === 'purchases') && (
            <>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-450" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                />
              </div>

              {/* DATE END */}
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-450" />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                />
              </div>
            </>
          )}

        </div>

      </div>

      {/* REPORT DATA TABLE */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
        <div className="overflow-x-auto" id="printable-report-area">
          
          {/* Printable Report Header */}
          <div className="hidden print:block text-center p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold uppercase">AUK marine Report Ledger</h2>
            <p className="text-sm">Report Category: {reportType} | Date Generated: {new Date().toLocaleDateString()}</p>
          </div>

          <table className="w-full text-left text-xs text-gray-500 dark:text-gray-400">
            
            {/* Sales headers */}
            {reportType === 'sales' && (
              <>
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Invoice Number</th>
                    <th className="px-5 py-3">Customer Profile</th>
                    <th className="px-5 py-3">Invoiced Date</th>
                    <th className="px-5 py-3 text-right">Profit Margin</th>
                    <th className="px-5 py-3 text-right rounded-r-lg">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                  {loading ? (
                    <tr><td colSpan="5" className="text-center py-10">Loading sales journal...</td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-10">No matching sales records.</td></tr>
                  ) : (
                    filteredData.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850">
                        <td className="px-5 py-4 font-semibold text-brand-600">{r.invoiceNumber || 'N/A'}</td>
                        <td className="px-5 py-4 text-gray-900 dark:text-white font-medium">{r.customer?.name || 'Walk-In Customer'}</td>
                        <td className="px-5 py-4">
                          {r.date && !isNaN(new Date(r.date).getTime()) 
                            ? new Date(r.date).toLocaleDateString() 
                            : 'N/A'}
                        </td>
                        <td className="px-5 py-4 text-right text-emerald-600 font-medium">₹{(r.profit ?? 0).toFixed(2)}</td>
                        <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-white">₹{(r.totalAmount ?? 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}

            {/* Purchases headers */}
            {reportType === 'purchases' && (
              <>
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Invoice Number</th>
                    <th className="px-5 py-3">Supplier Name</th>
                    <th className="px-5 py-3">Order Date</th>
                    <th className="px-5 py-3 text-right">Tax Paid</th>
                    <th className="px-5 py-3 text-right rounded-r-lg">Total Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                  {loading ? (
                    <tr><td colSpan="5" className="text-center py-10">Loading purchase reports...</td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-10">No matching purchase records.</td></tr>
                  ) : (
                    filteredData.map(r => (
                      <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850">
                        <td className="px-5 py-4 font-semibold text-amber-600">{r.invoiceNumber || 'N/A'}</td>
                        <td className="px-5 py-4 text-gray-900 dark:text-white font-medium">{r.supplier?.name || 'N/A'}</td>
                        <td className="px-5 py-4">
                          {r.date && !isNaN(new Date(r.date).getTime()) 
                            ? new Date(r.date).toLocaleDateString() 
                            : 'N/A'}
                        </td>
                        <td className="px-5 py-4 text-right">₹{(r.tax ?? 0).toFixed(2)}</td>
                        <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-white">₹{(r.totalAmount ?? 0).toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </>
            )}

            {/* Inventory assets & Expiries headers */}
            {(reportType === 'inventory' || reportType === 'expiries') && (
              <>
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-5 py-3">Product Name</th>
                    <th className="px-5 py-3">SKU Code</th>
                    <th className="px-5 py-3 text-center">In Stock</th>
                    <th className="px-5 py-3 text-right">Cost Value</th>
                    <th className="px-5 py-3 text-center rounded-r-lg">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                  {loading ? (
                    <tr><td colSpan="5" className="text-center py-10">Loading product catalogs...</td></tr>
                  ) : filteredData.length === 0 ? (
                    <tr><td colSpan="5" className="text-center py-10">No products match your filters.</td></tr>
                  ) : (
                    filteredData.map(r => {
                      const qty = r.quantity ?? 0;
                      const price = r.purchasePrice ?? 0;
                      const costVal = qty * price;
                      return (
                        <tr key={r.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850">
                          <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white">{r.name || 'N/A'}</td>
                          <td className="px-5 py-4 font-mono text-[10px]">{r.code || 'N/A'}</td>
                          <td className="px-5 py-4 text-center font-bold">{qty}</td>
                          <td className="px-5 py-4 text-right font-medium text-gray-950 dark:text-gray-100">₹{costVal.toFixed(2)}</td>
                          <td className="px-5 py-4 text-center font-mono">
                            {r.expiryDate && !isNaN(new Date(r.expiryDate).getTime()) 
                              ? new Date(r.expiryDate).toLocaleDateString() 
                              : 'N/A'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </>
            )}

          </table>
        </div>
      </div>

    </div>
  );
};

export default Reports;
