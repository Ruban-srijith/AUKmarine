import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { 
  ShoppingCart, Search, Barcode, Trash2, Plus, Minus, 
  IndianRupee, FileText, UserPlus, CreditCard, Sparkles, Printer, 
  Mail, MessageSquare, Check, X, ArrowRight 
} from 'lucide-react';

const SalesPOS = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [cart, setCart] = useState([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [invoiceDiscount, setInvoiceDiscount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');

  // Checkout response
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [latestSaleRecord, setLatestSaleRecord] = useState(null);

  // Load catalogs
  const loadCatalogs = async () => {
    try {
      const [prodRes, custRes] = await Promise.all([
        api.get('/products?limit=100'), // Load active products
        api.get('/customers')
      ]);
      if (prodRes.data.success) setProducts(prodRes.data.products);
      if (custRes.data.success) setCustomers(custRes.data.customers);
    } catch (err) {
      console.error('Failed to load POS catalogs:', err);
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  // Filter products as search query updates
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = products.filter(p => 
      p.status === 'Active' && (
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        (p.barcode && p.barcode.includes(query))
      )
    );
    setSearchResults(filtered);
  }, [searchQuery, products]);

  // Add Item to Cart
  const addToCart = (product) => {
    // Check if product is already in cart
    const existing = cart.find(item => item.id === product.id);
    const cartQty = existing ? existing.cartQuantity : 0;

    // Check stock
    if (product.quantity <= cartQty) {
      alert(`Insufficient stock. Only ${product.quantity} units available.`);
      return;
    }

    if (existing) {
      setCart(prev => prev.map(item => 
        item.id === product.id 
          ? { ...item, cartQuantity: item.cartQuantity + 1 }
          : item
      ));
    } else {
      setCart(prev => [...prev, {
        ...product,
        cartQuantity: 1,
        itemDiscount: '' // Specific item level discount
      }]);
    }
    setSearchQuery('');
  };

  // Adjust item qty in cart
  const updateQty = (id, delta) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    const newQty = item.cartQuantity + delta;
    if (newQty <= 0) {
      removeFromCart(id);
      return;
    }

    if (item.quantity < newQty) {
      alert(`Insufficient stock. Only ${item.quantity} units available.`);
      return;
    }

    setCart(prev => prev.map(i => i.id === id ? { ...i, cartQuantity: newQty } : i));
  };

  // Adjust item level discount
  const updateItemDiscount = (id, discVal) => {
    setCart(prev => prev.map(i => i.id === id ? { ...i, itemDiscount: discVal } : i));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  // Barcode simulation scan
  const handleBarcodeScan = (code) => {
    const found = products.find(p => p.barcode === code || p.code === code);
    if (found) {
      addToCart(found);
    } else {
      alert(`No product found with code/barcode "${code}"`);
    }
  };

  // Totals calculations
  const calculateCartTotals = () => {
    let subTotal = 0;
    let totalGst = 0;
    
    cart.forEach(item => {
      const itemDisc = parseFloat(item.itemDiscount);
      const safeItemDiscount = isNaN(itemDisc) ? 0 : Math.max(0, itemDisc);
      const rate = Math.max(0, item.sellingPrice - safeItemDiscount);
      const base = rate * item.cartQuantity;
      const gst = base * (item.gstPercent / 100);
      subTotal += base;
      totalGst += gst;
    });

    const subTotalWithGst = subTotal + totalGst;
    const invDisc = parseFloat(invoiceDiscount);
    const safeInvoiceDiscount = isNaN(invDisc) ? 0 : Math.max(0, invDisc);
    const finalTotal = Math.max(0, subTotalWithGst - safeInvoiceDiscount);

    return {
      subTotal: subTotal,
      totalGst: totalGst,
      totalAmountBeforeDiscount: subTotalWithGst,
      finalTotal: finalTotal
    };
  };

  const totals = calculateCartTotals();

  // POS Invoicing checkout API
  const handleCheckout = async () => {
    if (cart.length === 0) {
      alert('Cart is empty.');
      return;
    }

    const parseSafeFloat = (val) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) ? 0 : Math.max(0, parsed);
    };

    const payload = {
      customerId: selectedCustomerId || null,
      discount: parseSafeFloat(invoiceDiscount),
      paymentMethod,
      items: cart.map(item => ({
        productId: item.id,
        quantity: item.cartQuantity,
        discount: parseSafeFloat(item.itemDiscount)
      }))
    };

    try {
      const res = await api.post('/sales', payload);
      if (res.data.success) {
        setLatestSaleRecord(res.data.sale);
        setCheckoutSuccess(true);
        // Clear POS workspace
        setCart([]);
        setInvoiceDiscount('');
        setSelectedCustomerId('');
        loadCatalogs(); // Refresh stock numbers
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Transaction failed. Check stock availability.');
    }
  };

  // WhatsApp and Email link generators
  const shareWhatsApp = () => {
    if (!latestSaleRecord) return;
    const companyName = "AUK marine";
    const text = `Hello, here is your invoice ${latestSaleRecord.invoiceNumber} from ${companyName}. Total Amount: ₹${latestSaleRecord.totalAmount.toFixed(2)}. Thank you for shopping with us!`;
    window.open(`https://wa.me/${latestSaleRecord.customer?.phone || ''}?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareEmail = () => {
    if (!latestSaleRecord) return;
    const subject = `Invoice ${latestSaleRecord.invoiceNumber}`;
    const body = `Dear Customer,\n\nPlease find attached details of your invoice ${latestSaleRecord.invoiceNumber}.\nTotal Amount due: ₹${latestSaleRecord.totalAmount.toFixed(2)}.\n\nBest Regards,\nAUK marine Logistics.`;
    window.open(`mailto:${latestSaleRecord.customer?.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT COLUMN: CART & SEARCH */}
      <div className="lg:col-span-2 space-y-5">
        
        {/* LIVE SEARCH & BARCODE INPUT */}
        <div className="glass-card p-4 rounded-2xl flex gap-3 relative">
          
          {/* SEARCH BOX */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, SKU code, scan barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-55/45 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
            />
          </div>

          {/* QUICK SCAN SIMULATION DROPDOWN SHORTCUTS */}
          <div className="flex gap-2">
            <button 
              onClick={() => handleBarcodeScan('035762118331')}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs rounded-xl border border-gray-200 dark:border-gray-700 font-semibold flex items-center gap-1.5"
            >
              <Barcode className="h-4 w-4 text-brand-500" />
              <span className="hidden sm:inline">Scan Oil</span>
            </button>
            <button 
              onClick={() => handleBarcodeScan('753759247348')}
              className="px-3 py-2 bg-gray-55/45 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700 text-xs rounded-xl border border-gray-200 dark:border-gray-700 font-semibold flex items-center gap-1.5"
            >
              <Barcode className="h-4 w-4 text-brand-500" />
              <span className="hidden sm:inline">Scan Garmin</span>
            </button>
          </div>

          {/* FLOATING SEARCH RESULTS */}
          {searchResults.length > 0 && (
            <div className="absolute left-4 right-4 top-16 glass-card rounded-2xl shadow-xl z-50 divide-y divide-gray-100 dark:divide-gray-750 max-h-60 overflow-y-auto">
              {searchResults.map(p => (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="w-full text-left p-3 hover:bg-gray-55/45 dark:hover:bg-gray-750 text-xs flex justify-between items-center transition-colors"
                >
                  <div>
                    <span className="font-bold text-gray-900 dark:text-white">{p.name}</span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">Code: {p.code} | Barcode: {p.barcode || 'N/A'}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-brand-650 dark:text-brand-400">₹{p.sellingPrice.toFixed(2)}</span>
                    <span className="block text-[10px] text-gray-400 mt-0.5">Stock: {p.quantity} left</span>
                  </div>
                </button>
              ))}
            </div>
          )}

        </div>

        {/* CART BUILDER LIST */}
        <div className="glass-card rounded-2xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-750 flex items-center gap-2 bg-gray-50/50 dark:bg-gray-800/40">
            <ShoppingCart className="h-4.5 w-4.5 text-brand-500" />
            <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Checkout Cart ({cart.length} items)</h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-755 max-h-[460px] overflow-y-auto">
            {cart.length === 0 ? (
              <div className="py-20 text-center text-xs text-gray-400">
                Cart is empty. Search products above or scan barcodes to begin billing.
              </div>
            ) : (
              cart.map((item) => {
                const itemDisc = parseFloat(item.itemDiscount);
                const safeItemDiscount = isNaN(itemDisc) ? 0 : Math.max(0, itemDisc);
                const subCost = Math.max(0, item.sellingPrice - safeItemDiscount) * item.cartQuantity;
                const gst = subCost * (item.gstPercent / 100);
                const total = subCost + gst;

                return (
                  <div key={item.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs">
                    
                    {/* Product Metadata */}
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-gray-900 dark:text-white block truncate">{item.name}</span>
                      <span className="text-[10px] text-gray-400 font-mono mt-0.5 block">SKU: {item.code} | Stock: {item.quantity}</span>
                    </div>

                    {/* Quantity Adjustment Buttons */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      <button 
                        onClick={() => updateQty(item.id, -1)}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-750 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Minus className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                      <span className="font-bold text-gray-900 dark:text-white w-6 text-center">{item.cartQuantity}</span>
                      <button 
                        onClick={() => updateQty(item.id, 1)}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-755 hover:bg-gray-50 dark:hover:bg-gray-700"
                      >
                        <Plus className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    </div>

                    {/* Pricing details and discount fields */}
                    <div className="flex flex-wrap items-center gap-4 shrink-0">
                      
                      {/* Price fields */}
                      <div className="w-24">
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Unit Selling Price</span>
                        <span className="font-bold text-gray-800 dark:text-gray-250 block">₹{item.sellingPrice.toFixed(2)}</span>
                      </div>

                      {/* Item level discount field */}
                      <div className="w-24">
                        <label className="text-[9px] uppercase font-bold text-gray-450 block">Unit Disc (₹)</label>
                        <input
                          type="number"
                          value={item.itemDiscount}
                          onChange={(e) => updateItemDiscount(item.id, e.target.value)}
                          className="w-16 px-1.5 py-0.5 bg-gray-50 dark:bg-gray-750 border border-gray-205 dark:border-gray-700 text-xs font-bold rounded focus:ring-1 focus:ring-brand-500 outline-none text-gray-900 dark:text-white"
                          placeholder="0"
                        />
                      </div>

                      {/* Item Total with Tax */}
                      <div className="w-24 text-right">
                        <span className="text-[9px] uppercase font-bold text-gray-400 block">Total (Tax Incl.)</span>
                        <span className="font-extrabold text-brand-600 dark:text-brand-400 block">₹{total.toFixed(2)}</span>
                      </div>

                      {/* Remove item button */}
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>

                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: CUSTOMER & PAYMENT SUMMARY */}
      <div className="space-y-5">
        
        {/* CUSTOMER SELECTOR */}
        <div className="glass-card p-5 rounded-2xl space-y-4">
          <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Billing Customer</h3>
          
          <select 
            value={selectedCustomerId}
            onChange={(e) => setSelectedCustomerId(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
          >
            <option value="">Walk-In Customer (Counter Sale)</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.phone}) - Bal: ₹{c.outstandingBalance.toFixed(2)}
              </option>
            ))}
          </select>
        </div>

        {/* FINANCIAL CALCULATOR SUMMARY */}
        <div className="glass-card p-5 rounded-2xl space-y-5">
          <h3 className="font-bold text-xs text-gray-900 dark:text-white uppercase tracking-wider">Payment Summary</h3>
          
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Subtotal (Excl. Tax)</span>
              <span>₹{totals.subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-gray-400">
              <span>Tax (GST) Amount</span>
              <span>₹{totals.totalGst.toFixed(2)}</span>
            </div>
            
            {/* INVOICE LEVEL DISCOUNT */}
            <div className="flex justify-between items-center py-1 border-t border-b border-gray-50 dark:border-gray-750">
              <span className="text-gray-500 dark:text-gray-400">Invoice Discount (₹)</span>
              <input
                type="number"
                value={invoiceDiscount}
                onChange={(e) => setInvoiceDiscount(e.target.value)}
                className="w-20 px-2 py-1 bg-gray-55/45 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-right text-xs font-bold rounded-lg focus:ring-1 focus:ring-brand-500 outline-none text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-2">
              <span>Total Payable</span>
              <span className="text-brand-650 dark:text-brand-400 text-lg font-extrabold">₹{totals.finalTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* PAYMENT METHOD CHOICES */}
          <div className="space-y-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 block">Payment Method</span>
            <div className="grid grid-cols-2 gap-2">
              {['Cash', 'Card', 'UPI', 'Credit'].map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-2 px-3 border rounded-xl text-xs font-semibold transition-all ${
                    paymentMethod === method
                      ? 'bg-brand-500 border-brand-500 text-white shadow shadow-brand-500/20'
                      : 'bg-transparent border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
            {paymentMethod === 'Credit' && !selectedCustomerId && (
              <span className="block text-[10px] text-red-500 mt-1">⚠️ Credit option requires selecting a customer ledger.</span>
            )}
          </div>

          {/* CHECKOUT TRIGGERS */}
          <button
            type="button"
            onClick={handleCheckout}
            disabled={cart.length === 0 || (paymentMethod === 'Credit' && !selectedCustomerId)}
            className="w-full py-3 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 text-white rounded-xl font-bold text-xs shadow-md shadow-brand-500/20 flex justify-center items-center gap-2 cursor-pointer"
          >
            <span>Proceed to Checkout</span>
            <ArrowRight className="h-4 w-4" />
          </button>

        </div>

      </div>

      {/* PRINTABLE RECEIPT INVOICE MODAL */}
      {checkoutSuccess && latestSaleRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm overflow-y-auto">
          <div className="glass-card max-w-md w-full rounded-2xl shadow-2xl overflow-hidden my-8 animate-scale-up">
            
            {/* Success Bar */}
            <div className="p-4 bg-emerald-500 text-white flex items-center gap-2">
              <Check className="h-5 w-5 border-2 border-white rounded-full p-0.5" />
              <span className="font-bold text-xs">Transaction Completed Successfully!</span>
            </div>

            {/* PRINTABLE AREA */}
            <div id="pos-invoice-receipt" className="p-6 bg-white text-gray-955 space-y-6 text-xs">
              
              {/* Header */}
              <div className="text-center space-y-1 pb-4 border-b border-gray-100">
                <h2 className="text-sm font-extrabold tracking-wider uppercase">AUK marine Supplies</h2>
                <p className="text-[10px] text-gray-500">Slipway 4, Yacht Marina, Port City</p>
                <p className="text-[10px] text-gray-500">Phone: +1 800 555 0100 | GST: 27DDDDD4444D4Z4</p>
              </div>

              {/* Invoice Meta */}
              <div className="grid grid-cols-2 gap-y-1.5 text-[10px] text-gray-650">
                <div><strong>Invoice No:</strong> {latestSaleRecord.invoiceNumber}</div>
                <div className="text-right"><strong>Date:</strong> {new Date(latestSaleRecord.date).toLocaleString()}</div>
                <div><strong>Customer:</strong> {latestSaleRecord.customer?.name || 'Walk-In Customer'}</div>
                <div className="text-right"><strong>Payment Method:</strong> {latestSaleRecord.paymentMethod}</div>
              </div>

              {/* Cart Table */}
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                    <th className="pb-1.5">Description</th>
                    <th className="pb-1.5 text-center">Qty</th>
                    <th className="pb-1.5 text-right">Price</th>
                    <th className="pb-1.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {latestSaleRecord.saleItems?.map(item => (
                    <tr key={item.id}>
                      <td className="py-2 font-medium">
                        {item.product?.name}
                        {item.discount > 0 && <span className="block text-[8px] text-red-500">Disc: -₹{item.discount.toFixed(2)}</span>}
                      </td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">₹{(item.rate - item.discount).toFixed(2)}</td>
                      <td className="py-2 text-right">₹{item.totalCost.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Summary */}
              <div className="space-y-1.5 border-t border-gray-200 pt-3 text-[10px]">
                <div className="flex justify-between text-gray-500">
                  <span>General Invoice Discount</span>
                  <span>-₹{latestSaleRecord.discount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>GST Amount (included)</span>
                  <span>₹{latestSaleRecord.gstAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-xs text-gray-900 border-t border-dashed border-gray-200 pt-1.5">
                  <span>NET TOTAL</span>
                  <span>₹{latestSaleRecord.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center text-[9px] text-gray-400 border-t border-gray-100 pt-4">
                Thank you for your business! Have a safe journey at sea.
              </div>

            </div>

            {/* ACTION FOOTER */}
            <div className="p-4 bg-gray-50 dark:bg-gray-750 border-t border-gray-150 dark:border-gray-700 flex flex-col gap-2">
              <button 
                onClick={() => window.print()}
                className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                <span>Print Receipt</span>
              </button>
              
              <div className="flex gap-2">
                <button 
                  onClick={shareWhatsApp}
                  className="w-1/2 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
                >
                  <MessageSquare className="h-4 w-4 text-emerald-500" />
                  <span>WhatsApp</span>
                </button>
                <button 
                  onClick={shareEmail}
                  className="w-1/2 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
                >
                  <Mail className="h-4 w-4 text-red-400" />
                  <span>Email Invoice</span>
                </button>
              </div>

              <button 
                onClick={() => setCheckoutSuccess(false)}
                className="w-full py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 dark:hover:bg-gray-700 mt-1"
              >
                Close Receipt
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default SalesPOS;
