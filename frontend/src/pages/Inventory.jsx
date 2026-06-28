import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Package, Search, Plus, Filter, FileUp, FileDown, History, 
  Trash2, Edit, AlertTriangle, Eye, ArrowRight,
  Barcode, Check, ShieldAlert, Sparkles, Upload, X 
} from 'lucide-react';

// ── Search highlight helper ─────────────────────────────────────────────────
const Highlight = ({ text = '', query = '' }) => {
  if (!query.trim()) return <>{text}</>;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = String(text).split(new RegExp(`(${escaped})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark
            key={i}
            style={{
              background: 'rgba(245,158,11,0.30)',
              color: 'inherit',
              borderRadius: '2px',
              padding: '0 1px',
              fontWeight: 700,
            }}
          >
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const Inventory = () => {
  const { user, hasRole } = useAuth();

  // Page States
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [totalItems, setTotalItems] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Search — two-level: instant input vs debounced API query
  const [searchInput, setSearchInput]   = useState(''); // what the user is typing RIGHT NOW
  const [search, setSearch]             = useState(''); // debounced — triggers API call
  const debounceRef                     = useRef(null);

  const [selectedCat, setSelectedCat] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedAlert, setSelectedAlert] = useState(''); // low, out, expired, expiring_30

  // Modal / Drawer States
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null); // null means adding new
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
  
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  
  const [barcodeModalOpen, setBarcodeModalOpen] = useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState(null);
  
  const [scanModalOpen, setScanModalOpen] = useState(false);
  const [scanInput, setScanInput] = useState('');

  // Form Fields State
  const [formFields, setFormFields] = useState({
    name: '', code: '', barcode: '', categoryId: '', brandId: '', description: '',
    purchasePrice: 0, sellingPrice: 0, gstPercent: 18, quantity: 0, minQuantity: 5,
    supplierId: '', batchNumber: '', manufacturingDate: '', expiryDate: '', imageUrl: ''
  });

  const [formErrors, setFormErrors] = useState({});

  // Tab state for inventory vs expiry list
  const [activeTab, setActiveTab] = useState('all'); // all, expiry

  const fetchFilters = async () => {
    try {
      const [catRes, brandRes, supRes] = await Promise.all([
        api.get('/categories'),
        api.get('/brands'),
        api.get('/suppliers')
      ]);
      if (catRes.data.success) setCategories(catRes.data.categories);
      if (brandRes.data.success) setBrands(brandRes.data.brands);
      if (supRes.data.success) setSuppliers(supRes.data.suppliers);
    } catch (err) {
      console.error('Failed to load filter catalogs:', err);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products', {
        params: {
          page: currentPage,
          limit: 10,
          search,
          category: selectedCat,
          brand: selectedBrand,
          supplier: selectedSupplier,
          status: selectedStatus,
          alert: selectedAlert
        }
      });

      if (res.data.success) {
        setProducts(res.data.products);
        setTotalItems(res.data.pagination.totalItems);
        setTotalPages(res.data.pagination.totalPages);
      }
    } catch (err) {
      console.error('Failed to fetch products list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [currentPage, search, selectedCat, selectedBrand, selectedSupplier, selectedStatus, selectedAlert]);

  // ── Client-side relevance ranker (runs instantly on every keystroke) ───────
  const clientRank = (list, q) => {
    if (!q.trim()) return list;
    const ql = q.toLowerCase();
    const score = (p) => {
      const n = (p.name  || '').toLowerCase();
      const c = (p.code  || '').toLowerCase();
      const b = (p.brand?.name  || '').toLowerCase();
      const cat = (p.category?.name || '').toLowerCase();
      if (n === ql || c === ql)                   return 0; // exact
      if (n.startsWith(ql) || c.startsWith(ql))  return 1; // prefix
      if (n.includes(ql)   || c.includes(ql))    return 2; // contains name/code
      if (b.includes(ql)   || cat.includes(ql))  return 3; // brand / category
      return 4;                                             // other field
    };
    return [...list].sort((a, b) => {
      const diff = score(a) - score(b);
      return diff !== 0 ? diff : a.name.localeCompare(b.name);
    });
  };

  // Instantly re-ranked list for rendering — recomputes on every keystroke
  const displayedProducts = useMemo(
    () => clientRank(products, searchInput),
    [products, searchInput]
  );

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);          // instant → updates highlights + ranking NOW
    setCurrentPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);             // debounced → fires API after 400ms of no typing
    }, 400);
  };

  const clearFilters = () => {
    setSearchInput('');
    setSearch('');
    setSelectedCat('');
    setSelectedBrand('');
    setSelectedSupplier('');
    setSelectedStatus('');
    setSelectedAlert('');
    setCurrentPage(1);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormFields({
      name: '', code: '', barcode: '', categoryId: categories[0]?.id || '', brandId: brands[0]?.id || '', description: '',
      purchasePrice: 0, sellingPrice: 0, gstPercent: 18, quantity: 0, minQuantity: 5,
      supplierId: suppliers[0]?.id || '', batchNumber: '', manufacturingDate: '', expiryDate: '', imageUrl: ''
    });
    setFormErrors({});
    setProductModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (product) => {
    setEditingProduct(product);
    setFormFields({
      name: product.name,
      code: product.code,
      barcode: product.barcode || '',
      categoryId: product.categoryId,
      brandId: product.brandId,
      description: product.description || '',
      purchasePrice: product.purchasePrice,
      sellingPrice: product.sellingPrice,
      gstPercent: product.gstPercent,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      supplierId: product.supplierId || '',
      batchNumber: product.batchNumber || '',
      manufacturingDate: product.manufacturingDate ? product.manufacturingDate.substring(0, 10) : '',
      expiryDate: product.expiryDate ? product.expiryDate.substring(0, 10) : '',
      imageUrl: product.imageUrl || ''
    });
    setFormErrors({});
    setProductModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormFields(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const errors = {};
    if (!formFields.name) errors.name = 'Product name is required';
    if (!formFields.code) errors.code = 'Product code is required';
    if (!formFields.categoryId) errors.categoryId = 'Category is required';
    if (!formFields.brandId) errors.brandId = 'Brand is required';
    if (formFields.purchasePrice < 0) errors.purchasePrice = 'Cannot be negative';
    if (formFields.sellingPrice < 0) errors.sellingPrice = 'Cannot be negative';
    if (formFields.quantity < 0) errors.quantity = 'Cannot be negative';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (editingProduct) {
        // Edit API call
        const res = await api.put(`/products/${editingProduct.id}`, formFields);
        if (res.data.success) {
          setProductModalOpen(false);
          fetchProducts();
        }
      } else {
        // Add API call
        const res = await api.post('/products', formFields);
        if (res.data.success) {
          setProductModalOpen(false);
          fetchProducts();
        }
      }
    } catch (err) {
      console.error('Error saving product:', err);
      setFormErrors({ apiError: err.response?.data?.message || 'Error occurred.' });
    }
  };

  // Delete product (Owner only)
  const handleDeleteProduct = async (id) => {
    if (!window.confirm('Are you absolutely sure you want to delete this product? All logs and relationships will be severed.')) return;
    try {
      const res = await api.delete(`/products/${id}`);
      if (res.data.success) {
        fetchProducts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete product.');
    }
  };

  // Fetch Stock Logs
  const handleOpenHistoryDrawer = async (product) => {
    setSelectedProductForHistory(product);
    try {
      const res = await api.get(`/products/${product.id}/stock-history`);
      if (res.data.success) {
        setHistoryLogs(res.data.logs);
        setHistoryDrawerOpen(true);
      }
    } catch (err) {
      console.error('Failed to load stock movements:', err);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const res = await api.get('/products/export', {
        responseType: 'blob'
      });
      const blob = new Blob([res.data], { type: 'text/csv' });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to export CSV:', err);
      alert('Failed to export CSV file. Please make sure the server is running and you are logged in.');
    }
  };

  // Handle CSV Bulk upload
  const handleBulkUpload = async (e) => {
    e.preventDefault();
    if (!csvFile) return;

    setBulkLoading(true);
    const formData = new FormData();
    formData.append('file', csvFile);

    try {
      const res = await api.post('/products/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        alert(res.data.message);
        setBulkModalOpen(false);
        setCsvFile(null);
        fetchProducts();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Bulk upload failed.');
    } finally {
      setBulkLoading(false);
    }
  };

  // Barcode visualization drawer
  const handleOpenBarcodeModal = (product) => {
    setSelectedProductForBarcode(product);
    setBarcodeModalOpen(true);
  };

  // Scan Barcode simulation
  const handleScanSimulation = () => {
    if (!scanInput) return;
    setSearch(scanInput);
    setScanModalOpen(false);
    setScanInput('');
    setCurrentPage(1);
  };

  // Dynamic CSS Barcode generator pattern (renders dark lines of different width)
  const renderBarcodeLines = (code = '1234567890') => {
    const bars = [];
    // Deterministic stripes generation based on char code values
    for (let i = 0; i < code.length * 2; i++) {
      const char = code.charCodeAt(i % code.length);
      const width = (char % 3) + 1; // 1px, 2px, or 3px line
      const space = ((char + 1) % 3) + 1; // gap width
      bars.push(
        <div key={i} className="flex h-full shrink-0">
          <div className="bg-black dark:bg-white h-full" style={{ width: `${width}px` }}></div>
          <div className="bg-transparent h-full" style={{ width: `${space}px` }}></div>
        </div>
      );
    }
    return <div className="flex h-16 justify-center overflow-hidden bg-white dark:bg-gray-800 p-2 border rounded border-gray-150 dark:border-gray-700">{bars}</div>;
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION WITH ACTION BUTTONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="h-5.5 w-5.5 text-brand-500" />
            <span>Inventory Master</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage product catalogs, track stock quantities, batch details, and barcode registers.</p>
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap gap-2.5 shrink-0">
          <button 
            onClick={() => setScanModalOpen(true)}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center gap-2"
          >
            <Barcode className="h-4 w-4 text-brand-500" />
            <span>Simulate Scan</span>
          </button>
          
          {hasRole(['Owner', 'Manager']) && (
            <>
              <button 
                onClick={() => setBulkModalOpen(true)}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center gap-2"
              >
                <FileUp className="h-4 w-4 text-emerald-500" />
                <span>Bulk Import</span>
              </button>
              <button 
                onClick={handleExportCSV}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 flex items-center gap-2"
              >
                <FileDown className="h-4 w-4 text-amber-500" />
                <span>Export CSV</span>
              </button>
              <button 
                onClick={handleOpenAddModal}
                className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 rounded-xl flex items-center gap-2 shadow shadow-brand-500/20"
              >
                <Plus className="h-4 w-4" />
                <span>Add Product</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* FILTER & TAB ROW */}
      <div className="glass-card p-5 rounded-2xl space-y-4">
        
        {/* TABS */}
        <div className="flex border-b border-gray-100 dark:border-gray-750 text-xs font-semibold pb-1 gap-4">
          <button 
            onClick={() => { setActiveTab('all'); setSelectedAlert(''); setCurrentPage(1); }}
            className={`pb-2 border-b-2 px-1 transition-all ${activeTab === 'all' && !selectedAlert ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-505 dark:text-gray-400'}`}
          >
            All Products ({totalItems})
          </button>
          <button 
            onClick={() => { setActiveTab('all'); setSelectedAlert('low'); setCurrentPage(1); }}
            className={`pb-2 border-b-2 px-1 transition-all ${selectedAlert === 'low' ? 'border-amber-500 text-amber-600 dark:text-amber-400' : 'border-transparent text-gray-505 dark:text-gray-400'}`}
          >
            Low Stock Alerts
          </button>
          <button 
            onClick={() => { setActiveTab('expiry'); setSelectedAlert('expired'); setCurrentPage(1); }}
            className={`pb-2 border-b-2 px-1 transition-all ${activeTab === 'expiry' ? 'border-red-500 text-red-650 dark:text-red-400' : 'border-transparent text-gray-505 dark:text-gray-400'}`}
          >
            Expiry Management
          </button>
        </div>

        {/* FILTERS PANEL */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          
          {/* SEARCH */}
          <div className="relative col-span-1 sm:col-span-2">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-gray-450" />
            <input
              type="text"
              placeholder="Search by name, code, barcode..."
              value={searchInput}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-gray-900 dark:text-white"
            />
          </div>

          {/* CATEGORIES */}
          <select
            value={selectedCat}
            onChange={(e) => { setSelectedCat(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* BRANDS */}
          <select
            value={selectedBrand}
            onChange={(e) => { setSelectedBrand(e.target.value); setCurrentPage(1); }}
            className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none text-gray-900 dark:text-white"
          >
            <option value="">All Brands</option>
            {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>

          {/* CLEAR OR MORE */}
          <button 
            onClick={clearFilters}
            className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 text-xs rounded-xl text-gray-500 font-semibold"
          >
            Clear Filters
          </button>

        </div>

        {/* IF EXPIRY TAB ACTIVE - DETAILED EXPIRY RANGE ALERTS */}
        {activeTab === 'expiry' && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 dark:border-gray-750">
            {[
              { label: 'Already Expired', value: 'expired', color: 'bg-red-500/10 border-red-500/20 text-red-500' },
              { label: 'Expiring in 7 Days', value: 'expiring_7', color: 'bg-orange-500/10 border-orange-500/20 text-orange-500' },
              { label: 'Expiring in 15 Days', value: 'expiring_15', color: 'bg-amber-500/10 border-amber-500/20 text-amber-500' },
              { label: 'Expiring in 30 Days', value: 'expiring_30', color: 'bg-brand-500/10 border-brand-500/20 text-brand-500' },
              { label: 'Expiring in 60 Days', value: 'expiring_60', color: 'bg-violet-500/10 border-violet-500/20 text-violet-500' },
            ].map(range => (
              <button
                key={range.value}
                onClick={() => { setSelectedAlert(range.value); setCurrentPage(1); }}
                className={`px-3 py-1 text-[11px] font-bold rounded-lg border transition-all ${
                  selectedAlert === range.value 
                    ? 'ring-2 ring-offset-2 ring-brand-500 ' + range.color
                    : 'bg-gray-50 dark:bg-gray-750 border-gray-200 dark:border-gray-700 text-gray-500'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        )}

      </div>

      {/* PRODUCTS INVENTORY LIST */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-750 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">Code / Name</th>
                <th className="px-5 py-3">Category / Brand</th>
                <th className="px-5 py-3 text-right">Pricing (Buy/Sell)</th>
                <th className="px-5 py-3 text-center">In Stock</th>
                <th className="px-5 py-3 text-center">Expiry Status</th>
                <th className="px-5 py-3 text-right rounded-r-lg">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y divide-gray-100 dark:divide-gray-750 transition-opacity duration-200 ${loading && displayedProducts.length > 0 ? 'opacity-50 pointer-events-none' : ''}`}>
              {loading && displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand-500"></div>
                    <p className="text-xs text-gray-400 mt-2">Loading product database...</p>
                  </td>
                </tr>
              ) : displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">No matching products found.</td>
                </tr>
              ) : (
                displayedProducts.map((p) => {
                  const isLow = p.quantity <= p.minQuantity && p.quantity > 0;
                  const isOut = p.quantity === 0;
                  const isExpired = p.expiryDate && new Date(p.expiryDate) < new Date();
                  
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850 transition-colors">
                      
                      {/* Name & Code */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">
                          <Highlight text={p.name} query={searchInput} />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
                          <Highlight text={p.code} query={searchInput} />
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="px-5 py-4">
                        <div className="text-gray-800 dark:text-gray-250">
                          <Highlight text={p.category?.name} query={searchInput} />
                        </div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          <Highlight text={p.brand?.name} query={searchInput} />
                        </div>
                      </td>

                      {/* Pricing */}
                      <td className="px-5 py-4 text-right">
                        <div className="font-medium text-gray-900 dark:text-white">₹{p.sellingPrice.toFixed(2)}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">Buy: ₹{p.purchasePrice.toFixed(2)} (Tax {p.gstPercent}%)</div>
                      </td>

                      {/* Stock Status */}
                      <td className="px-5 py-4 text-center">
                        <div className={`font-bold text-sm ${isOut ? 'text-red-500' : isLow ? 'text-amber-500' : 'text-gray-900 dark:text-white'}`}>
                          {p.quantity} units
                        </div>
                        {isOut ? (
                          <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[9px] font-bold text-red-650 bg-red-100 rounded">OUT</span>
                        ) : isLow ? (
                          <span className="inline-block px-1.5 py-0.5 mt-0.5 text-[9px] font-bold text-amber-600 bg-amber-100 rounded">LOW (min: {p.minQuantity})</span>
                        ) : null}
                      </td>

                      {/* Expiry */}
                      <td className="px-5 py-4 text-center">
                        {p.expiryDate ? (
                          <div>
                            <div className={`font-semibold ${isExpired ? 'text-red-500' : 'text-gray-700 dark:text-gray-300'}`}>
                              {new Date(p.expiryDate).toLocaleDateString()}
                            </div>
                            <div className="text-[10px] text-gray-400 font-mono mt-0.5">Batch: {p.batchNumber || 'N/A'}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenBarcodeModal(p)}
                            title="Generate Barcode"
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-400"
                          >
                            <Barcode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleOpenHistoryDrawer(p)}
                            title="Stock History"
                            className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-400"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          {hasRole(['Owner', 'Manager']) && (
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              title="Edit"
                              className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-750 text-gray-500 dark:text-gray-400"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {hasRole(['Owner']) && (
                            <button
                              onClick={() => handleDeleteProduct(p.id)}
                              title="Delete"
                              className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION PANEL */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-750 flex items-center justify-between text-xs font-semibold text-gray-500 dark:text-gray-400">
            <span>Page {currentPage} of {totalPages}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-40"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-750 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: ADD/EDIT PRODUCT (NATIVE DIALOG FORMAT) */}
      {productModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 max-w-2xl w-full rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden my-8">
            <div className="p-5 border-b border-gray-100 dark:border-gray-750 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                {editingProduct ? `Edit Product: ${editingProduct.name}` : 'Create New Product'}
              </h3>
              <button onClick={() => setProductModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              
              {formErrors.apiError && (
                <div className="p-3 bg-red-100 text-red-650 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="h-4.5 w-4.5" />
                  <span>{formErrors.apiError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* NAME */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Product Name *</label>
                  <input type="text" name="name" required value={formFields.name} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                  {formErrors.name && <span className="text-[10px] text-red-500 mt-1">{formErrors.name}</span>}
                </div>

                {/* SKU CODE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Product Code *</label>
                  <input type="text" name="code" required value={formFields.code} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                  {formErrors.code && <span className="text-[10px] text-red-500 mt-1">{formErrors.code}</span>}
                </div>

                {/* BARCODE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Barcode (Optional)</label>
                  <input type="text" name="barcode" value={formFields.barcode} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" placeholder="UPC/EAN string" />
                </div>

                {/* CATEGORY */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category *</label>
                  <select name="categoryId" required value={formFields.categoryId} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white">
                    <option value="">Select Category</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {/* BRAND */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Brand *</label>
                  <select name="brandId" required value={formFields.brandId} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white">
                    <option value="">Select Brand</option>
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>

                {/* BUY PRICE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Purchase Price (₹) *</label>
                  <input type="number" step="0.01" name="purchasePrice" required value={formFields.purchasePrice} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                  {formErrors.purchasePrice && <span className="text-[10px] text-red-500 mt-1">{formErrors.purchasePrice}</span>}
                </div>

                {/* SELL PRICE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Selling Price (₹) *</label>
                  <input type="number" step="0.01" name="sellingPrice" required value={formFields.sellingPrice} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                  {formErrors.sellingPrice && <span className="text-[10px] text-red-500 mt-1">{formErrors.sellingPrice}</span>}
                </div>

                {/* INITIAL QUANTITY */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Quantity *</label>
                  <input type="number" name="quantity" required value={formFields.quantity} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                  {formErrors.quantity && <span className="text-[10px] text-red-500 mt-1">{formErrors.quantity}</span>}
                </div>

                {/* MINIMUM ALERTS QTY */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Minimum Alert Qty</label>
                  <input type="number" name="minQuantity" value={formFields.minQuantity} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                </div>

                {/* BATCH NUMBER */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Batch Number</label>
                  <input type="text" name="batchNumber" value={formFields.batchNumber} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" placeholder="BATCH-XXXX" />
                </div>

                {/* EXPIRY DATE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Expiry Date (Optional)</label>
                  <input type="date" name="expiryDate" value={formFields.expiryDate} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                </div>

                {/* SUPPLIER */}
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Supplier</label>
                  <select name="supplierId" value={formFields.supplierId} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white">
                    <option value="">No Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

              </div>

              {/* ACTION ROW */}
              <div className="flex justify-end gap-3 pt-5 border-t border-gray-100 dark:border-gray-750 mt-6">
                <button type="button" onClick={() => setProductModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-750 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-750">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow shadow-brand-500/20">
                  {editingProduct ? 'Save Changes' : 'Create Product'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DRAWER: PRODUCT TRANSACTION HISTORY LOGS */}
      {historyDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-gray-900/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 max-w-md w-full h-full flex flex-col shadow-2xl border-l border-gray-100 dark:border-gray-700 animate-slide-in">
            <div className="p-5 border-b border-gray-100 dark:border-gray-750 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white">Product Movement History</h3>
                <p className="text-[10px] text-gray-450 mt-0.5">{selectedProductForHistory?.name}</p>
              </div>
              <button onClick={() => setHistoryDrawerOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-750">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {historyLogs.length === 0 ? (
                <div className="text-center py-12 text-xs text-gray-450">No inventory transactions logged.</div>
              ) : (
                <div className="relative border-l border-gray-200 dark:border-gray-700 pl-4 space-y-6">
                  {historyLogs.map((log) => (
                    <div key={log.id} className="relative">
                      <div className={`absolute -left-[21px] top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800 ${
                        log.type === 'In' ? 'bg-emerald-500' : log.type === 'Out' ? 'bg-red-500' : 'bg-amber-500'
                      }`}></div>
                      <div>
                        <span className="text-[9px] uppercase font-bold text-gray-400">
                          {new Date(log.date).toLocaleString()}
                        </span>
                        <h4 className="text-xs font-bold text-gray-850 dark:text-gray-200 mt-0.5">
                          {log.type === 'In' ? 'Stock Added (+)' : log.type === 'Out' ? 'Stock Reduced (-)' : 'Stock Adjusted'}
                        </h4>
                        <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mt-1">
                          Quantity: <span className="font-extrabold">{log.quantity} units</span>
                        </p>
                        <span className="inline-block mt-1 text-[9px] px-1.5 py-0.5 font-bold uppercase tracking-wide bg-gray-100 dark:bg-gray-750 text-gray-500 dark:text-gray-400 rounded">
                          Ref: {log.referenceId}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BARCODE VIEWER */}
      {barcodeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 max-w-sm w-full rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 space-y-5 text-center">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-750 pb-3">
              <span className="font-bold text-sm text-gray-900 dark:text-white">Product Barcode Sticker</span>
              <button onClick={() => setBarcodeModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">{selectedProductForBarcode?.name}</p>
              {renderBarcodeLines(selectedProductForBarcode?.barcode || selectedProductForBarcode?.code)}
              <span className="block font-mono text-sm tracking-widest font-bold mt-2 text-gray-900 dark:text-white">
                {selectedProductForBarcode?.barcode || selectedProductForBarcode?.code}
              </span>
            </div>

            <button 
              onClick={() => window.print()}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow shadow-brand-500/20"
            >
              Print Sticker
            </button>
          </div>
        </div>
      )}

      {/* MODAL: SIMULATE BARCODE SCANNER */}
      {scanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 max-w-sm w-full rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-750 pb-3">
              <span className="font-bold text-sm text-gray-900 dark:text-white">Simulated Barcode Scan</span>
              <button onClick={() => setScanModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3.5">
              <p className="text-xs text-gray-500 leading-relaxed">
                Simulate aiming a hardware laser scanner. Type or paste the product's barcode code below, or choose a seed barcode to scan.
              </p>
              <div className="space-y-1.5">
                <button 
                  onClick={() => setScanInput('035762118331')}
                  className="w-full text-left p-2.5 bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-700/50 flex justify-between"
                >
                  <span>Yamalube Oil Barcode</span>
                  <span className="font-mono text-gray-400">035762118331</span>
                </button>
                <button 
                  onClick={() => setScanInput('753759247348')}
                  className="w-full text-left p-2.5 bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl text-xs font-medium border border-gray-200 dark:border-gray-700/50 flex justify-between"
                >
                  <span>Garmin Radar Barcode</span>
                  <span className="font-mono text-gray-400">753759247348</span>
                </button>
              </div>
              
              <input 
                type="text" 
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                placeholder="Type code here..." 
                className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white font-mono"
              />
            </div>

            <button 
              onClick={handleScanSimulation}
              className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow shadow-brand-500/20"
            >
              Scan & Find Product
            </button>
          </div>
        </div>
      )}

      {/* MODAL: BULK CSV UPLOAD */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 max-w-sm w-full rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-750 pb-3">
              <span className="font-bold text-sm text-gray-900 dark:text-white">Bulk CSV Import</span>
              <button onClick={() => setBulkModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleBulkUpload} className="space-y-4">
              <p className="text-xs text-gray-500 leading-relaxed">
                Upload a CSV spreadsheet mapping product codes, names, selling prices, quantities, and barcode numbers to ingest products.
              </p>
              
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-brand-500 transition-colors">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={(e) => setCsvFile(e.target.files[0])}
                  className="hidden" 
                  id="csv-file-picker" 
                />
                <label htmlFor="csv-file-picker" className="cursor-pointer space-y-2 block">
                  <Upload className="h-8 w-8 text-gray-400 mx-auto" />
                  <span className="block text-xs font-semibold text-gray-900 dark:text-white">
                    {csvFile ? csvFile.name : 'Click to select CSV File'}
                  </span>
                  <span className="block text-[10px] text-gray-400">CSV file format only</span>
                </label>
              </div>

              <div className="flex gap-2">
                <button type="button" onClick={() => setBulkModalOpen(false)} className="w-1/2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-750">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={bulkLoading || !csvFile}
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow shadow-brand-500/20 flex justify-center items-center"
                >
                  {bulkLoading ? 'Uploading...' : 'Import Data'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Inventory;
