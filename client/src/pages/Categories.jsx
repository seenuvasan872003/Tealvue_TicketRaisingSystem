import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Tag } from 'lucide-react';
import { getCategories } from '../services/ticketApi';
import API from '../services/authApi';
import { toast } from 'react-toastify';
import logger from '../utils/logger';

const Categories = () => {
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
    if (!window.confirm(`Are you sure you want to delete category "${cat}"?`)) return;

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
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1 className="page-title">Manage Categories</h1>
          <p className="page-subtitle">Add, edit, or delete ticket support categories.</p>
        </div>
      </div>

      <div className="card" style={{ padding: 24, maxWidth: 600, background: 'var(--color-card)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Create new category (e.g. Sales, Hardware)..."
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            style={{
              flex: 1,
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              color: '#fff',
              padding: '10px 14px',
              fontSize: 13,
              outline: 'none',
            }}
            required
          />
          <button type="submit" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus size={16} /> Add Category
          </button>
        </form>

        {loading ? (
          <div style={{ padding: 30, textAlign: 'center' }}><div className="spinner" /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {categories.map((cat, index) => {
              const isDefault = defaultCategories.includes(cat);
              const isEditing = editingIndex === index;

              return (
                <div
                  key={index}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    background: '#161b22',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    padding: '10px 16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                    <Tag size={14} style={{ color: isDefault ? 'var(--color-teal)' : '#acacac' }} />
                    {isEditing ? (
                      <input
                        type="text"
                        value={editingValue}
                        onChange={(e) => setEditingValue(e.target.value)}
                        style={{
                          background: 'var(--color-surface)',
                          border: '1px solid var(--color-teal)',
                          borderRadius: 6,
                          color: '#fff',
                          padding: '4px 8px',
                          fontSize: 13,
                          width: '80%',
                          outline: 'none',
                        }}
                      />
                    ) : (
                      <span style={{ fontSize: 14, fontWeight: 500, color: '#fff' }}>
                        {cat} {isDefault && <span style={{ fontSize: 10, color: 'var(--color-teal)', marginLeft: 6, background: 'rgba(20,160,125,0.08)', padding: '2px 6px', borderRadius: 4 }}>Default</span>}
                      </span>
                    )}
                  </div>

                  {!isDefault && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => handleSaveEdit(index, cat)}
                            style={{ background: 'none', border: 'none', color: 'var(--color-success)', cursor: 'pointer', padding: 4 }}
                          >
                            <Check size={16} />
                          </button>
                          <button
                            onClick={() => setEditingIndex(null)}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }}
                          >
                            <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(index, cat)}
                            style={{ background: 'none', border: 'none', color: '#acacac', cursor: 'pointer', padding: 4 }}
                            title="Edit"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat)}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }}
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
