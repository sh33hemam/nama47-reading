import React, { useState, useEffect } from 'react';
import { ChevronRight, BookOpen, Trophy, User, Home, BarChart3, CheckCircle2, XCircle, Clock, ExternalLink, LogOut, Plus, Edit, Trash2, Save, X, Menu, Star, Award, Users, FileText, Target, ArrowLeft } from 'lucide-react';

// Supabase client setup
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zxxhafteenwqwmumspnx.supabase.co';
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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

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

  // Load user profile
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
    
    const { data, error } = await supabase
      .from('reading_club_materials')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setMaterials(data);
    }
  };

  // Load user scores
  const loadUserScores = async () => {
    if (!supabase || !currentUser) return;
    
    const { data, error } = await supabase
      .from('reading_club_scores')
      .select('*')
      .eq('user_id', currentUser.id);
    
    if (data) {
      setScores(data);
    }
  };

  // Load leaderboard
  const loadLeaderboard = async () => {
    if (!supabase) return;
    
    const { data, error } = await supabase
      .from('reading_club_scores')
      .select(`
        user_id,
        total_points,
        user_profiles!reading_club_scores_user_id_fkey(full_name)
      `)
      .order('total_points', { ascending: false })
      .limit(20);
    
    if (data) {
      setLeaderboard(data);
    }
  };

  // Load questions for a material
  const loadQuestions = async (materialId) => {
    if (!supabase) return;
    
    const { data, error } = await supabase
      .from('reading_club_questions')
      .select('*')
      .eq('material_id', materialId)
      .order('question_order');
    
    if (data) {
      setQuestions(data);
      setUserAnswers({});
      setCurrentQuestionIndex(0);
    }
  };

  // Handle answer selection
  const handleAnswerSelect = (questionId, answer) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Submit quiz
  const submitQuiz = async () => {
    if (!supabase || !currentUser || !selectedMaterial) return;
    
    setLoading(true);
    
    try {
      let correctAnswers = 0;
      const totalQuestions = questions.length;
      
      questions.forEach(question => {
        if (userAnswers[question.id] === question.correct_answer) {
          correctAnswers++;
        }
      });
      
      const percentage = (correctAnswers / totalQuestions) * 100;
      const points = Math.round(percentage);
      
      // Save or update score
      const { data: existingScore } = await supabase
        .from('reading_club_scores')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('material_id', selectedMaterial.id)
        .single();
      
      if (existingScore) {
        // Update existing score if new score is better
        if (points > existingScore.points) {
          await supabase
            .from('reading_club_scores')
            .update({
              points,
              percentage,
              total_points: existingScore.total_points - existingScore.points + points,
              completed_at: new Date()
            })
            .eq('id', existingScore.id);
        }
      } else {
        // Create new score
        await supabase
          .from('reading_club_scores')
          .insert({
            user_id: currentUser.id,
            material_id: selectedMaterial.id,
            points,
            percentage,
            total_points: points,
            completed_at: new Date()
          });
      }
      
      // Reload data
      await Promise.all([
        loadUserScores(),
        loadLeaderboard()
      ]);
      
      setCurrentView('materials');
      setSelectedMaterial(null);
      setQuestions([]);
      setUserAnswers({});
    } catch (error) {
      setError('حدث خطأ أثناء حفظ النتيجة');
    } finally {
      setLoading(false);
    }
  };

  // Handle sign in
  const handleSignIn = async (email, password) => {
    if (!supabase) return;
    
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) {
      setError(error.message);
    }
    
    setLoading(false);
  };

  // Handle sign up
  const handleSignUp = async (email, password, fullName) => {
    if (!supabase) return;
    
    setLoading(true);
    setError(null);
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        }
      }
    });
    
    if (error) {
      setError(error.message);
    } else if (data.user) {
      // Create user profile
      await supabase
        .from('reading_club_profiles')
        .insert({
          id: data.user.id,
          full_name: fullName,
          email: email
        });
    }
    
    setLoading(false);
  };

  // Handle sign out
  const handleSignOut = async () => {
    if (!supabase) return;
    
    await supabase.auth.signOut();
  };

  // Login/Signup Form Component
  const AuthForm = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    const handleSubmit = (e) => {
      e.preventDefault();
      if (isLogin) {
        handleSignIn(email, password);
      } else {
        handleSignUp(email, password, fullName);
      }
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <BookOpen className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-800 mb-2">نادي القراءة</h1>
            <p className="text-gray-600">منصة تفاعلية لتشجيع القراءة وتقييم الفهم</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  required
                  placeholder="أدخل اسمك الكامل"
                />
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                البريد الإلكتروني
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
                placeholder="أدخل بريدك الإلكتروني"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                كلمة المرور
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                required
                placeholder="أدخل كلمة المرور"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'جاري المعالجة...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد')}
            </button>
          </form>
          
          {/* Quick login buttons - only show in login mode */}
          {isLogin && (
            <div className="mt-6 space-y-3">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">دخول سريع</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setEmail('nama47@nama47.com');
                    setPassword('123456');
                    handleSignIn('nama47@nama47.com', '123456');
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 space-x-reverse bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 py-2.5 px-4 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <User className="w-4 h-4" />
                  <span>نماء2 - مدير</span>
                </button>
                
                <button
                  onClick={() => {
                    setEmail('namaabdulelah@gmail.com');
                    setPassword('123456');
                    handleSignIn('namaabdulelah@gmail.com', '123456');
                  }}
                  disabled={loading}
                  className="w-full flex items-center justify-center space-x-2 space-x-reverse bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 py-2.5 px-4 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                >
                  <User className="w-4 h-4" />
                  <span>نماء - مستخدم</span>
                </button>
              </div>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {isLogin ? 'ليس لديك حساب؟ إنشاء حساب جديد' : 'لديك حساب؟ تسجيل الدخول'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Sidebar component
  const Sidebar = () => (
    <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} xl:translate-x-0 xl:static xl:inset-0 xl:shadow-none xl:border-l xl:border-gray-200`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center space-x-3 space-x-reverse">
            <BookOpen className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <h2 className="text-xl font-bold text-gray-800 truncate">نادي القراءة</h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="xl:hidden p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button
            onClick={() => {
              setCurrentView('home');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-colors text-right ${
              currentView === 'home'
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Home className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">الرئيسية</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('materials');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-colors text-right ${
              currentView === 'materials'
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">المواد القرائية</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('leaderboard');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-colors text-right ${
              currentView === 'leaderboard'
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Trophy className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">لوحة المتصدرين</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('profile');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-lg transition-colors text-right ${
              currentView === 'profile'
                ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-700'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <User className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">الملف الشخصي</span>
          </button>
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-3 space-x-reverse mb-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {userProfile?.full_name || currentUser?.email}
              </p>
              <p className="text-xs text-gray-500 truncate">عضو نشط</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between text-xs text-gray-600 mb-3">
            <span>النقاط الإجمالية</span>
            <span className="font-semibold text-blue-600">
              {scores.reduce((total, score) => total + score.total_points, 0)}
            </span>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 space-x-reverse text-red-600 hover:text-red-700 hover:bg-red-50 py-2 px-3 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Home page component
  const HomePage = () => {
    const totalPoints = scores.reduce((sum, score) => sum + score.total_points, 0);
    const completedMaterials = scores.length;
    const averageScore = completedMaterials > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score.percentage, 0) / completedMaterials)
      : 0;
    const userRank = leaderboard.findIndex(entry => entry.user_id === currentUser?.id) + 1;

    return (
      <div className="space-y-8">
        {/* Header for mobile */}
        <div className="xl:hidden flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">الرئيسية</h1>
          <Home className="w-8 h-8 text-blue-600" />
        </div>

        {/* Welcome section */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center space-x-4 space-x-reverse">
            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-8 h-8" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-1">
                مرحباً، {userProfile?.full_name || 'عضو محترم'}
              </h2>
              <p className="text-blue-100">
                استمر في رحلتك القرائية واكتشف عوالم جديدة من المعرفة
              </p>
            </div>
          </div>
        </div>

        {/* Statistics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalPoints}</p>
                <p className="text-sm text-gray-600">إجمالي النقاط</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{completedMaterials}</p>
                <p className="text-sm text-gray-600">مادة مكتملة</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{averageScore}%</p>
                <p className="text-sm text-gray-600">متوسط الدرجات</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">#{userRank || '-'}</p>
                <p className="text-sm text-gray-600">ترتيبك</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent materials */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">المواد الحديثة</h3>
            <button
              onClick={() => setCurrentView('materials')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 space-x-reverse"
            >
              <span>عرض الكل</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-4">
            {materials.slice(0, 3).map((material) => {
              const materialScore = scores.find(score => score.material_id === material.id);
              const isCompleted = !!materialScore;
              
              return (
                <div key={material.id} className="flex items-center space-x-4 space-x-reverse p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isCompleted ? 'bg-green-50' : 'bg-blue-50'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{material.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-1">{material.description}</p>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    {materialScore && (
                      <span className="text-sm font-medium text-green-600">
                        {materialScore.percentage}%
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setSelectedMaterial(material);
                        setCurrentView('quiz');
                        loadQuestions(material.id);
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      {isCompleted ? 'إعادة' : 'بدء'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top performers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">المتصدرون</h3>
            <button
              onClick={() => setCurrentView('leaderboard')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1 space-x-reverse"
            >
              <span>عرض الكل</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <div key={entry.user_id} className="flex items-center space-x-4 space-x-reverse">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                  index === 1 ? 'bg-gray-100 text-gray-800' :
                  index === 2 ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    {entry.user_profiles?.full_name || 'مستخدم'}
                  </p>
                </div>
                
                <div className="flex items-center space-x-1 space-x-reverse text-gray-600">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm font-medium">{entry.total_points}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Materials page component
  const MaterialsPage = () => (
    <div className="space-y-8">
      {/* Header for mobile */}
      <div className="xl:hidden flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">المواد القرائية</h1>
        <FileText className="w-8 h-8 text-blue-600" />
      </div>

      {/* Statistics cards for desktop */}
      <div className="hidden xl:grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{materials.length}</p>
              <p className="text-sm text-gray-600">إجمالي المواد</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{scores.length}</p>
              <p className="text-sm text-gray-600">مواد مكتملة</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">{materials.length - scores.length}</p>
              <p className="text-sm text-gray-600">مواد متبقية</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {scores.length > 0 
                  ? Math.round(scores.reduce((sum, score) => sum + score.percentage, 0) / scores.length)
                  : 0
                }%
              </p>
              <p className="text-sm text-gray-600">متوسط الدرجات</p>
            </div>
          </div>
        </div>
      </div>

      {/* Materials grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {materials.map((material) => {
          const materialScore = scores.find(score => score.material_id === material.id);
          const isCompleted = !!materialScore;
          
          return (
            <div key={material.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
                    {material.title}
                  </h3>
                  <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                    {material.description}
                  </p>
                </div>
                
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ml-3 ${
                  isCompleted ? 'bg-green-50' : 'bg-blue-50'
                }`}>
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  )}
                </div>
              </div>

              <div className="mb-6">
                {materialScore && (
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">أفضل نتيجة</span>
                    <span className={`font-semibold ${
                      materialScore.percentage >= 80 ? 'text-green-600' :
                      materialScore.percentage >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {materialScore.percentage}%
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                {material.material_url && (
                  <a
                    href={material.material_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center space-x-2 space-x-reverse bg-gray-100 text-gray-700 py-2.5 px-4 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>عرض المادة</span>
                  </a>
                )}
                
                <button
                  onClick={() => {
                    setSelectedMaterial(material);
                    setCurrentView('quiz');
                    loadQuestions(material.id);
                  }}
                  className={`w-full py-2.5 px-4 rounded-lg transition-colors text-sm font-medium ${
                    isCompleted 
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {materialScore ? 'إعادة الاختبار' : 'بدء الاختبار'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state */}
      {materials.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-500 mb-2">لا توجد مواد متاحة</h3>
          <p className="text-gray-400">سيتم إضافة المواد القرائية قريباً</p>
        </div>
      )}
    </div>
  );

  // Leaderboard page component
  const LeaderboardPage = () => {
    const userRank = leaderboard.findIndex(entry => entry.user_id === currentUser?.id) + 1;
    
    return (
      <div className="space-y-8">
        {/* Header for mobile */}
        <div className="xl:hidden flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">لوحة المتصدرين</h1>
          <Trophy className="w-8 h-8 text-yellow-500" />
        </div>

        {/* User's rank card */}
        {userRank > 0 && (
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold">ترتيبك الحالي</p>
                  <p className="text-blue-100">من بين {leaderboard.length} متعلم</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold">#{userRank}</p>
                <p className="text-blue-100">المركز</p>
              </div>
            </div>
          </div>
        )}

        {/* Top 3 podium for desktop */}
        <div className="hidden lg:block">
          {leaderboard.length >= 3 && (
            <div className="grid grid-cols-3 gap-6 mb-8">
              {/* Second place */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                <div className="w-16 h-16 bg-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  {leaderboard[1]?.user_profiles?.full_name || 'مستخدم'}
                </h3>
                <div className="flex items-center justify-center space-x-2 space-x-reverse text-gray-600">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{leaderboard[1]?.total_points} نقطة</span>
                </div>
              </div>
              
              {/* First place */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Award className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-2xl">1</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  {leaderboard[0]?.user_profiles?.full_name || 'مستخدم'}
                </h3>
                <div className="flex items-center justify-center space-x-2 space-x-reverse text-gray-600">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{leaderboard[0]?.total_points} نقطة</span>
                </div>
              </div>
              
              {/* Third place */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                <div className="w-16 h-16 bg-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">
                  {leaderboard[2]?.user_profiles?.full_name || 'مستخدم'}
                </h3>
                <div className="flex items-center justify-center space-x-2 space-x-reverse text-gray-600">
                  <Star className="w-4 h-4 text-yellow-500" />
                  <span>{leaderboard[2]?.total_points} نقطة</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Full leaderboard */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2 space-x-reverse">
              <Trophy className="w-5 h-5 text-yellow-500" />
              <span>الترتيب العام</span>
            </h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {leaderboard.map((entry, index) => (
              <div 
                key={entry.user_id} 
                className={`p-4 flex items-center space-x-4 space-x-reverse hover:bg-gray-50 transition-colors ${
                  entry.user_id === currentUser?.id ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                }`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                  index === 0 ? 'bg-yellow-100 text-yellow-800' :
                  index === 1 ? 'bg-gray-100 text-gray-800' :
                  index === 2 ? 'bg-orange-100 text-orange-800' :
                  'bg-blue-50 text-blue-700'
                }`}>
                  {index + 1}
                </div>
                
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-gray-800">
                    {entry.user_profiles?.full_name || 'مستخدم'}
                    {entry.user_id === currentUser?.id && (
                      <span className="text-blue-600 text-sm mr-2">(أنت)</span>
                    )}
                  </p>
                  <p className="text-sm text-gray-500">عضو نشط</p>
                </div>
                
                <div className="text-center">
                  <div className="flex items-center space-x-1 space-x-reverse text-gray-600">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-semibold">{entry.total_points}</span>
                  </div>
                  <p className="text-xs text-gray-500">نقطة</p>
                </div>
                
                {index < 3 && (
                  <div className="flex items-center">
                    {index === 0 && <Award className="w-5 h-5 text-yellow-500" />}
                    {index === 1 && <Award className="w-5 h-5 text-gray-400" />}
                    {index === 2 && <Award className="w-5 h-5 text-orange-400" />}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {leaderboard.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">لا توجد نتائج حتى الآن</h3>
              <p className="text-gray-400">ابدأ بحل الاختبارات لتظهر في لوحة المتصدرين</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Profile page component
  const ProfilePage = () => {
    const totalPoints = scores.reduce((sum, score) => sum + score.total_points, 0);
    const completedMaterials = scores.length;
    const averageScore = completedMaterials > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score.percentage, 0) / completedMaterials)
      : 0;
    const userRank = leaderboard.findIndex(entry => entry.user_id === currentUser?.id) + 1;

    return (
      <div className="space-y-8">
        {/* Header for mobile */}
        <div className="xl:hidden flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">الملف الشخصي</h1>
          <User className="w-8 h-8 text-blue-600" />
        </div>

        {/* Profile header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-6 space-x-reverse">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-10 h-10 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-800 mb-1">
                {userProfile?.full_name || currentUser?.email}
              </h2>
              <p className="text-gray-600 mb-3">{currentUser?.email}</p>
              <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-500">
                <span>عضو منذ {new Date(currentUser?.created_at).toLocaleDateString('ar')}</span>
                <span>•</span>
                <span>عضو نشط</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalPoints}</p>
                <p className="text-sm text-gray-600">إجمالي النقاط</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{completedMaterials}</p>
                <p className="text-sm text-gray-600">مادة مكتملة</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{averageScore}%</p>
                <p className="text-sm text-gray-600">متوسط الدرجات</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <Trophy className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">#{userRank || '-'}</p>
                <p className="text-sm text-gray-600">ترتيبك</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent scores */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">نتائج حديثة</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {scores.slice().reverse().slice(0, 10).map((score) => {
              const material = materials.find(m => m.id === score.material_id);
              
              return (
                <div key={score.id} className="p-4 flex items-center space-x-4 space-x-reverse">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    score.percentage >= 80 ? 'bg-green-50' :
                    score.percentage >= 60 ? 'bg-yellow-50' :
                    'bg-red-50'
                  }`}>
                    {score.percentage >= 80 ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : score.percentage >= 60 ? (
                      <Clock className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {material?.title || 'مادة محذوفة'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(score.completed_at).toLocaleDateString('ar')}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className={`text-lg font-bold ${
                      score.percentage >= 80 ? 'text-green-600' :
                      score.percentage >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {score.percentage}%
                    </p>
                    <p className="text-xs text-gray-500">{score.points} نقطة</p>
                  </div>
                </div>
              );
            })}
          </div>
          
          {scores.length === 0 && (
            <div className="text-center py-12">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">لا توجد نتائج حتى الآن</h3>
              <p className="text-gray-400">ابدأ بحل الاختبارات لترى نتائجك هنا</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Quiz page component
  const QuizPage = () => {
    if (!selectedMaterial || questions.length === 0) {
      return (
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">جاري تحميل الأسئلة...</p>
          </div>
        </div>
      );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const isLastQuestion = currentQuestionIndex === questions.length - 1;
    const isFirstQuestion = currentQuestionIndex === 0;
    const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-gray-800">{selectedMaterial.title}</h1>
            <button
              onClick={() => {
                setCurrentView('materials');
                setSelectedMaterial(null);
                setQuestions([]);
                setUserAnswers({});
                setCurrentQuestionIndex(0);
              }}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <div className="flex justify-between text-sm text-gray-600">
            <span>السؤال {currentQuestionIndex + 1} من {questions.length}</span>
            <span>{Math.round(progress)}% مكتمل</span>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-6 leading-relaxed">
            {currentQuestion.question_text}
          </h2>
          
          <div className="space-y-3">
            {currentQuestion.question_type === 'multiple_choice' && (
              <>
                {[currentQuestion.option_a, currentQuestion.option_b, currentQuestion.option_c, currentQuestion.option_d]
                  .filter(Boolean)
                  .map((option, index) => {
                    const optionKey = ['A', 'B', 'C', 'D'][index];
                    const isSelected = userAnswers[currentQuestion.id] === optionKey;
                    
                    return (
                      <button
                        key={optionKey}
                        onClick={() => handleAnswerSelect(currentQuestion.id, optionKey)}
                        className={`w-full p-4 text-right rounded-lg border transition-all ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center space-x-3 space-x-reverse">
                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                            isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                          }`}>
                            {isSelected && <div className="w-2 h-2 bg-white rounded-full"></div>}
                          </div>
                          <span className="font-medium">{optionKey}.</span>
                          <span>{option}</span>
                        </div>
                      </button>
                    );
                  })
                }
              </>
            )}
            
            {currentQuestion.question_type === 'true_false' && (
              <>
                <button
                  onClick={() => handleAnswerSelect(currentQuestion.id, 'true')}
                  className={`w-full p-4 text-right rounded-lg border transition-all ${
                    userAnswers[currentQuestion.id] === 'true'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      userAnswers[currentQuestion.id] === 'true' ? 'border-green-500 bg-green-500' : 'border-gray-300'
                    }`}>
                      {userAnswers[currentQuestion.id] === 'true' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span>صحيح</span>
                  </div>
                </button>
                
                <button
                  onClick={() => handleAnswerSelect(currentQuestion.id, 'false')}
                  className={`w-full p-4 text-right rounded-lg border transition-all ${
                    userAnswers[currentQuestion.id] === 'false'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 space-x-reverse">
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      userAnswers[currentQuestion.id] === 'false' ? 'border-red-500 bg-red-500' : 'border-gray-300'
                    }`}>
                      {userAnswers[currentQuestion.id] === 'false' && <div className="w-2 h-2 bg-white rounded-full"></div>}
                    </div>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span>خطأ</span>
                  </div>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={isFirstQuestion}
              className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>السؤال السابق</span>
            </button>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              {questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                    index === currentQuestionIndex
                      ? 'bg-blue-600 text-white'
                      : userAnswers[questions[index].id]
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            
            {!isLastQuestion ? (
              <button
                onClick={() => setCurrentQuestionIndex(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                <span>السؤال التالي</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={submitQuiz}
                disabled={loading || Object.keys(userAnswers).length !== questions.length}
                className="flex items-center space-x-2 space-x-reverse px-6 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>جاري الحفظ...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>إنهاء الاختبار</span>
                  </>
                )}
              </button>
            )}
          </div>
          
          {Object.keys(userAnswers).length !== questions.length && (
            <p className="text-center text-sm text-gray-500 mt-4">
              يرجى الإجابة على جميع الأسئلة قبل إنهاء الاختبار
            </p>
          )}
        </div>
      </div>
    );
  };

  // Show loading while supabase is initializing
  if (!supabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <BookOpen className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">جاري تحميل التطبيق...</p>
        </div>
      </div>
    );
  }

  // Show auth form if user is not logged in
  if (!currentUser) {
    return <AuthForm />;
  }

  // Main app layout
  return (
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      <Sidebar />
      
      {/* Main container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="xl:hidden bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold text-gray-800">نادي القراءة</h1>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        {/* Desktop header */}
        <div className="hidden xl:block bg-white shadow-sm border-b border-gray-200">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold text-gray-800">
                {currentView === 'home' && 'الرئيسية'}
                {currentView === 'materials' && 'المواد القرائية'}
                {currentView === 'leaderboard' && 'لوحة المتصدرين'}
                {currentView === 'profile' && 'الملف الشخصي'}
                {currentView === 'quiz' && selectedMaterial?.title}
              </h1>
              <div className="flex items-center space-x-4 space-x-reverse">
                <div className="flex items-center space-x-2 space-x-reverse text-gray-600">
                  <User className="w-5 h-5" />
                  <span className="text-sm">{userProfile?.full_name}</span>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
                  <Star className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {scores.reduce((total, score) => total + score.total_points, 0)} نقطة
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {currentView === 'home' && <HomePage />}
            {currentView === 'materials' && <MaterialsPage />}
            {currentView === 'leaderboard' && <LeaderboardPage />}
            {currentView === 'profile' && <ProfilePage />}
            {currentView === 'quiz' && <QuizPage />}
          </div>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default App;