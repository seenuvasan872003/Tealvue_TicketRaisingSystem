import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import { getCategories } from '../services/ticketApi';
import API from '../services/authApi';
import { toast } from 'react-toastify';
import logger from '../utils/logger';
import { useConfirm } from '../context/ConfirmContext';

const Categories = () => {
  const confirm = useConfirm();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCategory, setNewCategory] = useState('');
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingValue, setEditingValue] = useState('');

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data } = await getCategories();
      setCategories(data || []);
      logger.success('Categories', 'fetchCategories', 'Successfully loaded ticket categories');
    } catch (err) {
      logger.error('Categories', 'fetchCategories', 'Failed to load categories', err);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmed = newCategory.trim();
    if (!trimmed) return;
    const formatted = trimmed.replace(/\b\w/g, l => l.toUpperCase());

    if (categories.includes(formatted)) {
      toast.error('Category already exists');
      return;
    }

    try {
      await API.post('/teams/categories', { name: formatted });
      setCategories([...categories, formatted].sort((a,b)=>a.localeCompare(b)));
      setNewCategory('');
      toast.success(`Category "${formatted}" created successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add category');
    }
  };

  const handleDeleteCategory = async (cat) => {
    const defaultCategories = ['General', 'Technical', 'Billing', 'HR', 'Other'];
    if (defaultCategories.includes(cat)) {
      toast.error('Cannot delete default system categories');
      return;
    }
    const ok = await confirm(`Are you sure you want to delete category "${cat}"?`, 'Confirm Deletion');
    if (!ok) return;

    try {
      await API.delete(`/teams/categories/${cat}`);
      setCategories(prev => prev.filter(c => c !== cat));
      toast.success(`Category "${cat}" deleted successfully`);
    } catch (err) {
      toast.error('Failed to delete category');
    }
  };

  const startEdit = (index, val) => {
    const defaultCategories = ['General', 'Technical', 'Billing', 'HR', 'Other'];
    if (defaultCategories.includes(val)) {
      toast.error('Cannot edit default system categories');
      return;
    }
    setEditingIndex(index);
    setEditingValue(val);
  };

  const handleSaveEdit = async (index, oldVal) => {
    const trimmed = editingValue.trim();
    if (!trimmed) return;
    const formatted = trimmed.replace(/\b\w/g, l => l.toUpperCase());

    try {
      await API.put(`/teams/categories/${oldVal}`, { name: formatted });
      setCategories(prev => {
        const updated = [...prev];
        updated[index] = formatted;
        return updated.sort((a,b)=>a.localeCompare(b));
      });
      setEditingIndex(null);
      setEditingValue('');
      toast.success('Category updated successfully');
    } catch (err) {
      toast.error('Failed to update category');
    }
  };
  const defaultCategories = ['General', 'Technical', 'Billing', 'HR', 'Other'];

  return (
    <div className="page-body fade-in">
      <div className="page-header mb-6">
        <div>
          <h1 className="page-title">Manage Categories</h1>
          <p className="page-subtitle">Add, edit, or delete ticket support categories.</p>
        </div>
      </div>

      <div className="card p-6 max-w-[600px] bg-[var(--color-card)] border border-[var(--color-border)] rounded-xl">
        <form onSubmit={handleAddCategory} className="flex gap-2.5 mb-6">
          <input
            type="text"
            placeholder="Create new category (e.g. Sales, Hardware)..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg text-white py-2.5 px-3.5 text-[13px] outline-none"
            required
          />
          <button type="submit" className="btn btn-primary flex items-center gap-1.5">
            <Plus size={16} /> Add Category
          </button>
        </form>

        {loading ? (
          <div className="p-[30px] text-center"><div className="spinner" /></div>
        ) : (
          <div className="flex flex-col gap-2">
            {categories.map((cat, index) => {
              const isDefault = defaultCategories.includes(cat);
              const isEditing = editingIndex === index;

              return (
                <div
                  key={index}
                  className="flex justify-between items-center bg-[#161b22] border border-[var(--color-border)] rounded-lg py-2.5 px-4"
                >
                  <div className="flex items-center gap-2.5 flex-1">
                    <Tag size={14} className={isDefault ? 'text-[var(--color-teal)]' : 'text-[#acacac]'} />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        className="bg-[var(--color-surface)] border border-[var(--color-teal)] rounded-md text-white py-1 px-2 text-[13px] w-4/5 outline-none"
                      />
                    ) : (
                      <span className="text-sm font-medium text-white">
                        {cat} {isDefault && <span className="text-[10px] text-[var(--color-teal)] ml-1.5 bg-[rgba(20,160,125,0.08)] py-0.5 px-1.5 rounded">Default</span>}
                      </span>
                    )}
                  </div>

                  {!isDefault && (
                    <div className="flex gap-1.5">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(index, cat)}
                            className="bg-none border-none text-[var(--color-success)] cursor-pointer p-1"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="bg-none border-none text-[#f87171] cursor-pointer p-1"
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(index, cat)}
                            className="bg-none border-none text-[#acacac] cursor-pointer p-1"
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            className="bg-none border-none text-[#f87171] cursor-pointer p-1"
                            title="Delete"
                          >
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Categories;
