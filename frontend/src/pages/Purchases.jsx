import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  Truck, Plus, Search, Calendar, IndianRupee, FileText, 
  Trash2, X, PlusCircle, ArrowRight, ClipboardList, Sparkles, Edit 
} from 'lucide-react';

const Purchases = () => {
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('Pending');
  const [amountPaidInput, setAmountPaidInput] = useState('');

  // Edit Amount Modal State
  const [editAmountModalOpen, setEditAmountModalOpen] = useState(false);
  const [editPurchaseId, setEditPurchaseId] = useState(null);
  const [editAmountValue, setEditAmountValue] = useState('');
  const [editPurchaseTotal, setEditPurchaseTotal] = useState(0);
  const [purchaseItems, setPurchaseItems] = useState([
    { productId: '', quantity: 1, costPrice: 0, taxPercent: 18 }
  ]);

  // Quick Add Product Sub-Modal State
  const [quickProductModalOpen, setQuickProductModalOpen] = useState(false);
  const [quickAddIndex, setQuickAddIndex] = useState(null); // Which row index opened the modal
  const [quickProductFields, setQuickProductFields] = useState({
    name: '', code: '', categoryId: '', brandId: '',
    purchasePrice: 0, sellingPrice: 0, gstPercent: 18
  });
  const [quickProductErrors, setQuickProductErrors] = useState({});

  const loadCatalogs = async () => {
    setLoading(true);
    try {
      const [purRes, supRes, prodRes, catRes, brandRes] = await Promise.all([
        api.get('/purchases'),
        api.get('/suppliers'),
        api.get('/products?limit=100'),
        api.get('/categories'),
        api.get('/brands')
      ]);
      if (purRes.data.success) setPurchases(purRes.data.purchases);
      if (supRes.data.success) setSuppliers(supRes.data.suppliers);
      if (prodRes.data.success) setProducts(prodRes.data.products);
      if (catRes.data.success) setCategories(catRes.data.categories);
      if (brandRes.data.success) setBrands(brandRes.data.brands);
    } catch (err) {
      console.error('Failed to load purchase catalogs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (purchaseId, newStatus) => {
    if (newStatus === 'Partial') {
      const pur = purchases.find(p => p.id === purchaseId);
      setEditPurchaseId(purchaseId);
      setEditAmountValue(pur?.amountPaid || '');
      setEditPurchaseTotal(pur?.totalAmount || 0);
      setEditAmountModalOpen(true);
      return;
    }

    try {
      const res = await api.put(`/purchases/${purchaseId}/status`, { 
        paymentStatus: newStatus
      });
      if (res.data.success) {
        loadCatalogs();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update payment status.');
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  // Add Item row to Purchase builder
  const addPurchaseItemRow = () => {
    setPurchaseItems(prev => [...prev, { productId: '', quantity: 1, costPrice: 0, taxPercent: 18 }]);
  };

  // Remove Item row
  const removePurchaseItemRow = (index) => {
    if (purchaseItems.length === 1) return;
    setPurchaseItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Handle value change for item row
  const handleItemRowChange = (index, field, value) => {
    setPurchaseItems(prev => prev.map((item, idx) => {
      if (idx !== index) return item;
      
      const updated = { ...item, [field]: value };
      
      // Auto populate cost price from selected product
      if (field === 'productId') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          updated.costPrice = prod.purchasePrice;
          updated.taxPercent = prod.gstPercent;
        }
      }
      return updated;
    }));
  };

  // Calculate purchase totals
  const calculatePurchaseTotals = () => {
    let subTotal = 0;
    let totalTax = 0;
    
    purchaseItems.forEach(item => {
      const base = parseFloat(item.costPrice || 0) * parseInt(item.quantity || 1);
      const tax = base * (parseFloat(item.taxPercent || 18) / 100);
      subTotal += base;
      totalTax += tax;
    });

    return {
      subTotal,
      totalTax,
      totalAmount: subTotal + totalTax
    };
  };

  const totals = calculatePurchaseTotals();

  // Submit Purchase Entry
  const handleSavePurchase = async (e) => {
    e.preventDefault();
    if (!invoiceNumber || !selectedSupplierId || purchaseItems.some(i => !i.productId)) {
      alert('Please fill in all required fields and select products.');
      return;
    }

    const payload = {
      invoiceNumber,
      supplierId: selectedSupplierId,
      tax: totals.totalTax,
      totalAmount: totals.totalAmount,
      paymentStatus,
      amountPaid: paymentStatus === 'Partial' ? parseFloat(amountPaidInput || 0) : undefined,
      items: purchaseItems.map(i => ({
        productId: i.productId,
        quantity: parseInt(i.quantity),
        costPrice: parseFloat(i.costPrice),
        taxPercent: parseFloat(i.taxPercent)
      }))
    };

    try {
      const res = await api.post('/purchases', payload);
      if (res.data.success) {
        setPurchaseModalOpen(false);
        // Reset states
        setInvoiceNumber('');
        setSelectedSupplierId('');
        setPaymentStatus('Pending');
        setAmountPaidInput('');
        setPurchaseItems([{ productId: '', quantity: 1, costPrice: 0, taxPercent: 18 }]);
        loadCatalogs();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Error recording purchase.');
    }
  };

  // Open Quick Add Product Sub-Modal
  const handleOpenQuickProductModal = (rowIndex) => {
    setQuickAddIndex(rowIndex);
    setQuickProductFields({
      name: '',
      code: '',
      categoryId: categories[0]?.id || '',
      brandId: brands[0]?.id || '',
      purchasePrice: 0,
      sellingPrice: 0,
      gstPercent: 18
    });
    setQuickProductErrors({});
    setQuickProductModalOpen(true);
  };

  // Save Quick Product
  const handleSaveQuickProduct = async (e) => {
    e.preventDefault();
    if (!quickProductFields.name || !quickProductFields.code) {
      setQuickProductErrors({ name: 'Name and Code are required.' });
      return;
    }

    try {
      const res = await api.post('/products', {
        ...quickProductFields,
        quantity: 0, // Inward quantity will be added by the PO line
        supplierId: selectedSupplierId || null
      });

      if (res.data.success) {
        const newProduct = res.data.product;
        
        // Refresh products list in state
        const refreshedProducts = [...products, newProduct];
        setProducts(refreshedProducts);

        // Update the purchase cart row that requested this add
        setPurchaseItems(prev => prev.map((item, idx) => {
          if (idx !== quickAddIndex) return item;
          return {
            ...item,
            productId: newProduct.id,
            costPrice: newProduct.purchasePrice,
            taxPercent: newProduct.gstPercent
          };
        }));

        setQuickProductModalOpen(false);
      }
    } catch (err) {
      setQuickProductErrors({ apiError: err.response?.data?.message || 'Failed to add product.' });
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Truck className="h-5.5 w-5.5 text-brand-500" />
            <span>Supplier Purchases</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Record stock inward orders, supplier invoice records, and monitor inventory additions.</p>
        </div>

        <button 
          onClick={() => setPurchaseModalOpen(true)}
          className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-655 rounded-xl flex items-center gap-2 shadow shadow-brand-500/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>New Purchase Entry</span>
        </button>
      </div>

      {/* PURCHASES LIST */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 dark:border-gray-750 flex items-center gap-2 bg-gray-50/50 dark:bg-gray-800/40">
          <ClipboardList className="h-4.5 w-4.5 text-brand-500" />
          <span className="font-bold text-xs uppercase text-gray-900 dark:text-white tracking-wider">Purchase Inward Ledger</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-55 dark:bg-gray-750 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3">PO Invoice</th>
                <th className="px-5 py-3">Supplier Name</th>
                <th className="px-5 py-3 text-right">Tax Paid</th>
                <th className="px-5 py-3 text-right">Total Invoice</th>
                <th className="px-5 py-3 text-center">Payment Status</th>
                <th className="px-5 py-3 rounded-r-lg">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
              {loading ? (
                <tr>
                  <td colSpan="6" className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand-500"></div>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center py-12 text-gray-400">No purchase entries recorded.</td>
                </tr>
              ) : (
                purchases.map(pur => (
                  <tr key={pur.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850 transition-colors">
                    <td className="px-5 py-4 font-semibold text-brand-600 dark:text-brand-400">{pur.invoiceNumber}</td>
                    <td className="px-5 py-4 text-gray-900 dark:text-white font-medium">{pur.supplier?.name}</td>
                    <td className="px-5 py-4 text-right">₹{pur.tax.toFixed(2)}</td>
                    <td className="px-5 py-4 text-right font-bold text-gray-900 dark:text-white">₹{pur.totalAmount.toFixed(2)}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex flex-col items-center justify-center space-y-1">
                        <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-750/30 rounded px-1.5 py-0.5">
                          <select
                            value={pur.paymentStatus}
                            onChange={(e) => handleUpdateStatus(pur.id, e.target.value)}
                            className={`text-[9px] font-bold rounded uppercase outline-none cursor-pointer border-none bg-transparent ${
                              pur.paymentStatus === 'Paid' ? 'text-green-700 dark:text-green-400' :
                              pur.paymentStatus === 'Partial' ? 'text-amber-600 dark:text-amber-400' : 
                              'text-red-650 dark:text-red-400'
                            }`}
                          >
                            <option value="Paid" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Paid</option>
                            <option value="Pending" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Pending</option>
                            <option value="Partial" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white">Partial</option>
                          </select>
                          {pur.paymentStatus === 'Partial' && (
                            <Edit 
                              className="h-3 w-3 text-gray-400 dark:text-gray-500 hover:text-brand-500 cursor-pointer transition-colors" 
                              onClick={() => {
                                setEditPurchaseId(pur.id);
                                setEditAmountValue(pur.amountPaid || '');
                                setEditPurchaseTotal(pur.totalAmount || 0);
                                setEditAmountModalOpen(true);
                              }} 
                              title="Edit Amount Paid" 
                            />
                          )}
                        </div>
                        
                        {/* Outstanding / Paid amounts */}
                        {pur.paymentStatus !== 'Paid' && (
                          <span className="block text-[10px] text-red-500 dark:text-red-400 font-bold">
                            Outstanding: ₹{(pur.totalAmount - pur.amountPaid).toFixed(2)}
                          </span>
                        )}
                        {pur.paymentStatus === 'Partial' && (
                          <span className="block text-[10px] text-gray-400 dark:text-gray-500 font-semibold">
                            Paid: ₹{pur.amountPaid.toFixed(2)}
                          </span>
                        )}

                        {/* Last Edited Details */}
                        <div className="text-center">
                          <span className="block text-[8px] text-gray-400 dark:text-gray-500 font-medium">
                            Edited: {new Date(pur.updatedAt).toLocaleString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          {pur.updatedBy && (
                            <span className="block text-[8px] text-gray-400 dark:text-gray-550 font-semibold mt-0.5">
                              By: {pur.updatedBy.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400">{new Date(pur.date).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NEW PURCHASE ENTRY (STOCK INWARD) */}
      {purchaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 max-w-3xl w-full rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden my-8 animate-scale-up">
            <div className="p-5 border-b border-gray-100 dark:border-gray-750 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Record Vendor Purchase (Stock Inward)</h3>
              <button onClick={() => setPurchaseModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSavePurchase} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* INVOICE NUMBER */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Invoice Number *</label>
                  <input 
                    type="text" 
                    required 
                    value={invoiceNumber} 
                    onChange={(e) => setInvoiceNumber(e.target.value)} 
                    placeholder="PO-2026-XXXX" 
                    className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                  />
                </div>

                {/* SUPPLIER */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Supplier *</label>
                  <select 
                    required 
                    value={selectedSupplierId} 
                    onChange={(e) => setSelectedSupplierId(e.target.value)} 
                    className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* PAYMENT STATUS */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Payment Status</label>
                  <select 
                    value={paymentStatus} 
                    onChange={(e) => {
                      setPaymentStatus(e.target.value);
                      if (e.target.value !== 'Partial') setAmountPaidInput('');
                    }} 
                    className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending (Outstanding)</option>
                    <option value="Partial">Partial</option>
                  </select>
                </div>

                {paymentStatus === 'Partial' && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Amount Paid *</label>
                    <input 
                      type="number" 
                      step="0.01"
                      required
                      value={amountPaidInput}
                      onChange={(e) => setAmountPaidInput(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                    />
                  </div>
                )}

              </div>

              {/* ITEM ENTRIES TABLE HEADER */}
              <div className="border-t border-gray-100 dark:border-gray-750 pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-900 dark:text-white">Purchase Itemized List</span>
                  <button 
                    type="button" 
                    onClick={addPurchaseItemRow}
                    className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1"
                  >
                    <PlusCircle className="h-4 w-4" />
                    <span>Add Row</span>
                  </button>
                </div>

                {/* ITEMS CONTAINER */}
                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {purchaseItems.map((item, index) => (
                    <div key={index} className="flex flex-col lg:flex-row gap-3 items-start lg:items-center bg-gray-50/50 dark:bg-gray-750/30 p-3 rounded-xl border border-gray-150 dark:border-gray-700">
                      
                      {/* PRODUCT DROPDOWN */}
                      <div className="flex-1 w-full flex items-center gap-2">
                        <select
                          required
                          value={item.productId}
                          onChange={(e) => handleItemRowChange(index, 'productId', e.target.value)}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg outline-none text-gray-900 dark:text-white"
                        >
                          <option value="">Choose Product</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.purchasePrice.toFixed(2)})</option>)}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleOpenQuickProductModal(index)}
                          className="px-2 py-2 bg-brand-50 hover:bg-brand-100 dark:bg-brand-900/20 text-brand-650 hover:text-brand-700 rounded-lg text-xs font-semibold shrink-0"
                          title="Quick Add Product manually"
                        >
                          + New
                        </button>
                      </div>

                      {/* QUANTITY */}
                      <div className="w-full lg:w-20">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemRowChange(index, 'quantity', parseInt(e.target.value || 1))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg outline-none text-gray-900 dark:text-white text-center"
                        />
                      </div>

                      {/* COST PRICE */}
                      <div className="w-full lg:w-28">
                        <input
                          type="number"
                          step="0.01"
                          required
                          placeholder="Cost (₹)"
                          value={item.costPrice}
                          onChange={(e) => handleItemRowChange(index, 'costPrice', parseFloat(e.target.value || 0))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg outline-none text-gray-900 dark:text-white text-right font-semibold"
                        />
                      </div>

                      {/* TAX PERCENT */}
                      <div className="w-full lg:w-20">
                        <input
                          type="number"
                          placeholder="Tax %"
                          value={item.taxPercent}
                          onChange={(e) => handleItemRowChange(index, 'taxPercent', parseFloat(e.target.value || 18))}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs rounded-lg outline-none text-gray-900 dark:text-white text-center"
                        />
                      </div>

                      {/* DELETE ROW */}
                      <button
                        type="button"
                        onClick={() => removePurchaseItemRow(index)}
                        disabled={purchaseItems.length === 1}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>
                  ))}
                </div>
              </div>

              {/* TOTAL CALCULATOR FOOTER */}
              <div className="bg-gray-50 dark:bg-gray-800/40 p-4 rounded-xl border border-gray-150 dark:border-gray-700 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>Subtotal (Excl. Tax)</span>
                  <span>₹{totals.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>GST/Tax Component</span>
                  <span>₹{totals.totalTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm font-bold text-gray-900 dark:text-white border-t border-dashed border-gray-200 dark:border-gray-700 pt-1.5">
                  <span>TOTAL ESTIMATED COST</span>
                  <span className="text-brand-600 font-bold">₹{totals.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* SAVE CONTROL ROW */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-750">
                <button type="button" onClick={() => setPurchaseModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-750 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-750">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow shadow-brand-500/20">
                  Record Purchase & Add Stock
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* SUB-MODAL: QUICK ADD PRODUCT */}
      {quickProductModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-gray-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 max-w-md w-full rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-scale-up">
            <div className="p-4 border-b border-gray-100 dark:border-gray-750 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
              <h4 className="font-bold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-brand-500" />
                <span>Quick Add New Purchased Product</span>
              </h4>
              <button onClick={() => setQuickProductModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickProduct} className="p-5 space-y-3.5">
              
              {quickProductErrors.apiError && (
                <div className="p-2.5 bg-red-100 text-red-650 rounded-lg text-xs">
                  {quickProductErrors.apiError}
                </div>
              )}

              {/* NAME */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Product Name *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Bearing size 30mm"
                  value={quickProductFields.name}
                  onChange={(e) => setQuickProductFields(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-55/40 dark:bg-gray-750 border border-gray-250 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                />
              </div>

              {/* CODE */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Product SKU Code *</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. BRG-30MM"
                  value={quickProductFields.code}
                  onChange={(e) => setQuickProductFields(prev => ({ ...prev, code: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-55/40 dark:bg-gray-750 border border-gray-255 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                />
              </div>

              {/* CATEGORY & BRAND */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Category *</label>
                  <select 
                    required 
                    value={quickProductFields.categoryId}
                    onChange={(e) => setQuickProductFields(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-55/40 dark:bg-gray-750 border border-gray-250 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                  >
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Brand *</label>
                  <select 
                    required 
                    value={quickProductFields.brandId}
                    onChange={(e) => setQuickProductFields(prev => ({ ...prev, brandId: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-55/40 dark:bg-gray-750 border border-gray-250 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                  >
                    {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              {/* PRICING */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Purchase Cost (₹) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={quickProductFields.purchasePrice}
                    onChange={(e) => setQuickProductFields(prev => ({ ...prev, purchasePrice: parseFloat(e.target.value || 0) }))}
                    className="w-full px-3 py-2 bg-gray-55/40 dark:bg-gray-750 border border-gray-250 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Selling Rate (₹) *</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={quickProductFields.sellingPrice}
                    onChange={(e) => setQuickProductFields(prev => ({ ...prev, sellingPrice: parseFloat(e.target.value || 0) }))}
                    className="w-full px-3 py-2 bg-gray-55/40 dark:bg-gray-750 border border-gray-255 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* TAX Rate */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tax Percent (GST %)</label>
                <input 
                  type="number" 
                  value={quickProductFields.gstPercent}
                  onChange={(e) => setQuickProductFields(prev => ({ ...prev, gstPercent: parseFloat(e.target.value || 18) }))}
                  className="w-full px-3 py-2 bg-gray-55/40 dark:bg-gray-750 border border-gray-250 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 pt-3 border-t border-gray-100 dark:border-gray-750">
                <button type="button" onClick={() => setQuickProductModalOpen(false)} className="w-1/2 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-750">
                  Cancel
                </button>
                <button type="submit" className="w-1/2 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow shadow-brand-500/20">
                  Register Product
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* GLASSMORPHIC CUSTOM MODAL: EDIT AMOUNT PAID */}
      {editAmountModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/40 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card max-w-sm w-full rounded-2xl border border-white/20 dark:border-slate-700/60 overflow-hidden shadow-2xl p-6 space-y-4 animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-white/10 dark:border-slate-700/40">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                <Edit className="h-4 w-4 text-brand-500" />
                <span>Edit Amount Paid</span>
              </h3>
              <button 
                onClick={() => setEditAmountModalOpen(false)} 
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-3.5 text-xs">
              <div className="text-gray-500 dark:text-gray-400 flex flex-col gap-1 bg-gray-50/50 dark:bg-slate-900/10 p-2.5 rounded-xl border border-gray-100 dark:border-slate-800">
                <div>
                  Purchase Order Total: <span className="font-bold text-gray-850 dark:text-gray-200">₹{editPurchaseTotal.toFixed(2)}</span>
                </div>
                {(() => {
                  const pur = purchases.find(p => p.id === editPurchaseId);
                  if (pur && pur.updatedBy) {
                    return (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 pt-1.5 border-t border-gray-150 dark:border-slate-800/80 space-y-0.5">
                        <div>
                          Last Action: <span className="font-semibold text-gray-700 dark:text-gray-300">{new Date(pur.updatedAt).toLocaleString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                          })}</span>
                        </div>
                        <div>
                          Modified By: <span className="font-semibold text-gray-700 dark:text-gray-300">{pur.updatedBy.name}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
              
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Amount Paid (₹)
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  required
                  value={editAmountValue}
                  onChange={(e) => setEditAmountValue(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3.5 py-2.5 bg-white/40 dark:bg-slate-900/30 border border-gray-200 dark:border-slate-700/60 text-xs rounded-xl outline-none text-gray-900 dark:text-white font-semibold focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {parseFloat(editAmountValue) > editPurchaseTotal && (
                <span className="block text-[10px] text-red-500 font-medium">
                  ⚠️ Paid amount cannot exceed total purchase order amount.
                </span>
              )}
            </div>

            {/* Modal Footer / Action Buttons */}
            <div className="flex gap-2 pt-2 border-t border-white/10 dark:border-slate-700/40">
              <button 
                type="button" 
                onClick={() => setEditAmountModalOpen(false)}
                className="w-1/2 py-2 border border-gray-200 dark:border-slate-700 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-slate-800 transition-all text-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button 
                type="button" 
                disabled={parseFloat(editAmountValue) > editPurchaseTotal || parseFloat(editAmountValue) < 0 || isNaN(parseFloat(editAmountValue))}
                onClick={async () => {
                  try {
                    const res = await api.put(`/purchases/${editPurchaseId}/status`, { 
                      paymentStatus: 'Partial',
                      amountPaid: parseFloat(editAmountValue)
                    });
                    if (res.data.success) {
                      setEditAmountModalOpen(false);
                      loadCatalogs();
                    }
                  } catch (err) {
                    alert(err.response?.data?.message || 'Failed to update payment status.');
                  }
                }}
                className="w-1/2 py-2 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow shadow-brand-500/20"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default Purchases;
