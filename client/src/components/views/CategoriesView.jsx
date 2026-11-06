import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Tag, Trash2, X } from 'lucide-react';
import { categoryApi } from '../../api/apiClient';

export default function CategoriesView({ initialType = 'expense' }) {
  const [activeTab, setActiveTab] = useState(initialType);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    color: '#3B82F6',
    icon: 'tag',
  });

  const loadCategories = (tab) => {
    categoryApi.getAll({ type: tab })
      .then((res) => {
        if (res.data?.success) {
          setCategories(res.data.data || []);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadCategories(activeTab);
  }, [activeTab]);

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      await categoryApi.create({
        ...formData,
        type: activeTab,
      });
      setModalOpen(false);
      setFormData({ name: '', type: activeTab, color: '#3B82F6', icon: 'tag' });
      loadCategories(activeTab);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create category');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm('Delete this custom category?')) return;
    try {
      await categoryApi.delete(id);
      loadCategories(activeTab);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--text)]">Categories</h2>
          <p className="text-xs text-[var(--text-secondary)]">Classify your income and expenses</p>
        </div>
        <button
          onClick={() => {
            setFormData((prev) => ({ ...prev, type: activeTab }));
            setModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:opacity-95"
        >
          <Plus className="size-4" />
          Add Category
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] pb-2 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('expense')}
          className={`rounded-lg px-4 py-2 transition ${
            activeTab === 'expense'
              ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
          }`}
        >
          Expense Categories
        </button>
        <button
          onClick={() => setActiveTab('income')}
          className={`rounded-lg px-4 py-2 transition ${
            activeTab === 'income'
              ? 'bg-[var(--primary-soft)] text-[var(--primary)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--surface-raised)] hover:text-[var(--text)]'
          }`}
        >
          Income Categories
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <RefreshCw className="size-6 animate-spin text-[var(--primary)]" />
        </div>
      ) : categories.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => (
            <div
              key={cat._id}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-xs transition hover:shadow-md"
            >
              <div className="flex items-center gap-3">
                <div
                  className="grid size-9 place-items-center rounded-xl text-white shadow-xs"
                  style={{ backgroundColor: cat.color || '#3B82F6' }}
                >
                  <Tag className="size-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[var(--text)]">{cat.name}</div>
                  <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)]">
                    <span>{cat.isSystem ? 'System Category' : 'Custom'}</span>
                    <span>•</span>
                    <span>{cat.usageCount || 0} transactions</span>
                  </div>
                </div>
              </div>

              {!cat.isSystem && (
                <button
                  onClick={() => handleDeleteCategory(cat._id)}
                  title="Delete Category"
                  className="text-[var(--text-muted)] hover:text-rose-600 transition"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center text-sm text-[var(--text-secondary)]">
          <p className="font-semibold">No categories found</p>
        </div>
      )}

      {/* Add Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
              <h3 className="text-base font-bold text-[var(--text)]">Add Custom Category</h3>
              <button onClick={() => setModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text)]">
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Gym & Fitness, Software, Pet Care"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5 text-[var(--text)] focus:border-[var(--primary)] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-[var(--text)] mb-1">Badge Color</label>
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData((prev) => ({ ...prev, color: e.target.value }))}
                  className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-xl border border-[var(--border)] px-4 py-2 text-xs font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-raised)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="rounded-xl bg-[var(--primary)] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95 disabled:opacity-50"
                >
                  {actionLoading ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
