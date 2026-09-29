import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  ArrowUpDown,
  UploadCloud,
  Box,
  Dna,
  Terminal,
  Cpu,
  Play,
  Trash2,
  ArrowLeft,
  Layers,
  Download,
  Calendar,
  Sparkles,
  FolderOpen,
  X,
  Tag,
} from 'lucide-react';
import { ArchiveItem, AssetCategory, ArchiveSortField, SortOrder } from '../types';
import { formatVaultDateTime, formatVaultShortTimestamp, formatRelativeTime } from '../lib/db';

interface VaultPageProps {
  items: ArchiveItem[];
  activeModelName?: string;
  onBackToViewer: () => void;
  onLoadAsset: (item: ArchiveItem) => void;
  onInspectAsset: (item: ArchiveItem) => void;
  onOpenUploadModal: () => void;
  onQuickUploadFiles: (files: FileList | File[]) => void;
  onDeleteAsset: (id: string) => void;
}

export const VaultPage: React.FC<VaultPageProps> = ({
  items,
  activeModelName = '',
  onBackToViewer,
  onLoadAsset,
  onInspectAsset,
  onOpenUploadModal,
  onQuickUploadFiles,
  onDeleteAsset,
}) => {
  const quickFileInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | AssetCategory>('all');
  const [sortField, setSortField] = useState<ArchiveSortField>('dateAdded');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [layoutMode, setLayoutMode] = useState<'grid' | 'table'>('grid');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Press '/' anywhere on VaultPage (when not typing in an input) to focus the search box
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
          setSearchQuery('');
          searchInputRef.current?.blur();
        }
        return;
      }
      if (e.key === '/') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getCategoryLabel = (cat: AssetCategory): string => {
    switch (cat) {
      case 'molecular':
        return 'Molecular Structure';
      case '3d-model':
        return '3D Mesh Model';
      case 'script':
        return 'Script';
      case 'shader':
        return 'Shader';
      default:
        return cat;
    }
  };

  // Filter to uploaded models (items with binary blob or user upload ID)
  const uploadedItems = useMemo(() => {
    return items.filter(
      (item) =>
        Boolean(item.blob) ||
        item.id.startsWith('vault-user-') ||
        item.id.startsWith('vault-upload-')
    );
  }, [items]);

  // Extract unique tags across uploaded models for quick tag filtering
  const availableTags = useMemo(() => {
    const set = new Set<string>();
    for (const item of uploadedItems) {
      for (const t of item.tags || []) {
        if (t.trim()) set.add(t.trim());
      }
    }
    return Array.from(set).slice(0, 12);
  }, [uploadedItems]);

  const filteredItems = useMemo(() => {
    let list = [...uploadedItems];

    if (selectedCategory !== 'all') {
      list = list.filter((i) => i.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const tokens = searchQuery
        .toLowerCase()
        .trim()
        .split(/\s+/)
        .map((t) => t.replace(/^#/, ''))
        .filter(Boolean);

      list = list.filter((i) => {
        const categorySlug = i.category.toLowerCase();
        const categoryPlain = i.category.replace(/-/g, ' ').toLowerCase();
        const categoryLabel = getCategoryLabel(i.category).toLowerCase();
        const nameLower = i.name.toLowerCase();
        const descLower = (i.description || '').toLowerCase();
        const formatLower = (i.format || '').toLowerCase();
        const tagsLower = (i.tags || []).map((t) => t.toLowerCase());

        return tokens.every(
          (q) =>
            nameLower.includes(q) ||
            tagsLower.some((t) => t.includes(q)) ||
            categorySlug.includes(q) ||
            categoryPlain.includes(q) ||
            categoryLabel.includes(q) ||
            formatLower.includes(q) ||
            descLower.includes(q)
        );
      });
    }

    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name);
      } else if (sortField === 'size') {
        cmp = a.size - b.size;
      } else {
        cmp = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [uploadedItems, selectedCategory, searchQuery, sortField, sortOrder]);

  const totalStorageBytes = useMemo(
    () => uploadedItems.reduce((acc, item) => acc + (item.size || 0), 0),
    [uploadedItems]
  );

  const handleDownloadRaw = (item: ArchiveItem) => {
    if (!item.blob) return;
    const url = URL.createObjectURL(item.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = item.name.endsWith(`.${item.format}`)
      ? item.name
      : `${item.name.replace(/\s+/g, '_')}.${item.format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const getCategoryIcon = (cat: AssetCategory) => {
    switch (cat) {
      case 'molecular':
        return <Dna className="w-4 h-4 text-emerald-400" />;
      case 'script':
        return <Terminal className="w-4 h-4 text-amber-400" />;
      case 'shader':
        return <Cpu className="w-4 h-4 text-indigo-400" />;
      default:
        return <Box className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div
      className="flex-1 w-full h-[calc(100vh-3.5rem)] overflow-y-auto bg-slate-950 text-slate-100 select-none"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          onQuickUploadFiles(e.dataTransfer.files);
        }
      }}
    >
      <input
        ref={quickFileInputRef}
        type="file"
        multiple
        accept=".gltf,.glb,.obj,.stl,.ply,.pdb,.ent,.cif,.mmcif,.bcif,.py,.ts,.js,.cuda,.hlsl,.glsl"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onQuickUploadFiles(e.target.files);
            e.target.value = '';
          }
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 space-y-6">
        {/* Top Vault Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <button
                onClick={onBackToViewer}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to 3D / Mol* Viewer</span>
              </button>
              <span className="text-xs font-mono text-slate-400">·</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <Layers className="w-4 h-4" />
                <span>KEEPER Uploaded Models Vault</span>
              </div>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight pt-1">
              Uploaded Models & Structures Catalogue
            </h1>
            <p className="text-xs text-slate-400">
              Exclusively displays models and structures you have uploaded to IndexedDB storage, with exact push dates and timestamps.
            </p>
          </div>

          {/* Right Header Actions & Metrics */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-4 text-xs font-mono tabular-nums">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Uploaded Models</span>
                <span className="font-bold text-white text-sm">{uploadedItems.length}</span>
              </div>
              <div className="h-6 w-[1px] bg-slate-800" />
              <div>
                <span className="text-slate-400 block text-[10px] uppercase">Vault Storage</span>
                <span className="font-bold text-white text-sm">
                  {(totalStorageBytes / 1024).toFixed(1)} KB
                </span>
              </div>
            </div>

            <button
              onClick={() => quickFileInputRef.current?.click()}
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <FolderOpen className="w-4 h-4 text-indigo-400" />
              <span>Quick Upload File</span>
            </button>

            <button
              onClick={onOpenUploadModal}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all active:scale-95"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Ingest Model to Vault</span>
            </button>
          </div>
        </div>

        {/* Filter, Search & Layout Controls Bar */}
        <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Real-Time Search Input */}
            <div className="relative flex-1 max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                id="vault-search-input"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                aria-label="Search uploaded models by name, tag, or category"
                placeholder="Filter by model name, #tag, or category (e.g. molecular, 3d-model, script)..."
                className="w-full pl-10 pr-24 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchQuery ? (
                  <>
                    <span className="text-[10px] font-mono text-indigo-400 px-1.5 py-0.5 rounded bg-indigo-950/60 border border-indigo-500/30">
                      {filteredItems.length}/{uploadedItems.length}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        searchInputRef.current?.focus();
                      }}
                      title="Clear search query (Esc)"
                      className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 rounded">
                    /
                  </kbd>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(
                  [
                    { id: 'all', label: 'All Uploaded' },
                    { id: 'molecular', label: 'Molecular (Mol*)' },
                    { id: '3d-model', label: '3D Meshes' },
                    { id: 'script', label: 'Scripts' },
                    { id: 'shader', label: 'Shaders' },
                  ] as const
                ).map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id as 'all' | AssetCategory)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Sort Controls */}
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as ArchiveSortField)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="dateAdded">Date Pushed (Timestamp)</option>
                  <option value="name">Model Name (A-Z)</option>
                  <option value="size">File Size</option>
                </select>

                <button
                  onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-mono font-bold"
                >
                  {sortOrder === 'asc' ? '↑ ASC' : '↓ DESC'}
                </button>
              </div>

              {/* Cards vs Table Switcher */}
              <div className="flex items-center p-0.5 rounded-xl bg-slate-950 border border-slate-800">
                <button
                  onClick={() => setLayoutMode('grid')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    layoutMode === 'grid'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Cards
                </button>
                <button
                  onClick={() => setLayoutMode('table')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    layoutMode === 'table'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Table
                </button>
              </div>
            </div>
          </div>

          {/* Quick Tag Filter Row & Active Filter Status */}
          {(availableTags.length > 0 || searchQuery.trim() !== '' || selectedCategory !== 'all') && (
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-slate-400 flex items-center gap-1 font-medium mr-1">
                  <Tag className="w-3 h-3 text-indigo-400" />
                  <span>Tags:</span>
                </span>
                {availableTags.map((tag) => {
                  const isTagActive = searchQuery.toLowerCase().trim() === tag.toLowerCase();
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() =>
                        setSearchQuery((prev) =>
                          prev.toLowerCase().trim() === tag.toLowerCase() ? '' : tag
                        )
                      }
                      className={`px-2 py-0.5 rounded-md font-mono text-[10px] border transition-colors ${
                        isTagActive
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-indigo-500/50 hover:text-white'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>

              {(searchQuery.trim() !== '' || selectedCategory !== 'all') && (
                <div className="flex items-center gap-2 ml-auto">
                  <span className="text-slate-400 font-mono">
                    Showing <strong className="text-white">{filteredItems.length}</strong> of{' '}
                    {uploadedItems.length} models
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                    }}
                    className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    <span>Reset filters</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Uploaded Models Content Area */}
        {filteredItems.length === 0 ? (
          <div
            onClick={() => quickFileInputRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-indigo-500 bg-indigo-950/20'
                : 'border-slate-800 bg-slate-900/50 hover:border-indigo-500/60 hover:bg-slate-900/80'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center mx-auto mb-4">
              <UploadCloud className="w-7 h-7 text-indigo-400" />
            </div>
            <h2 className="text-base font-bold text-white">
              {uploadedItems.length === 0
                ? 'No models have been uploaded to the Vault yet'
                : 'No uploaded models match your current filter'}
            </h2>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1.5 leading-relaxed">
              Drag and drop any 3D model (`.glb`, `.gltf`, `.obj`, `.stl`) or molecular structure (`.pdb`, `.cif`, `.mmcif`) here, or click to upload. Every uploaded model is persisted in IndexedDB with its exact push date and timestamp.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {uploadedItems.length > 0 && (searchQuery.trim() !== '' || selectedCategory !== 'all') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                    setSelectedCategory('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Clear Search & Filters</span>
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  quickFileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md"
              >
                Select File to Upload
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenUploadModal();
                }}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Ingest with AI Metadata</span>
              </button>
            </div>
          </div>
        ) : layoutMode === 'table' ? (
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-slate-900/70">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 font-semibold">
                  <th className="py-3.5 px-4">Uploaded Model</th>
                  <th className="py-3.5 px-3">Category</th>
                  <th className="py-3.5 px-3">Format</th>
                  <th className="py-3.5 px-3">Pushed Date & Timestamp</th>
                  <th className="py-3.5 px-3 text-right">Size</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredItems.map((item) => {
                  const relTime = formatRelativeTime(item.dateAdded);
                  const isVisualizing =
                    Boolean(activeModelName) &&
                    activeModelName.toLowerCase().includes(item.name.toLowerCase());

                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isVisualizing ? 'bg-indigo-950/30' : 'hover:bg-slate-800/50'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                            {getCategoryIcon(item.category)}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-2">
                              <span>{item.name}</span>
                              {isVisualizing && (
                                <span className="text-[10px] font-semibold text-emerald-400">
                                  · Active in Viewer
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 line-clamp-1">
                              {item.description}
                            </div>
                            {item.tags && item.tags.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1 mt-1">
                                {item.tags.slice(0, 4).map((tag) => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => setSearchQuery(tag)}
                                    className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 hover:text-indigo-300 border border-slate-800 font-mono text-[10px] transition-colors"
                                    title={`Filter by #${tag}`}
                                  >
                                    #{tag}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 capitalize text-slate-300">
                        <button
                          type="button"
                          onClick={() => setSelectedCategory(item.category)}
                          className="hover:text-indigo-400 transition-colors"
                          title={`Filter by ${getCategoryLabel(item.category)}`}
                        >
                          {item.category.replace('-', ' ')}
                        </button>
                      </td>
                      <td className="py-3.5 px-3 font-mono uppercase font-semibold text-indigo-300">
                        .{item.format}
                      </td>
                      <td
                        className="py-3.5 px-3 font-mono tabular-nums text-slate-200"
                        title={formatVaultDateTime(item.dateAdded)}
                      >
                        <div>{formatVaultShortTimestamp(item.dateAdded)}</div>
                        <div className="text-[10px] text-slate-400">
                          {formatVaultDateTime(item.dateAdded)} {relTime ? `· ${relTime}` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-300">
                        {(item.size / 1024).toFixed(1)} KB
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {confirmDeleteId === item.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  onDeleteAsset(item.id);
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold"
                              >
                                Confirm Delete
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(item.id)}
                              className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                              title="Remove from Database"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {item.blob && (
                            <button
                              onClick={() => handleDownloadRaw(item)}
                              className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                              title="Download stored file"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          )}

                          <button
                            onClick={() => onInspectAsset(item)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-colors"
                          >
                            Inspect
                          </button>

                          <button
                            onClick={() => {
                              onLoadAsset(item);
                              onBackToViewer();
                            }}
                            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold inline-flex items-center gap-1 transition-colors"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Visualize</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const relTime = formatRelativeTime(item.dateAdded);
              const isVisualizing =
                Boolean(activeModelName) &&
                activeModelName.toLowerCase().includes(item.name.toLowerCase());

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl bg-slate-900/90 border p-4 flex flex-col justify-between transition-all shadow-md hover:shadow-xl ${
                    isVisualizing
                      ? 'border-indigo-500/70'
                      : 'border-slate-800 hover:border-indigo-500/50'
                  }`}
                >
                  <div>
                    {/* Visual Header */}
                    <div
                      onClick={() => {
                        onLoadAsset(item);
                        onBackToViewer();
                      }}
                      className="relative h-28 mb-3 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col items-center justify-center cursor-pointer group/preview overflow-hidden"
                    >
                      {item.category === 'molecular' ? (
                        <>
                          <Dna className="w-9 h-9 text-emerald-400 group-hover/preview:scale-110 transition-transform" />
                          <span className="text-[10px] font-mono text-slate-400 mt-1.5">
                            Uploaded Molecular Structure · .{item.format.toUpperCase()}
                          </span>
                        </>
                      ) : item.category === '3d-model' ? (
                        <>
                          <Box className="w-9 h-9 text-cyan-400 group-hover/preview:scale-110 transition-transform" />
                          <span className="text-[10px] font-mono text-slate-400 mt-1.5">
                            Uploaded 3D Mesh · .{item.format.toUpperCase()}
                          </span>
                        </>
                      ) : (
                        <div className="w-full h-full p-3 font-mono text-[10px] text-slate-400 overflow-hidden">
                          {(item.codeContent || '// Uploaded Script').slice(0, 140)}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-xs font-semibold text-white">
                        <Play className="w-4 h-4 fill-current text-indigo-400" />
                        <span>Visualize in 3D / Mol* Workspace</span>
                      </div>
                    </div>

                    {/* Metadata Line */}
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                      <span>
                        {getCategoryLabel(item.category)} · .{item.format.toUpperCase()} · {(item.size / 1024).toFixed(1)} KB
                      </span>
                      {isVisualizing && (
                        <span className="text-emerald-400 font-semibold">Active</span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-white truncate" title={item.name}>
                      {item.name}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>

                    {/* Clickable Tag Chips */}
                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 mt-2.5">
                        {item.tags.slice(0, 4).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setSearchQuery(tag)}
                            className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-400 hover:text-indigo-300 border border-slate-800 font-mono text-[10px] transition-colors"
                            title={`Filter by #${tag}`}
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Pushed Date & Timestamp Box */}
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800/80 font-mono text-[11px] tabular-nums space-y-0.5">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Calendar className="w-3 h-3 text-indigo-400" />
                          <span>Pushed:</span>
                        </span>
                        <span className="font-semibold">{formatVaultShortTimestamp(item.dateAdded)}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span>{formatVaultDateTime(item.dateAdded)}</span>
                        {relTime && <span className="text-indigo-400 font-semibold">{relTime}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer Actions */}
                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      {confirmDeleteId === item.id ? (
                        <>
                          <button
                            onClick={() => {
                              onDeleteAsset(item.id);
                              setConfirmDeleteId(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(item.id)}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-rose-950/80 text-slate-400 hover:text-rose-400 border border-slate-800 transition-colors"
                          title="Remove from Database"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {item.blob && (
                        <button
                          onClick={() => handleDownloadRaw(item)}
                          className="p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                          title="Download File"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onInspectAsset(item)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                      >
                        Inspect
                      </button>
                      <button
                        onClick={() => {
                          onLoadAsset(item);
                          onBackToViewer();
                        }}
                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Visualize</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
