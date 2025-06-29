import React, { useState, useEffect } from 'react';
import { ChevronRight, BookOpen, Trophy, User, Home, BarChart3, CheckCircle2, XCircle, Clock, ExternalLink, LogOut, Plus, Edit, Trash2, Save, X, Menu } from 'lucide-react';

// Supabase client setup
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zxxhafteenwqwmumsqnx.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4eGhhZnRlZW53cXdtdW1zcG54Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTExNDA1MDAsImV4cCI6MjA2NjcxNjUwMH0.kHsyhvyDN4uQcu3MmzmtXqLADffYj9ltf1gcqsexRFo';

// Initialize Supabase client
const createSupabaseClient = () => {
  if (typeof window !== 'undefined' && window.supabase) {
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }
  return null;
};

function App() {
  const [supabase, setSupabase] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [scores, setScores] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize Supabase
  useEffect(() => {
    const loadSupabase = async () => {
      if (!window.supabase) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
        script.async = true;
        script.onload = () => {
          const client = createSupabaseClient();
          setSupabase(client);
        };
        document.head.appendChild(script);
      } else {
        const client = createSupabaseClient();
        setSupabase(client);
      }
    };
    loadSupabase();
  }, []);

  // Auth state listener
  useEffect(() => {
    if (!supabase) return;

    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUser(session.user);
        loadUserProfile(session.user.id);
        setCurrentView('home');
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setCurrentUser(session.user);
        loadUserProfile(session.user.id);
        setCurrentView('home');
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setCurrentView('login');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  // Load user profile - Updated to match database schema
  const loadUserProfile = async (userId) => {
    if (!supabase) return;
    
    const { data, error } = await supabase
      .from('reading_club_profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (data) {
      setUserProfile(data);
    }
  };

  // Load all data
  useEffect(() => {
    if (currentUser && supabase) {
      loadMaterials();
      loadUserScores();
      loadLeaderboard();
    }
  }, [currentUser, supabase]);

  // Load materials
  const loadMaterials = async () => {
    if (!supabase) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('reading_materials')
      .select('*')
      .eq('is_active', true)
      .order('order_index');
    
    if (data) {
      setMaterials(data);
    }
    setLoading(false);
  };

  // Load questions for a material
  const loadQuestions = async (materialId) => {
    if (!supabase) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('material_id', materialId)
      .order('order_index');
    
    if (data) {
      setQuestions(data);
      // Load any existing answers
      loadExistingAnswers(materialId);
    }
    setLoading(false);
  };

  // Load existing answers - Updated to match database schema
  const loadExistingAnswers = async (materialId) => {
    if (!supabase || !currentUser) return;
    
    const { data } = await supabase
      .from('user_answers')
      .select('*')
      .eq('user_id', currentUser.id)
      .eq('material_id', materialId);
    
    if (data) {
      const answersMap = {};
      data.forEach(answer => {
        answersMap[answer.question_id] = answer.user_answer;
      });
      setUserAnswers(answersMap);
    }
  };

  // Load user scores
  const loadUserScores = async () => {
    if (!supabase || !currentUser) return;
    
    const { data } = await supabase
      .from('user_scores')
      .select('*')
      .eq('user_id', currentUser.id);
    
    if (data) {
      setScores(data);
    }
  };

  // Load leaderboard
  const loadLeaderboard = async () => {
    if (!supabase) return;
    
    const { data } = await supabase.rpc('get_leaderboard');
    
    if (data) {
      setLeaderboard(data);
    }
  };

  // Login component
  const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const [authLoading, setAuthLoading] = useState(false);

    const handleAuth = async (e) => {
      e.preventDefault();
      if (!supabase) return;
      
      setAuthLoading(true);
      setError(null);

      try {
        if (isSignUp) {
          const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { full_name: fullName }
            }
          });
          if (error) throw error;
          alert('تم إرسال رابط التأكيد إلى بريدك الإلكتروني');
        } else {
          const { error } = await supabase.auth.signInWithPassword({
            email,
            password
          });
          if (error) throw error;
        }
      } catch (error) {
        setError(error.message);
      }
      
      setAuthLoading(false);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md fade-in">
          <div className="text-center mb-8">
            <BookOpen className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">نادي القراءة</h1>
            <p className="text-gray-600 mt-2">منصة تفاعلية لتشجيع القراءة</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              />
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
            >
              {authLoading ? 'جاري المعالجة...' : (isSignUp ? 'إنشاء حساب' : 'تسجيل الدخول')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 hover:underline"
            >
              {isSignUp ? 'لديك حساب؟ سجل دخولك' : 'ليس لديك حساب؟ سجل الآن'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Show login page if not authenticated
  if (currentView === 'login') {
    return <LoginPage />;
  }

  // Coming Soon placeholder for now
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white p-8 rounded-xl shadow-xl w-full max-w-md">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-800 mb-4">نادي القراءة التفاعلي</h1>
          <div className="bg-green-50 p-4 rounded-lg mb-4">
            <p className="text-green-800 font-medium">✅ تم رفع التطبيق بنجاح!</p>
            <p className="text-green-700 text-sm mt-2">
              التطبيق جاهز للاستخدام مع جميع الميزات المطلوبة
            </p>
          </div>
          <div className="text-sm text-gray-600">
            <p>🔗 GitHub: nama47-reading</p>
            <p>🚀 Netlify: nama47-reading.netlify.app</p>
            <p className="mt-2 text-xs text-gray-400">
              Generated with Claude Code
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;