import React, { useState, useEffect, Component, ReactNode } from 'react';
import { 
  HashRouter as Router, 
  Routes, 
  Route, 
  Navigate, 
  Link,
  useNavigate
} from 'react-router-dom';
import { 
  LayoutGrid, 
  PlusCircle, 
  Users, 
  LogOut, 
  Search, 
  Play, 
  Info,
  Trash2,
  Edit,
  ExternalLink,
  Upload,
  Shield,
  Menu,
  X,
  Heart,
  MessageSquare,
  Send
} from 'lucide-react';
import { collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { db, auth } from './firebase';
import { AuthProvider, useAuth } from './AuthContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface AITool {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  category: string;
  createdAt: any;
}

interface WhitelistedEmail {
  id: string;
  email: string;
}

interface UserData {
  uid: string;
  email: string;
  role: 'admin' | 'user';
  displayName: string;
}

interface Comment {
  id: string;
  toolId: string;
  userId: string;
  userName: string;
  userPhoto: string;
  text: string;
  createdAt: string;
}

interface Favorite {
  id: string;
  userId: string;
  toolId: string;
}

// --- Components ---

const Navbar = () => {
  const { user, signout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={cn(
      "fixed top-0 w-full z-50 transition-all duration-300 px-4 md:px-12 py-4 flex items-center justify-between",
      isScrolled ? "bg-black/90 backdrop-blur-md shadow-lg" : "bg-gradient-to-b from-black/80 to-transparent"
    )}>
      <div className="flex items-center gap-8">
        <Link to="/" className="text-purple-500 font-black text-2xl tracking-tighter italic">
          MEGA LISTA IA 2
        </Link>
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-300">
          <Link to="/" className="hover:text-white transition-colors">Início</Link>
          {user?.role === 'admin' && (
            <>
              <Link to="/admin/tools" className="hover:text-white transition-colors">Gerenciar IAs</Link>
              <Link to="/admin/users" className="hover:text-white transition-colors">Usuários</Link>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img src={user?.photoURL} alt="" className="w-8 h-8 rounded-full border border-purple-500/50" />
            <span className="text-xs text-gray-400">{user?.displayName}</span>
          </div>
          <button 
            onClick={signout}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
          >
            <LogOut size={20} />
          </button>
        </div>
        
        <button 
          className="md:hidden text-white"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="absolute top-full left-0 w-full bg-black border-t border-white/10 p-6 flex flex-col gap-4 md:hidden animate-in slide-in-from-top duration-300">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="text-white">Início</Link>
          {user?.role === 'admin' && (
            <>
              <Link to="/admin/tools" onClick={() => setMobileMenuOpen(false)} className="text-white">Gerenciar IAs</Link>
              <Link to="/admin/users" onClick={() => setMobileMenuOpen(false)} className="text-white">Usuários</Link>
            </>
          )}
          <div className="h-px bg-white/10 my-2" />
          <button onClick={signout} className="flex items-center gap-2 text-red-500">
            <LogOut size={20} /> Sair
          </button>
        </div>
      )}
    </nav>
  );
};

const Hero = ({ tool, onSelectTool }: { tool?: AITool, onSelectTool: (tool: AITool) => void }) => {
  const { user } = useAuth();
  if (!tool) return (
    <div className="relative h-[80vh] w-full bg-black flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
      <img 
        src="https://picsum.photos/seed/ai/1920/1080" 
        className="absolute inset-0 w-full h-full object-cover opacity-50"
        alt="Banner"
      />
      <div className="relative z-20 px-4 md:px-12 max-w-2xl">
        <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter">
          MEGA LISTA <span className="text-purple-500 italic">IA 2</span>
        </h1>
        <p className="text-lg text-gray-300 mb-8">
          Olá, <span className="text-purple-500 font-bold">{user?.displayName || 'Usuário'}</span>! Explore as melhores ferramentas de Inteligência Artificial selecionadas por especialistas.
        </p>
      </div>
    </div>
  );

  return (
    <div className="relative h-[80vh] w-full bg-black flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
      <img 
        src={tool.imageUrl} 
        className="absolute inset-0 w-full h-full object-cover opacity-60"
        alt={tool.title}
      />
      <div className="relative z-20 px-4 md:px-12 max-w-2xl">
        <span className="inline-block px-2 py-1 bg-purple-600 text-white text-xs font-bold uppercase tracking-widest mb-4 rounded">
          Destaque: {tool.category}
        </span>
        <h1 className="text-5xl md:text-7xl font-black text-white mb-4 tracking-tighter">
          {tool.title}
        </h1>
        <p className="text-lg text-gray-300 mb-4">
          Olá, <span className="text-purple-500 font-bold">{user?.displayName || 'Usuário'}</span>!
        </p>
        <p className="text-lg text-gray-300 mb-8 line-clamp-3">
          {tool.description}
        </p>
        <div className="flex items-center gap-4">
          <a 
            href={tool.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded font-bold hover:bg-gray-200 transition-colors"
          >
            <Play fill="currentColor" size={20} /> Acessar Agora
          </a>
          <button 
            onClick={() => onSelectTool(tool)}
            className="flex items-center gap-2 bg-gray-500/50 text-white px-8 py-3 rounded font-bold hover:bg-gray-500/70 transition-colors backdrop-blur-md"
          >
            <MessageSquare size={20} /> Comentários
          </button>
        </div>
      </div>
    </div>
  );
};

const ToolCard: React.FC<{ 
  tool: AITool, 
  isFavorite: boolean, 
  onToggleFavorite: (e: React.MouseEvent) => void,
  onClick: () => void 
}> = ({ tool, isFavorite, onToggleFavorite, onClick }) => {
  return (
    <div 
      onClick={onClick}
      className="group relative flex-shrink-0 w-32 md:w-44 transition-all duration-300 hover:scale-110 hover:z-30 cursor-pointer"
    >
      <div className="aspect-[2/3] overflow-hidden rounded-md bg-zinc-900 border border-white/5 shadow-lg">
        <img 
          src={tool.imageUrl} 
          alt={tool.title} 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      
      {/* Overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-3 flex flex-col justify-end rounded-md">
        <h3 className="text-white font-bold text-xs md:text-sm mb-1 line-clamp-1">{tool.title}</h3>
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
             <button 
              onClick={onToggleFavorite}
              className={cn(
                "p-1.5 rounded-full transition-colors",
                isFavorite ? "bg-red-500 text-white" : "bg-white/20 text-white hover:bg-white/40"
              )}
            >
              <Heart size={14} fill={isFavorite ? "currentColor" : "none"} />
            </button>
            <button 
              onClick={onClick}
              className="p-1.5 bg-white/20 rounded-full text-white hover:bg-white/40 transition-colors"
            >
              <MessageSquare size={14} />
            </button>
          </div>
          <span className="text-[8px] text-purple-400 font-bold uppercase">{tool.category}</span>
        </div>
      </div>
    </div>
  );
};

const ToolRow: React.FC<{ 
  title: string, 
  tools: AITool[], 
  favorites: string[],
  onToggleFavorite: (toolId: string) => void,
  onSelectTool: (tool: AITool) => void
}> = ({ title, tools, favorites, onToggleFavorite, onSelectTool }) => {
  if (tools.length === 0) return null;
  
  return (
    <div className="mb-12">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4 px-4 md:px-12 flex items-center gap-2">
        {title}
        <span className="h-px flex-1 bg-white/10 ml-4 hidden md:block" />
      </h2>
      <div className="flex gap-4 overflow-x-auto px-4 md:px-12 pb-8 scrollbar-hide no-scrollbar snap-x">
        {tools.map(tool => (
          <div key={tool.id} className="snap-start">
            <ToolCard 
              tool={tool} 
              isFavorite={favorites.includes(tool.id)}
              onToggleFavorite={(e) => {
                e.stopPropagation();
                onToggleFavorite(tool.id);
              }}
              onClick={() => onSelectTool(tool)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const ToolModal: React.FC<{ 
  tool: AITool, 
  onClose: () => void,
  isFavorite: boolean,
  onToggleFavorite: () => void
}> = ({ tool, onClose, isFavorite, onToggleFavorite }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'comments'), 
      where('toolId', '==', tool.id),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Comment)));
    });
    return () => unsubscribe();
  }, [tool.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'comments'), {
        toolId: tool.id,
        userId: user.uid,
        userName: user.displayName,
        userPhoto: user.photoURL,
        text: newComment,
        createdAt: new Date().toISOString()
      });
      setNewComment('');
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'comments', commentId));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-zinc-950 w-full max-w-4xl max-h-[90vh] rounded-2xl overflow-hidden border border-white/10 shadow-2xl flex flex-col md:flex-row">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black rounded-full text-white transition-colors"
        >
          <X size={24} />
        </button>

        {/* Left: Image & Info */}
        <div className="w-full md:w-1/2 relative aspect-video md:aspect-auto flex-shrink-0">
          <img 
            src={tool.imageUrl} 
            alt={tool.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 p-8 w-full">
            <span className="inline-block px-2 py-1 bg-purple-600 text-white text-[10px] font-bold uppercase tracking-widest mb-3 rounded">
              {tool.category}
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tighter">{tool.title}</h2>
            <div className="flex items-center gap-4 mt-6">
              <a 
                href={tool.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 bg-white text-black py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors"
              >
                <Play fill="currentColor" size={18} /> Acessar Site
              </a>
              <button 
                onClick={onToggleFavorite}
                className={cn(
                  "p-3 rounded-lg border transition-all",
                  isFavorite ? "bg-red-500 border-red-500 text-white" : "bg-transparent border-white/20 text-white hover:bg-white/10"
                )}
              >
                <Heart size={20} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Description & Comments */}
        <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col flex-1 min-h-0 overflow-y-auto bg-zinc-950">
          <div className="mb-8">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-3">Sobre a Ferramenta</h3>
            <p className="text-gray-300 leading-relaxed">{tool.description}</p>
          </div>

          <div className="flex-1 flex flex-col min-h-0">
            <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
              <MessageSquare size={14} /> Comentários ({comments.length})
            </h3>

            {/* Comment List */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2 custom-scrollbar">
              {comments.length === 0 ? (
                <p className="text-gray-600 text-sm italic py-4">Nenhum comentário ainda. Seja o primeiro!</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 group">
                    <img src={comment.userPhoto} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white">{comment.userName}</span>
                        {(user?.role === 'admin' || user?.uid === comment.userId) && (
                          <button 
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 leading-snug">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Add Comment */}
            <form onSubmit={handleAddComment} className="relative">
              <input 
                type="text" 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Adicione um comentário..."
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 pr-12 text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
              />
              <button 
                disabled={submitting || !newComment.trim()}
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-purple-500 hover:text-purple-400 disabled:opacity-50"
              >
                {submitting ? <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Pages ---

const Home = () => {
  const { user } = useAuth();
  const [tools, setTools] = useState<AITool[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTool, setSelectedTool] = useState<AITool | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'tools'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const toolsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AITool[];
      setTools(toolsData);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'favorites'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFavorites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Favorite)));
    });
    return () => unsubscribe();
  }, [user]);

  const handleToggleFavorite = async (toolId: string) => {
    if (!user) return;
    const existing = favorites.find(f => f.toolId === toolId);
    if (existing) {
      await deleteDoc(doc(db, 'favorites', existing.id));
    } else {
      await addDoc(collection(db, 'favorites'), {
        userId: user.uid,
        toolId,
        createdAt: new Date().toISOString()
      });
    }
  };

  const categories = Array.from(new Set(tools.map(t => t.category))) as string[];
  const favoriteToolIds = favorites.map(f => f.toolId);

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-20">
      <Navbar />
      <Hero tool={tools[0]} onSelectTool={setSelectedTool} />
      
      <div className="relative -mt-24 z-20">
        <ToolRow 
          title="Adicionados Recentemente" 
          tools={tools} 
          favorites={favoriteToolIds}
          onToggleFavorite={handleToggleFavorite}
          onSelectTool={setSelectedTool}
        />

        {favoriteToolIds.length > 0 && (
          <ToolRow 
            title="Meus Favoritos" 
            tools={tools.filter(t => favoriteToolIds.includes(t.id))} 
            favorites={favoriteToolIds}
            onToggleFavorite={handleToggleFavorite}
            onSelectTool={setSelectedTool}
          />
        )}
        
        {categories.map(cat => (
          <ToolRow 
            key={cat} 
            title={cat} 
            tools={tools.filter(t => t.category === cat)} 
            favorites={favoriteToolIds}
            onToggleFavorite={handleToggleFavorite}
            onSelectTool={setSelectedTool}
          />
        ))}
      </div>

      {selectedTool && (
        <ToolModal 
          tool={selectedTool} 
          onClose={() => setSelectedTool(null)} 
          isFavorite={favoriteToolIds.includes(selectedTool.id)}
          onToggleFavorite={() => handleToggleFavorite(selectedTool.id)}
        />
      )}
    </div>
  );
};

const AdminTools = () => {
  const [tools, setTools] = useState<AITool[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    link: '',
    category: '',
    imageFile: null as File | null
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'tools'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const toolsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as AITool[];
      setTools(toolsData);
    });
    return () => unsubscribe();
  }, []);

  const handleUploadImage = async (file: File) => {
    const IMGBB_API_KEY = '8e74fd181b6dcbc4f29aafc67c7230a6';
    const formData = new FormData();
    formData.append('image', file);
    
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });
    const data = await response.json();
    return data.data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.imageFile) return alert("Selecione uma imagem");
    
    setUploading(true);
    try {
      const imageUrl = await handleUploadImage(formData.imageFile);
      await addDoc(collection(db, 'tools'), {
        title: formData.title,
        description: formData.description,
        link: formData.link,
        category: formData.category,
        imageUrl,
        createdAt: new Date().toISOString()
      });
      setFormData({ title: '', description: '', link: '', category: '', imageFile: null });
      setIsAdding(false);
    } catch (err) {
      console.error(err);
      alert("Erro ao adicionar ferramenta");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Deseja excluir esta ferramenta?")) {
      await deleteDoc(doc(db, 'tools', id));
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-24 px-4 md:px-12">
      <Navbar />
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <LayoutGrid className="text-purple-500" /> Gerenciar Ferramentas
          </h1>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold transition-colors"
          >
            {isAdding ? <X size={20} /> : <PlusCircle size={20} />}
            {isAdding ? "Cancelar" : "Nova IA"}
          </button>
        </div>

        {isAdding && (
          <form onSubmit={handleSubmit} className="bg-zinc-900 p-6 rounded-xl border border-white/10 mb-12 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Título</label>
                  <input 
                    required
                    type="text" 
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="Ex: ChatGPT"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Categoria</label>
                  <input 
                    required
                    type="text" 
                    value={formData.category}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="Ex: Texto, Imagem, Vídeo"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Link</label>
                  <input 
                    required
                    type="url" 
                    value={formData.link}
                    onChange={e => setFormData({...formData, link: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Descrição</label>
                  <textarea 
                    required
                    rows={4}
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
                    placeholder="Breve descrição da ferramenta..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">Capa (Imagem)</label>
                  <div className="relative border-2 border-dashed border-white/10 rounded-lg p-4 flex flex-col items-center justify-center bg-black hover:border-purple-500 transition-colors cursor-pointer">
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={e => setFormData({...formData, imageFile: e.target.files?.[0] || null})}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <Upload className="text-gray-500 mb-2" />
                    <span className="text-sm text-gray-400">
                      {formData.imageFile ? formData.imageFile.name : "Clique ou arraste uma imagem"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-8 flex justify-end">
              <button 
                disabled={uploading}
                type="submit"
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-bold disabled:opacity-50 flex items-center gap-2"
              >
                {uploading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <PlusCircle size={20} />}
                {uploading ? "Enviando..." : "Salvar Ferramenta"}
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {tools.map(tool => (
            <div key={tool.id} className="bg-zinc-900 rounded-xl overflow-hidden border border-white/10 group">
              <div className="aspect-video relative">
                <img src={tool.imageUrl} alt="" className="w-full h-full object-cover" />
                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => handleDelete(tool.id)}
                    className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-white">{tool.title}</h3>
                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded uppercase font-bold">{tool.category}</span>
                </div>
                <p className="text-gray-400 text-sm line-clamp-2 mb-4">{tool.description}</p>
                <a 
                  href={tool.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-purple-500 text-sm font-bold flex items-center gap-1 hover:underline"
                >
                  <ExternalLink size={14} /> Visitar Site
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const AdminUsers = () => {
  const [whitelist, setWhitelist] = useState<WhitelistedEmail[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (status) {
      const timer = setTimeout(() => setStatus(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  useEffect(() => {
    const unsubWhitelist = onSnapshot(collection(db, 'whitelist'), (snapshot) => {
      setWhitelist(snapshot.docs.map(doc => ({ id: doc.id, email: doc.data().email })));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserData)));
    });
    return () => { unsubWhitelist(); unsubUsers(); };
  }, []);

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;
    setLoading(true);
    try {
      const emailLower = newEmail.toLowerCase().trim();
      await addDoc(collection(db, 'whitelist'), { email: emailLower, addedAt: new Date().toISOString() });
      setNewEmail('');
      setStatus({ msg: "E-mail adicionado com sucesso!", type: 'success' });
    } catch (err) {
      setStatus({ msg: "Erro ao adicionar e-mail. Verifique suas permissões.", type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmail = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'whitelist', id));
      setStatus({ msg: "E-mail removido da lista.", type: 'success' });
    } catch (err) {
      setStatus({ msg: "Erro ao remover e-mail.", type: 'error' });
    }
  };

  const handleDeleteUser = async (uid: string) => {
    if (uid === auth.currentUser?.uid) {
      setStatus({ msg: "Você não pode excluir seu próprio perfil.", type: 'error' });
      return;
    }
    try {
      await deleteDoc(doc(db, 'users', uid));
      setStatus({ msg: "Usuário excluído com sucesso.", type: 'success' });
    } catch (err) {
      setStatus({ msg: "Erro ao excluir usuário.", type: 'error' });
    }
  };

  const handleToggleRole = async (uid: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setStatus({ msg: `Cargo de ${newRole.toUpperCase()} atribuído com sucesso!`, type: 'success' });
    } catch (err: any) {
      console.error("Erro ao mudar cargo:", err);
      setStatus({ msg: "Erro ao mudar cargo. Apenas o administrador principal pode fazer isso.", type: 'error' });
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 pt-24 px-4 md:px-12">
      <Navbar />
      <div className="max-w-6xl mx-auto">
        {status && (
          <div className={cn(
            "fixed top-24 right-4 z-[60] px-6 py-3 rounded-lg shadow-2xl animate-in fade-in slide-in-from-right-4 duration-300",
            status.type === 'success' ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
          )}>
            {status.msg}
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Whitelist Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Shield className="text-purple-500" /> Lista de Permissões
          </h2>
          <form onSubmit={handleAddEmail} className="flex gap-2 mb-8">
            <input 
              type="email" 
              required
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder="E-mail do Gmail"
              className="flex-1 bg-black border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-500"
            />
            <button 
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-bold disabled:opacity-50"
            >
              Adicionar
            </button>
          </form>
          <div className="space-y-2">
            {whitelist.map(item => (
              <div key={item.id} className="bg-zinc-900 p-4 rounded-lg flex items-center justify-between border border-white/5">
                <span className="text-gray-300">{item.email}</span>
                <button onClick={() => handleRemoveEmail(item.id)} className="text-red-500 hover:text-red-400">
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Users Section */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Users className="text-purple-500" /> Usuários Cadastrados
          </h2>
          <div className="space-y-4">
            {users.map(u => (
              <div key={u.uid} className="bg-zinc-900 p-4 rounded-lg border border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-white font-bold">{u.displayName}</p>
                  <p className="text-gray-500 text-xs">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-1 rounded",
                    u.role === 'admin' ? "bg-purple-500 text-white" : "bg-zinc-700 text-gray-400"
                  )}>
                    {u.role}
                  </span>
                  <button 
                    onClick={() => handleToggleRole(u.uid, u.role)}
                    className="text-xs text-purple-500 hover:underline"
                  >
                    Mudar Cargo
                  </button>
                  <button 
                    onClick={() => handleDeleteUser(u.uid)}
                    className="text-red-500 hover:text-red-400"
                    title="Excluir Perfil"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
};

const Login = () => {
  const { user, login, register, resetPassword, loading, error } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    if (isRegistering) {
      const success = await register(email, password, name);
      if (success) setSuccessMsg("Conta criada com sucesso! Redirecionando...");
    } else {
      const success = await login(email, password);
      if (success) setSuccessMsg("Login realizado! Entrando...");
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      alert("Por favor, digite seu e-mail primeiro.");
      return;
    }
    await resetPassword(email);
  };

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-600/20 blur-[120px] rounded-full" />
      
      <div className="relative z-10 text-center max-w-md w-full">
        <h1 className="text-6xl font-black text-white mb-2 tracking-tighter italic">
          MEGA LISTA <span className="text-purple-500">IA 2</span>
        </h1>
        <p className="text-gray-400 mb-8 uppercase tracking-[0.3em] text-sm font-bold">O Recomeço</p>
        
        <div className="bg-zinc-900/50 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">
            {isRegistering ? "Criar Nova Conta" : "Bem-vindo de volta"}
          </h2>

          {isRegistering && (
            <div className="mb-6 p-4 bg-purple-600/10 border border-purple-500/30 rounded-2xl text-left">
              <p className="text-[11px] text-gray-300 leading-relaxed">
                <span className="text-purple-400 font-bold uppercase block mb-1">Aviso Importante:</span>
                Este site não oferece ferramentas premium. Trata-se de uma vasta e ampla lista organizada de várias IAs em um só lugar para facilitar a vida de cada usuário quando precisar de alguma IA.
              </p>
            </div>
          )}
          
          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl text-sm mb-6 animate-in fade-in zoom-in duration-300 flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              {successMsg}
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm mb-6 animate-in fade-in zoom-in duration-300 text-left">
              <p className="font-bold mb-1">Ops! Algo deu errado:</p>
              <p>{error}</p>
              {error.includes("não está ativado") && (
                <div className="mt-3 p-3 bg-black/40 rounded-xl border border-purple-500/30 text-[11px] leading-relaxed text-gray-300">
                  <p className="font-bold mb-2 uppercase text-purple-400">Ação Necessária:</p>
                  1. Acesse o <a href="https://console.firebase.google.com/project/gen-lang-client-0176123666/authentication/providers" target="_blank" rel="noopener noreferrer" className="text-purple-400 underline">Console do Firebase</a><br/>
                  2. Vá em <b>Authentication</b> &gt; <b>Sign-in method</b><br/>
                  3. Clique em <b>Adicionar novo provedor</b><br/>
                  4. Escolha <b>E-mail/Senha</b>, ative a primeira opção e <b>Salve</b>.
                </div>
              )}
              {error.includes("cadastrado") && (
                <button 
                  onClick={() => setIsRegistering(false)}
                  className="mt-3 w-full bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 py-2 rounded-lg text-xs font-bold transition-colors"
                >
                  Fazer Login Agora
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {isRegistering && (
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">Nome</label>
                <input 
                  required
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  placeholder="Seu nome"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">E-mail</label>
              <input 
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="exemplo@gmail.com"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1 ml-1">
                <label className="block text-xs font-bold text-gray-400 uppercase">Senha</label>
                {!isRegistering && (
                  <button 
                    type="button"
                    onClick={handleForgotPassword}
                    className="text-[10px] text-purple-400 hover:text-purple-300 uppercase font-bold"
                  >
                    Esqueci a senha
                  </button>
                )}
              </div>
              <input 
                required
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button 
              disabled={loading}
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-2xl font-bold transition-all transform active:scale-95 disabled:opacity-50 mt-6 shadow-lg shadow-purple-600/20"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                isRegistering ? "Cadastrar" : "Entrar"
              )}
            </button>
          </form>
          
          <button 
            onClick={() => setIsRegistering(!isRegistering)}
            className="mt-6 text-sm text-gray-400 hover:text-purple-400 transition-colors"
          >
            {isRegistering ? "Já tem uma conta? Entre aqui" : "Não tem conta? Cadastre-se agora"}
          </button>

          <p className="mt-8 text-[10px] text-gray-500 leading-relaxed">
            Apenas e-mails autorizados pelo administrador podem acessar a plataforma. 
            O administrador mestre é kakaxe188@gmail.com.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- Protected Route ---
const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!user) return <Login />;

  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;

  return <>{children}</>;
};

// --- Error Boundary ---
class ErrorBoundary extends Component<any, any> {
  state: any = { hasError: false, error: null };

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
          <h1 className="text-4xl font-bold text-red-500 mb-4">Algo deu errado</h1>
          <pre className="bg-zinc-900 p-4 rounded-lg text-xs text-gray-400 max-w-full overflow-auto mb-6">
            {error?.message || String(error)}
          </pre>
          <button 
            onClick={() => window.location.reload()}
            className="bg-purple-600 px-6 py-2 rounded-lg font-bold"
          >
            Recarregar Página
          </button>
        </div>
      );
    }
    return (this as any).props.children;
  }
}

// --- Main App ---
export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/admin/tools" element={
              <ProtectedRoute adminOnly>
                <AdminTools />
              </ProtectedRoute>
            } />
            <Route path="/admin/users" element={
              <ProtectedRoute adminOnly>
                <AdminUsers />
              </ProtectedRoute>
            } />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
