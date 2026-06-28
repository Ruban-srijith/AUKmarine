import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  UserSquare2, Search, Plus, Trash2, Edit, Mail, Phone, 
  MapPin, FileText, Landmark, X, AlertTriangle 
} from 'lucide-react';

const Suppliers = () => {
  const { user, hasRole } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  
  const [formFields, setFormFields] = useState({
    name: '', phone: '', email: '', address: '', gstNumber: '', notes: '', outstandingBalance: 0
  });

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/suppliers');
      if (res.data.success) {
        setSuppliers(res.data.suppliers);
      }
    } catch (err) {
      console.error('Failed to load suppliers list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setFormFields({
      name: '', phone: '', email: '', address: '', gstNumber: '', notes: '', outstandingBalance: 0
    });
    setSupplierModalOpen(true);
  };

  const handleOpenEditModal = (supplier) => {
    setEditingSupplier(supplier);
    setFormFields({
      name: supplier.name,
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      gstNumber: supplier.gstNumber || '',
      notes: supplier.notes || '',
      outstandingBalance: supplier.outstandingBalance
    });
    setSupplierModalOpen(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormFields(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveSupplier = async (e) => {
    e.preventDefault();
    if (!formFields.name) return;

    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, formFields);
      } else {
        await api.post('/suppliers', formFields);
      }
      setSupplierModalOpen(false);
      fetchSuppliers();
    } catch (err) {
      alert(err.response?.data?.message || 'Error occurred.');
    }
  };

  const handleDeleteSupplier = async (id) => {
    if (!window.confirm('Delete supplier? All purchase histories will remain but the profiles will be detached.')) return;
    try {
      const res = await api.delete(`/suppliers/${id}`);
      if (res.data.success) {
        fetchSuppliers();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete supplier.');
    }
  };

  // Filter supplier listings in memory
  const filteredSuppliers = suppliers.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.email && s.email.toLowerCase().includes(search.toLowerCase())) ||
    (s.phone && s.phone.includes(search))
  );

  return (
    <div className="space-y-6">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserSquare2 className="h-5.5 w-5.5 text-brand-500" />
            <span>Supplier Register</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage supply contacts, outstanding payments, and catalog details.</p>
        </div>

        {hasRole(['Owner', 'Manager']) && (
          <button 
            onClick={handleOpenAddModal}
            className="px-4 py-2 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-655 rounded-xl flex items-center gap-2 shadow shadow-brand-500/20 cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Add Supplier</span>
          </button>
        )}
      </div>

      {/* FILTER SEARCH BAR */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm flex items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4.5 w-4.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by supplier name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {/* LIST GRID */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-xs">No suppliers matched your search.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.map((s) => (
            <div key={s.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/60 shadow-sm p-5 space-y-4 hover-lift flex flex-col justify-between">
              
              {/* Profile Card Header */}
              <div className="space-y-1">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-bold text-sm text-gray-900 dark:text-white">{s.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    s.outstandingBalance > 0 ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'
                  }`}>
                    {s.outstandingBalance > 0 ? `Owes: ₹${s.outstandingBalance.toFixed(2)}` : 'Settle'}
                  </span>
                </div>
                {s.gstNumber && <span className="text-[10px] text-gray-400 font-mono">GSTIN: {s.gstNumber}</span>}
              </div>

              {/* Information listings */}
              <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
                {s.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-gray-400" />
                    <span>{s.phone}</span>
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-gray-400" />
                    <span>{s.email}</span>
                  </div>
                )}
                {s.address && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{s.address}</span>
                  </div>
                )}
                {s.notes && (
                  <div className="p-2.5 bg-gray-50 dark:bg-gray-750/30 rounded-lg text-[10px] text-gray-400">
                    {s.notes}
                  </div>
                )}
              </div>

              {/* Action operations */}
              <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-gray-750 text-[10px] text-gray-400 font-medium">
                <div>
                  <span>Products: {s._count?.products || 0} | Inwards: {s._count?.purchases || 0}</span>
                </div>
                <div className="flex gap-2">
                  {hasRole(['Owner', 'Manager']) && (
                    <button 
                      onClick={() => handleOpenEditModal(s)}
                      className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-450"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {hasRole(['Owner']) && (
                    <button 
                      onClick={() => handleDeleteSupplier(s.id)}
                      className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

            </div>
          ))}
        </div>
      )}

      {/* MODAL: ADD/EDIT SUPPLIER */}
      {supplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 max-w-md w-full rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-gray-100 dark:border-gray-750 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                {editingSupplier ? `Edit Supplier: ${editingSupplier.name}` : 'Register New Supplier'}
              </h3>
              <button onClick={() => setSupplierModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-6 space-y-4">
              
              {/* NAME */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Supplier Name *</label>
                <input type="text" name="name" required value={formFields.name} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* PHONE */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Phone Number</label>
                  <input type="text" name="phone" value={formFields.phone} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
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
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Store Address</label>
                <textarea name="address" value={formFields.address} onChange={handleFormChange} rows="2" className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white resize-none" />
              </div>

              {/* NOTES */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Internal Notes</label>
                <textarea name="notes" value={formFields.notes} onChange={handleFormChange} rows="2" className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white resize-none" />
              </div>

              {/* OUTSTANDING BALANCE (ONLY DIRECT EDIT ON NEW, STANDARD USES PO) */}
              {!editingSupplier && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Opening Outstanding Balance (₹)</label>
                  <input type="number" name="outstandingBalance" value={formFields.outstandingBalance} onChange={handleFormChange} className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" />
                </div>
              )}

              {/* ACTIONS */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-750">
                <button type="button" onClick={() => setSupplierModalOpen(false)} className="px-4 py-2 border border-gray-200 dark:border-gray-750 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-750">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold shadow shadow-brand-500/20">
                  Save Supplier
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default Suppliers;
