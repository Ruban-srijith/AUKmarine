import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  UserCog, Search, Plus, Trash2, Edit, Check, 
  ShieldAlert, Shield, ShieldCheck, User, History, X 
} from 'lucide-react';

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const isOwner = currentUser?.role === 'Owner';

  const [users, setUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal states
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedRole, setSelectedRole] = useState('Staff');
  const [userName, setUserName] = useState('');

  // Create Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Staff');

  const [activeSubTab, setActiveSubTab] = useState('list'); // list, audit

  const loadUserData = async () => {
    setLoading(true);
    try {
      const [usersRes, logsRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/audit-logs')
      ]);

      if (usersRes.data.success) setUsers(usersRes.data.users);
      if (logsRes.data.success) setAuditLogs(logsRes.data.logs);
    } catch (err) {
      console.error('Failed to load user management catalogs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUserData();
  }, []);

  const handleOpenRoleModal = (u) => {
    // Managers cannot edit Owners
    if (u.role === 'Owner' && !isOwner) {
      alert('Managers are not authorized to edit Owner accounts.');
      return;
    }
    setSelectedUser(u);
    setSelectedRole(u.role);
    setUserName(u.name);
    setRoleModalOpen(true);
  };

  const handleSaveUserRole = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const res = await api.put(`/users/${selectedUser.id}`, {
        role: selectedRole,
        name: userName
      });

      if (res.data.success) {
        setRoleModalOpen(false);
        loadUserData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user.');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) {
      alert('Please fill out all fields.');
      return;
    }
    try {
      const res = await api.post('/users', {
        name: newUserName,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole
      });
      if (res.data.success) {
        setCreateModalOpen(false);
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('Staff');
        loadUserData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create user.');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!isOwner) {
      alert('Only Owners are authorized to delete user accounts.');
      return;
    }
    if (!window.confirm('Delete this user account? Access will be revoked immediately.')) return;
    try {
      const res = await api.delete(`/users/${id}`);
      if (res.data.success) {
        loadUserData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="glass-card p-6 rounded-2xl flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <UserCog className="h-5.5 w-5.5 text-brand-500" />
            <span>User Access Control</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Adjust roles, manage security levels, and audit system activities.
          </p>
        </div>
        <button 
          onClick={() => setCreateModalOpen(true)}
          className="px-4 py-2.5 text-xs font-bold text-white bg-brand-500 hover:bg-brand-600 rounded-xl flex items-center gap-1.5 shadow shadow-brand-500/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add New User</span>
        </button>
      </div>

      {/* SUB-TABS */}
      <div className="glass-card p-4 rounded-2xl space-y-4">
        
        <div className="flex border-b border-gray-100 dark:border-gray-750 text-xs font-semibold pb-1 gap-4">
          <button 
            onClick={() => setActiveSubTab('list')}
            className={`pb-2 border-b-2 px-1 transition-all ${activeSubTab === 'list' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-505 dark:text-gray-400'}`}
          >
            Registered Users ({users.length})
          </button>
          <button 
            onClick={() => setActiveSubTab('audit')}
            className={`pb-2 border-b-2 px-1 transition-all ${activeSubTab === 'audit' ? 'border-brand-500 text-brand-600 dark:text-brand-400' : 'border-transparent text-gray-505 dark:text-gray-400'}`}
          >
            System Audit Trails
          </button>
        </div>

        {/* LIST TABLE VIEW */}
        {activeSubTab === 'list' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-55 dark:bg-gray-750 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Email Address</th>
                  <th className="px-5 py-3">Assigned Role</th>
                  <th className="px-5 py-3">Date Registered</th>
                  <th className="px-5 py-3 text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                {loading ? (
                  <tr><td colSpan="5" className="text-center py-6">Loading user catalogs...</td></tr>
                ) : (
                  users.map(u => {
                    const isTargetOwner = u.role === 'Owner';
                    const canEditUser = isOwner || !isTargetOwner;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850">
                        
                        {/* Name */}
                        <td className="px-5 py-4 font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-950/40 text-brand-650 flex items-center justify-center font-bold text-xs uppercase">
                            {u.name.charAt(0)}
                          </div>
                          <span>{u.name}</span>
                        </td>

                        {/* Email */}
                        <td className="px-5 py-4 font-medium">{u.email}</td>

                        {/* Role Badge */}
                        <td className="px-5 py-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                            u.role === 'Owner' ? 'bg-red-500/10 text-red-500' :
                            u.role === 'Manager' ? 'bg-amber-500/10 text-amber-600' : 'bg-gray-100 dark:bg-gray-750 text-gray-555 dark:text-gray-400'
                          }`}>
                            {u.role === 'Owner' ? <ShieldCheck className="h-3 w-3" /> : u.role === 'Manager' ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                            <span>{u.role}</span>
                          </span>
                        </td>

                        {/* Date */}
                        <td className="px-5 py-4 text-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            {canEditUser && (
                              <button 
                                onClick={() => handleOpenRoleModal(u)}
                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-55 dark:hover:bg-gray-750 text-gray-550 dark:text-gray-400"
                                title="Edit user"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {isOwner && u.id !== currentUser?.id && (
                              <button 
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1.5 rounded-lg border border-red-200 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-500"
                                title="Delete user"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* AUDIT LOG TABLE VIEW */}
        {activeSubTab === 'audit' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-500 dark:text-gray-400">
              <thead className="bg-gray-55 dark:bg-gray-750 text-gray-700 dark:text-gray-300 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3">Timestamp</th>
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Action Tag</th>
                  <th className="px-5 py-3 rounded-r-lg">Details Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-750">
                {loading ? (
                  <tr><td colSpan="4" className="text-center py-6">Loading audit trails...</td></tr>
                ) : auditLogs.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-6">No audits logged.</td></tr>
                ) : (
                  auditLogs.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850">
                      
                      {/* Date */}
                      <td className="px-5 py-4 font-mono text-[10px] text-gray-400 shrink-0">
                        {new Date(l.timestamp).toLocaleString()}
                      </td>

                      {/* User details */}
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{l.user?.name || 'System / Seed'}</div>
                        <span className="text-[9px] text-gray-405 block uppercase tracking-wider">{l.user?.role || 'SYSTEM'}</span>
                      </td>

                      {/* Action Tag */}
                      <td className="px-5 py-4 font-mono font-bold text-brand-600">
                        {l.action}
                      </td>

                      {/* Action description Details */}
                      <td className="px-5 py-4 font-medium text-gray-700 dark:text-gray-300 max-w-sm truncate">
                        {l.details}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* MODAL: EDIT USER ROLE */}
      {roleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-gray-100 dark:border-gray-750 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/40">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Edit User Access</h3>
              <button onClick={() => setRoleModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleSaveUserRole} className="p-6 space-y-4">
              
              {/* NAME */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">User Full Name</label>
                <input 
                  type="text" 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" 
                />
              </div>

              {/* ROLE */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned Security Role</label>
                <select 
                  value={selectedRole} 
                  onChange={(e) => setSelectedRole(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white font-semibold"
                >
                  <option value="Staff">Staff (POS cash checkout only)</option>
                  <option value="Manager">Manager (Inventory, POS, Purchases access)</option>
                  {isOwner && <option value="Owner">Owner (Root administrative access)</option>}
                </select>
              </div>

              {/* SAVE */}
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setRoleModalOpen(false)} className="w-1/2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-750">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow shadow-brand-500/20"
                >
                  Save Changes
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW USER */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
          <div className="glass-card max-w-sm w-full rounded-2xl shadow-xl overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-gray-100 dark:border-gray-750 flex justify-between items-center bg-gray-55/60 dark:bg-gray-800/60">
              <h3 className="font-bold text-sm text-gray-900 dark:text-white">Create New User Account</h3>
              <button onClick={() => setCreateModalOpen(false)} className="text-gray-400 hover:text-gray-500"><X className="h-5 w-5" /></button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              
              {/* NAME */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Full Name *</label>
                <input 
                  type="text" 
                  required
                  placeholder="John Doe"
                  value={newUserName} 
                  onChange={(e) => setNewUserName(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" 
                />
              </div>

              {/* EMAIL */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Email Address *</label>
                <input 
                  type="email" 
                  required
                  placeholder="john@marine.com"
                  value={newUserEmail} 
                  onChange={(e) => setNewUserEmail(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" 
                />
              </div>

              {/* PASSWORD */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Password *</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={newUserPassword} 
                  onChange={(e) => setNewUserPassword(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white" 
                />
              </div>

              {/* ROLE */}
              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-1">Assigned Security Role *</label>
                <select 
                  value={newUserRole} 
                  onChange={(e) => setNewUserRole(e.target.value)} 
                  className="w-full px-3.5 py-2.5 bg-gray-55/40 dark:bg-gray-750 border border-gray-200 dark:border-gray-700 text-xs rounded-xl outline-none text-gray-900 dark:text-white font-semibold"
                >
                  <option value="Staff">Staff (POS cash checkout only)</option>
                  <option value="Manager">Manager (Inventory, POS, Purchases access)</option>
                  {isOwner && <option value="Owner">Owner (Root administrative access)</option>}
                </select>
              </div>

              {/* ACTIONS */}
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setCreateModalOpen(false)} className="w-1/2 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-750">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow shadow-brand-500/20"
                >
                  Create User
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default UsersPage;
