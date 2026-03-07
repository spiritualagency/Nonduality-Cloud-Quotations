import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { Upload, Plus, Trash2, Edit2, RotateCcw, Search, Filter, ArrowLeft, Save, X } from 'lucide-react';

export default function AdminDashboard() {
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newQuote, setNewQuote] = useState({ text: '', author: '', category: 'Miscellaneous' });
  const [importFile, setImportFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [editingQuote, setEditingQuote] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const navigate = useNavigate();
  const itemsPerPage = 25;

  const categories = [
    'Advaita Vedanta', 'Buddhism', 'Taoism', 'Christian Mysticism', 
    'Sufism', 'Kabbalah', 'Zen', 'Stoicism', 'Inspirational', 
    'Motivational', 'Miscellaneous'
  ];

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (!token) {
      navigate('/login');
    } else {
      fetchQuotes();
    }
  }, [navigate]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/quotes', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      const data = await res.json();
      setQuotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch quotes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) return;
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('adminToken')}`
        },
        body: JSON.stringify({ newPassword }),
      });
      if (!res.ok) throw new Error('Failed to reset password');
      alert('Password reset successfully.');
      setNewPassword('');
    } catch (error) {
      console.error('Failed to reset password:', error);
      alert('Failed to reset password.');
    }
  };

  const handleAddQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuote),
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        alert(`Failed to add quote: ${errorData.error}`);
        return;
      }
      
      setIsAdding(false);
      setNewQuote({ text: '', author: '', category: 'Miscellaneous' });
      fetchQuotes();
    } catch (error) {
      console.error('Failed to add quote:', error);
      alert('Failed to add quote. Check console for details.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;
    try {
      await fetch(`/api/quotes/${id}`, { method: 'DELETE' });
      fetchQuotes();
    } catch (error) {
      console.error('Failed to delete quote:', error);
    }
  };

  const handleResetUsage = async () => {
    if (!confirm('Are you sure you want to reset all usage history?')) return;
    try {
      await fetch('/api/quotes/reset-usage', { method: 'POST' });
      fetchQuotes();
    } catch (error) {
      console.error('Failed to reset usage:', error);
    }
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    const formData = new FormData();
    formData.append('file', logoFile);
    
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const response = await fetch('/api/logo/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      if (response.status === 401) {
        localStorage.removeItem('adminToken');
        window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`);
      }
      alert('Logo uploaded successfully.');
      setLogoFile(null);
    } catch (error) {
      console.error('Failed to upload logo:', error);
      alert('Logo upload failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    const formData = new FormData();
    formData.append('file', importFile);
    
    try {
      setLoading(true);
      const res = await fetch('/api/quotes/import', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      alert(`Successfully imported ${data.addedCount} quotes.`);
      setImportFile(null);
      fetchQuotes();
    } catch (error) {
      console.error('Failed to import quotes:', error);
      alert('Import failed. Check console for details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuote) return;
    try {
      await fetch(`/api/quotes/${editingQuote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingQuote),
      });
      setEditingQuote(null);
      fetchQuotes();
    } catch (error) {
      console.error('Failed to update quote:', error);
      alert('Failed to update quote.');
    }
  };

  const filteredQuotes = quotes.filter(q => {
    const matchesSearch = q.text.toLowerCase().includes(search.toLowerCase()) || 
                          q.author.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory ? q.category === filterCategory : true;
    return matchesSearch && matchesCategory;
  });

  const totalPages = Math.ceil(filteredQuotes.length / itemsPerPage);
  const paginatedQuotes = filteredQuotes.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="min-h-screen bg-ivory text-charcoal p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-charcoal/10 pb-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 rounded-full hover:bg-charcoal/5 transition-colors">
              <ArrowLeft size={24} />
            </Link>
            <h1 className="font-serif text-4xl text-charcoal">Nonduality Admin</h1>
          </div>
          <div className="flex gap-4">
            <button 
              onClick={handleResetUsage}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-charcoal/20 hover:bg-charcoal/5 transition-colors text-sm uppercase tracking-wider"
            >
              <RotateCcw size={16} /> Reset Usage
            </button>
            <div className="flex items-center gap-2">
              <input
                type="password"
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="px-4 py-2 rounded-full border border-charcoal/20 text-sm"
              />
              <button 
                onClick={handleResetPassword}
                className="px-4 py-2 rounded-full bg-charcoal text-ivory hover:bg-charcoal/90 transition-colors text-sm uppercase tracking-wider"
              >
                Reset Password
              </button>
            </div>
            <button 
              onClick={async () => {
                if (!confirm('Are you sure you want to remove double quotes from all quotes?')) return;
                await fetch('/api/quotes/clean', { method: 'POST' });
                alert('Quotes cleaned.');
                fetchQuotes();
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-charcoal/20 hover:bg-charcoal/5 transition-colors text-sm uppercase tracking-wider"
            >
              Clean Quotes
            </button>
            <button 
              onClick={() => setIsAdding(!isAdding)}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-charcoal text-ivory hover:bg-charcoal/90 transition-colors text-sm uppercase tracking-wider"
            >
              <Plus size={16} /> Add Quote
            </button>
          </div>
        </header>

        {isAdding && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-white rounded-3xl p-8 shadow-sm border border-charcoal/5 mb-12"
          >
            <h2 className="font-serif text-2xl mb-6">Add New Quote</h2>
            <form onSubmit={handleAddQuote} className="space-y-6">
              <div>
                <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-sage">Quote Text</label>
                <textarea 
                  required
                  value={newQuote.text}
                  onChange={e => setNewQuote({...newQuote, text: e.target.value})}
                  className="w-full bg-ivory/50 border border-charcoal/10 rounded-xl p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-gold/50"
                  placeholder="The quieter you become..."
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-sage">Author</label>
                  <input 
                    required
                    type="text"
                    value={newQuote.author}
                    onChange={e => setNewQuote({...newQuote, author: e.target.value})}
                    className="w-full bg-ivory/50 border border-charcoal/10 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-gold/50"
                    placeholder="Rumi"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2 uppercase tracking-wider text-sage">Category</label>
                  <select 
                    value={newQuote.category}
                    onChange={e => setNewQuote({...newQuote, category: e.target.value})}
                    className="w-full bg-ivory/50 border border-charcoal/10 rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-gold/50"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button 
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="px-6 py-3 rounded-full hover:bg-charcoal/5 transition-colors uppercase tracking-wider text-sm font-bold"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-3 rounded-full bg-gold text-white hover:bg-gold/90 transition-colors uppercase tracking-wider text-sm font-bold"
                >
                  Save Quote
                </button>
              </div>
            </form>
          </motion.div>
        )}

        <div className="flex justify-between items-center mb-8">
          <div className="flex gap-4 flex-1 max-w-2xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" size={20} />
              <input 
                type="text"
                placeholder="Search quotes or authors..."
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-3 bg-white border border-charcoal/10 rounded-full focus:outline-none focus:ring-2 focus:ring-gold/50"
              />
            </div>
            <div className="relative w-64">
              <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal/40" size={20} />
              <select 
                value={filterCategory}
                onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 pr-4 py-3 bg-white border border-charcoal/10 rounded-full focus:outline-none focus:ring-2 focus:ring-gold/50 appearance-none"
              >
                <option value="">All Categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          
          <div className="flex flex-col gap-4 bg-white p-4 rounded-3xl border border-charcoal/10">
            <div className="flex items-center gap-4">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-full bg-ivory text-charcoal hover:bg-ivory/80 transition-colors text-sm uppercase tracking-wider">
                <Upload size={16} /> Choose File
                <input 
                  type="file" 
                  accept=".csv,.xlsx"
                  onChange={e => setImportFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <button 
                onClick={handleImport}
                disabled={!importFile || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-sage text-white hover:bg-sage/90 transition-colors disabled:opacity-50 text-sm uppercase tracking-wider"
              >
                <Upload size={16} /> {importFile ? importFile.name : 'Import Quotes'}
              </button>
            </div>
            <div className="flex items-center gap-4">
              <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-full bg-ivory text-charcoal hover:bg-ivory/80 transition-colors text-sm uppercase tracking-wider">
                <Upload size={16} /> Choose File
                <input 
                  type="file" 
                  accept="image/png"
                  onChange={e => setLogoFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
              </label>
              <button 
                type="button"
                onClick={handleLogoUpload}
                disabled={!logoFile || loading}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gold text-white hover:bg-gold/90 transition-colors disabled:opacity-50 text-sm uppercase tracking-wider"
              >
                <Upload size={16} /> {logoFile ? logoFile.name : 'Upload Logo'}
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-charcoal/5 overflow-hidden">
          <div className="p-6 border-b border-charcoal/10">
            <h2 className="font-serif text-2xl">Embed Preview</h2>
            <div className="mt-4 w-full h-48 border border-charcoal/10 rounded-xl overflow-hidden">
              <iframe 
                src={`/embed/daily-quote?theme=light`} 
                width="100%" 
                height="100%" 
                frameBorder="0"
                title="Quote Preview"
              />
            </div>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-charcoal/10 bg-ivory/30">
                <th className="p-6 font-bold uppercase tracking-wider text-xs text-sage w-1/2">Quote</th>
                <th className="p-6 font-bold uppercase tracking-wider text-xs text-sage">Author</th>
                <th className="p-6 font-bold uppercase tracking-wider text-xs text-sage">Category</th>
                <th className="p-6 font-bold uppercase tracking-wider text-xs text-sage">Status</th>
                <th className="p-6 font-bold uppercase tracking-wider text-xs text-sage text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-charcoal/50 font-serif text-xl">
                    Loading repository...
                  </td>
                </tr>
              ) : paginatedQuotes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-charcoal/50 font-serif text-xl">
                    No quotes found.
                  </td>
                </tr>
              ) : (
                paginatedQuotes.map(quote => (
                  <tr key={quote.id} className="border-b border-charcoal/5 hover:bg-ivory/30 transition-colors">
                    <td className="p-6">
                      <div className="font-serif text-lg line-clamp-2">{quote.text}</div>
                    </td>
                    <td className="p-6 font-bold text-sm tracking-wider uppercase">{quote.author}</td>
                    <td className="p-6">
                      <span className="px-3 py-1 rounded-full bg-ivory text-xs tracking-wider uppercase border border-charcoal/10">
                        {quote.category}
                      </span>
                    </td>
                    <td className="p-6">
                      {quote.used ? (
                        <span className="text-rose text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-rose"></span> Used
                        </span>
                      ) : (
                        <span className="text-sage text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-sage"></span> Fresh
                        </span>
                      )}
                    </td>
                    <td className="p-6 text-right flex gap-2 justify-end">
                      <button 
                        onClick={() => setEditingQuote(quote)}
                        className="p-2 text-charcoal/40 hover:text-gold transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(quote.id)}
                        className="p-2 text-charcoal/40 hover:text-rose transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-6 border-t border-charcoal/10 flex justify-center gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 rounded-full bg-ivory disabled:opacity-50"
              >
                Previous
              </button>
              <span className="px-4 py-2 font-bold">Page {currentPage} of {totalPages}</span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 rounded-full bg-ivory disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingQuote && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl p-8 shadow-xl max-w-lg w-full"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-serif text-2xl">Edit Quote</h2>
                <button onClick={() => setEditingQuote(null)}><X size={24} /></button>
              </div>
              <form onSubmit={handleUpdateQuote} className="space-y-4">
                <textarea 
                  required
                  value={editingQuote.text}
                  onChange={e => setEditingQuote({...editingQuote, text: e.target.value})}
                  className="w-full bg-ivory/50 border border-charcoal/10 rounded-xl p-4"
                />
                <input 
                  required
                  type="text"
                  value={editingQuote.author}
                  onChange={e => setEditingQuote({...editingQuote, author: e.target.value})}
                  className="w-full bg-ivory/50 border border-charcoal/10 rounded-xl p-4"
                />
                <select 
                  value={editingQuote.category}
                  onChange={e => setEditingQuote({...editingQuote, category: e.target.value})}
                  className="w-full bg-ivory/50 border border-charcoal/10 rounded-xl p-4"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <button type="submit" className="w-full py-3 rounded-full bg-gold text-white font-bold">Save Changes</button>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
