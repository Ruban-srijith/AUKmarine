import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  Users, Search, Plus, Trash2, Edit, Mail, Phone, 
  MapPin, Landmark, Award, X, AlertCircle 
} from 'lucide-react';

const Customers = () => {
  const { user, hasRole } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  const [formFields, setFormFields] = useState({
    name: '', phone: '', email: '', address: '', gstNumber: '', creditLimit: 0, outstandingBalance: 0
  });

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers');
      if (res.data.success) {
        setCustomers(res.data.customers);
      }
    } catch (err) {
      console.error('Failed to load customers list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCustomer(null);
    setFormFields({
      name: '', phone: '', email: '', address: '', gstNumber: '', creditLimit: 10000, outstandingBalance: 0
    });
    setCustomerModalOpen(true);
  };

  const handleOpenEditModal = (customer) => {
    setEditingCustomer(customer);
    setFormFields({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      gstNumber: customer.gstNumber || '',
      creditLimit: customer.creditLimit,
      outstandingBalance: customer.outstandingBalance
    });
    setCustomerModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormFields(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    if (!formFields.name || !formFields.phone) {
      alert('Name and Phone are required.');
      return;
    }

    try {
      if (editingCustomer) {
        await api.put(`/customers/${editingCustomer.id}`, formFields);
      } else {
        await api.post('/customers', formFields);
      }
      setCustomerModalOpen(false);
      fetchCustomers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error occurred.');
    }
  };

  const handleDeleteCustomer = async (id) => {
    if (!window.confirm('Delete customer? Historical sales records will remain in reports, but customer links will clear.')) return;
    try {
      const res = await api.delete(`/customers/${id}`);
      if (res.data.success) {
        fetchCustomers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete customer.');
    }
  };

  // Filter customer listings in memory
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-5.5 w-5.5 text-brand-500" />
            <span>Customer Ledger Directory</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage customer credit accounts, track loyalty rewards points, and ledger dues.</p>
        </div>

        {hasRole(['Owner', 'Manager']) && (
          <button 
            onClick={handleOpenAddModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-655 rounded-xl flex items-center gap-2 shadow shadow-brand-500/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        )}
      </div>

      {/* SEARCH PANEL */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name, phone number, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* CARD LIST GRID */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      ) : filteredCustomers.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-xs">No customer accounts match your query.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredCustomers.map((c) => {
            const hasOverdrawn = c.creditLimit > 0 && c.outstandingBalance >= c.creditLimit;
            return (
              <div key={c.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm p-5 space-y-4 hover-lift flex flex-col justify-between">
                
                {/* Header */}
                <div className="space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <h3 className="font-bold text-sm text-gray-900 dark:text-white">{c.name}</h3>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      c.outstandingBalance > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-green-500/10 text-green-500'
                    }`}>
                      {c.outstandingBalance > 0 ? `Unpaid: ₹${c.outstandingBalance.toFixed(2)}` : 'Clear'}
                    </span>
                  </div>
                  {c.gstNumber && <span className="text-[10px] text-gray-400 font-mono">GST: {c.gstNumber}</span>}
                </div>

                {/* Info listings */}
                <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <span>{c.phone}</span>
                  </div>
                  {c.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span>{c.email}</span>
                    </div>
                  )}
                  
                  {/* Credit indicators */}
                  <div className="flex items-center gap-2">
                    <Landmark className="h-3.5 w-3.5 text-gray-400" />
                    <span>Credit Limit: ₹{c.creditLimit.toFixed(2)}</span>
                  </div>

                  {/* Loyalty indicators */}
                  <div className="flex items-center gap-2 text-brand-600 dark:text-brand-400 font-medium">
                    <Award className="h-3.5 w-3.5 text-brand-500" />
                    <span>Loyalty Rewards: {c.loyaltyPoints} points</span>
                  </div>

                  {hasOverdrawn && (
                    <div className="p-2 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-semibold rounded-lg flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5" />
                      <span>Warning: Outstanding balance has hit credit limit.</span>
                    </div>
                  )}
                </div>

                {/* Footer operations */}
                <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-750 text-[10px] text-gray-400 font-medium">
                  <div>
                    <span>Total Sales Transactions: {c._count?.sales || 0}</span>
                  </div>
                  <div className="flex gap-2">
                    {hasRole(['Owner', 'Manager']) && (
                      <button 
                        onClick={() => handleOpenEditModal(c)}
                        className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-450"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {hasRole(['Owner']) && (
                      <button 
                        onClick={() => handleDeleteCustomer(c.id)}
                        className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD/EDIT CUSTOMER */}
      {customerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 max-w-md w-full rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-gray-100 dark:border-gray-750 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Register New Customer'}
              </h3>
              <button onClick={() => setCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-6 space-y-4">
              
              {/* NAME */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Customer Name *</label>
                <input type="text" name="name" required value={formFields.name} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* PHONE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Phone Number *</label>
                  <input type="text" name="phone" required value={formFields.phone} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                </div>
                {/* GST */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">GSTIN Number</label>
                  <input type="text" name="gstNumber" value={formFields.gstNumber} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                </div>
              </div>

              {/* EMAIL */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address</label>
                <input type="email" name="email" value={formFields.email} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
              </div>

              {/* ADDRESS */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Billing Address</label>
                <textarea name="address" value={formFields.address} onChange={handleFormChange} rows="2" className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* CREDIT LIMIT */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Credit Limit (₹)</label>
                  <input type="number" name="creditLimit" value={formFields.creditLimit} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                </div>
                {/* OUTSTANDING */}
                {!editingCustomer && (
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Opening Dues (₹)</label>
                    <input type="number" name="outstandingBalance" value={formFields.outstandingBalance} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                  </div>
                )}
              </div>

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-750">
                <button type="button" onClick={() => setCustomerModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-750 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-750">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow shadow-brand-500/20">
                  Save Customer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Customers;
