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
      setCurrentQuestionIndex(0);
      loadExistingAnswers(materialId);
    }
    setLoading(false);
  };

  // Load existing answers
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

  // Submit answer
  const submitAnswer = async (questionId, answer) => {
    if (!supabase || !currentUser || !selectedMaterial) return;

    const { data, error } = await supabase
      .from('user_answers')
      .upsert({
        user_id: currentUser.id,
        question_id: questionId,
        material_id: selectedMaterial.id,
        user_answer: answer
      });

    if (!error) {
      setUserAnswers(prev => ({
        ...prev,
        [questionId]: answer
      }));
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
    
    // Since we might not have the stored procedure, let's create a simple query
    const { data } = await supabase
      .from('user_scores')
      .select(`
        user_id,
        total_points,
        user_profiles:reading_club_profiles(full_name)
      `)
      .order('total_points', { ascending: false })
      .limit(10);
    
    if (data) {
      setLeaderboard(data);
    }
  };

  // Logout function
  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
    }
  };

  // Navigation items
  const navItems = [
    { id: 'home', name: 'الرئيسية', icon: Home },
    { id: 'materials', name: 'المواد القرائية', icon: BookOpen },
    { id: 'leaderboard', name: 'لوحة المتصدرين', icon: Trophy },
    { id: 'profile', name: 'الملف الشخصي', icon: User },
  ];

  if (userProfile?.is_admin) {
    navItems.push({ id: 'admin', name: 'لوحة الإدارة', icon: BarChart3 });
  }

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
          alert('تم التسجيل بنجاح! يمكنك الآن تسجيل الدخول.');
          setIsSignUp(false);
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

  // Sidebar component
  const Sidebar = () => (
    <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center space-x-3 space-x-reverse">
          <BookOpen className="w-8 h-8 text-blue-600" />
          <h2 className="text-xl font-bold text-gray-800">نادي القراءة</h2>
        </div>
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="mt-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => {
                setCurrentView(item.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 text-right hover:bg-blue-50 transition-colors ${
                currentView === item.id ? 'bg-blue-50 text-blue-600 border-l-4 border-blue-600' : 'text-gray-700'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>

      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600 mb-2">مرحباً، {userProfile?.full_name}</p>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 space-x-reverse text-red-600 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Home page component
  const HomePage = () => {
    const userScore = scores.reduce((total, score) => total + score.total_points, 0);
    const completedMaterials = scores.filter(score => score.percentage >= 70).length;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">مرحباً، {userProfile?.full_name}</h1>
          <div className="flex items-center space-x-2 space-x-reverse">
            <Star className="w-6 h-6 text-yellow-500" />
            <span className="text-xl font-bold text-gray-800">{userScore} نقطة</span>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-600 text-sm font-medium">المواد المكتملة</p>
                <p className="text-2xl font-bold text-blue-800">{completedMaterials}</p>
              </div>
              <Award className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-green-50 p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-600 text-sm font-medium">إجمالي النقاط</p>
                <p className="text-2xl font-bold text-green-800">{userScore}</p>
              </div>
              <Target className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-purple-50 p-6 rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-600 text-sm font-medium">الترتيب</p>
                <p className="text-2xl font-bold text-purple-800">
                  {leaderboard.findIndex(entry => entry.user_id === currentUser?.id) + 1 || '-'}
                </p>
              </div>
              <Trophy className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Recent Materials */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-xl font-bold text-gray-800 mb-4">المواد القرائية المتاحة</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {materials.slice(0, 6).map((material) => {
              const materialScore = scores.find(score => score.material_id === material.id);
              return (
                <div key={material.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-gray-800 mb-2">{material.title}</h3>
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">{material.description}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">{material.category}</span>
                    {materialScore ? (
                      <span className="text-green-600 text-sm font-medium">
                        {materialScore.percentage}%
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelectedMaterial(material);
                          setCurrentView('quiz');
                          loadQuestions(material.id);
                        }}
                        className="text-blue-600 text-sm hover:underline"
                      >
                        ابدأ الآن
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Materials page component
  const MaterialsPage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">المواد القرائية</h1>
        <div className="text-sm text-gray-600">
          {materials.length} مادة متاحة
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((material) => {
          const materialScore = scores.find(score => score.material_id === material.id);
          const isCompleted = materialScore && materialScore.percentage >= 70;
          
          return (
            <div key={material.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-800">{material.title}</h3>
                  {isCompleted && (
                    <CheckCircle2 className="w-6 h-6 text-green-500" />
                  )}
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-3">{material.description}</p>
                
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                    {material.category}
                  </span>
                  {materialScore && (
                    <div className="text-sm">
                      <span className={`font-medium ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
                        {materialScore.percentage}%
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-3 space-x-reverse">
                  {material.material_url && (
                    <a
                      href={material.material_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center space-x-2 space-x-reverse bg-gray-100 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>المادة</span>
                    </a>
                  )}
                  
                  <button
                    onClick={() => {
                      setSelectedMaterial(material);
                      setCurrentView('quiz');
                      loadQuestions(material.id);
                    }}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    {materialScore ? 'إعادة الاختبار' : 'بدء الاختبار'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Leaderboard page component
  const LeaderboardPage = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">لوحة المتصدرين</h1>
        <Trophy className="w-8 h-8 text-yellow-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">أفضل المتعلمين</h2>
        </div>
        
        <div className="divide-y divide-gray-200">
          {leaderboard.map((entry, index) => {
            const isCurrentUser = entry.user_id === currentUser?.id;
            return (
              <div key={entry.user_id} className={`p-6 flex items-center justify-between ${isCurrentUser ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center space-x-4 space-x-reverse">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                    index === 0 ? 'bg-yellow-500' : 
                    index === 1 ? 'bg-gray-400' : 
                    index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                  }`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className={`font-semibold ${isCurrentUser ? 'text-blue-800' : 'text-gray-800'}`}>
                      {entry.user_profiles?.full_name || 'مستخدم'}
                      {isCurrentUser && ' (أنت)'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <span className={`font-bold ${isCurrentUser ? 'text-blue-800' : 'text-gray-800'}`}>
                    {entry.total_points} نقطة
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  // Profile page component
  const ProfilePage = () => {
    const userScore = scores.reduce((total, score) => total + score.total_points, 0);
    const completedMaterials = scores.filter(score => score.percentage >= 70).length;
    const userRank = leaderboard.findIndex(entry => entry.user_id === currentUser?.id) + 1;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">الملف الشخصي</h1>
          <User className="w-8 h-8 text-blue-600" />
        </div>

        {/* Profile Info */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center space-x-4 space-x-reverse mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">{userProfile?.full_name}</h2>
              <p className="text-gray-600">{userProfile?.email}</p>
              <p className="text-sm text-gray-500">انضم في {new Date(userProfile?.joined_at).toLocaleDateString('ar-SA')}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-800">{userScore}</p>
              <p className="text-blue-600 text-sm">إجمالي النقاط</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-800">{completedMaterials}</p>
              <p className="text-green-600 text-sm">المواد المكتملة</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-800">{userRank || '-'}</p>
              <p className="text-purple-600 text-sm">الترتيب</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-orange-800">{materials.length}</p>
              <p className="text-orange-600 text-sm">المواد المتاحة</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">النشاط الأخير</h3>
          <div className="space-y-3">
            {scores.slice(0, 5).map((score) => {
              const material = materials.find(m => m.id === score.material_id);
              return (
                <div key={score.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-800">{material?.title}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(score.completed_at || score.created_at).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-gray-800">{score.total_points} نقطة</p>
                    <p className="text-sm text-gray-600">{score.percentage}%</p>
                  </div>
                </div>
              );
            })}
          </div>
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
            {loading ? (
              <>
                <div className="loading-spinner w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">جاري تحميل الأسئلة...</p>
              </>
            ) : (
              <>
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">لا توجد أسئلة متاحة لهذه المادة</p>
              </>
            )}
          </div>
        </div>
      );
    }

    const currentQuestion = questions[currentQuestionIndex];
    const totalQuestions = questions.length;
    const answeredQuestions = Object.keys(userAnswers).length;

    const handleAnswerSelect = (answer) => {
      submitAnswer(currentQuestion.id, answer);
    };

    const goToNextQuestion = () => {
      if (currentQuestionIndex < questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      }
    };

    const goToPrevQuestion = () => {
      if (currentQuestionIndex > 0) {
        setCurrentQuestionIndex(currentQuestionIndex - 1);
      }
    };

    const finishQuiz = () => {
      // Calculate and submit final score
      alert('تم الانتهاء من الاختبار! سيتم حساب النتيجة...');
      setCurrentView('materials');
      loadUserScores();
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentView('materials')}
              className="flex items-center space-x-2 space-x-reverse text-gray-600 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>العودة للمواد</span>
            </button>
            <div className="text-sm text-gray-600">
              السؤال {currentQuestionIndex + 1} من {totalQuestions}
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-800">{selectedMaterial.title}</h1>
          
          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>التقدم</span>
              <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">
            {currentQuestion.question_text}
          </h2>

          {/* Answer options */}
          <div className="space-y-3">
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
              currentQuestion.options.map((option, index) => {
                const isSelected = userAnswers[currentQuestion.id] === option;
                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(option)}
                    className={`w-full p-4 text-right rounded-lg border-2 transition-colors ${
                      isSelected 
                        ? 'border-blue-600 bg-blue-50 text-blue-800' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {option}
                  </button>
                );
              })
            )}

            {currentQuestion.question_type === 'true_false' && (
              <>
                <button
                  onClick={() => handleAnswerSelect('true')}
                  className={`w-full p-4 text-right rounded-lg border-2 transition-colors ${
                    userAnswers[currentQuestion.id] === 'true' 
                      ? 'border-green-600 bg-green-50 text-green-800' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  صحيح
                </button>
                <button
                  onClick={() => handleAnswerSelect('false')}
                  className={`w-full p-4 text-right rounded-lg border-2 transition-colors ${
                    userAnswers[currentQuestion.id] === 'false' 
                      ? 'border-red-600 bg-red-50 text-red-800' 
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  خطأ
                </button>
              </>
            )}

            {currentQuestion.question_type === 'short_answer' && (
              <textarea
                value={userAnswers[currentQuestion.id] || ''}
                onChange={(e) => handleAnswerSelect(e.target.value)}
                className="w-full p-4 border-2 border-gray-200 rounded-lg focus:border-blue-600 focus:outline-none"
                rows="4"
                placeholder="اكتب إجابتك هنا..."
              />
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={goToPrevQuestion}
              disabled={currentQuestionIndex === 0}
              className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>السؤال السابق</span>
            </button>

            <div className="text-center">
              <p className="text-sm text-gray-600">
                تم الإجابة على {answeredQuestions} من {totalQuestions} أسئلة
              </p>
            </div>

            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={finishQuiz}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                إنهاء الاختبار
              </button>
            ) : (
              <button
                onClick={goToNextQuestion}
                className="flex items-center space-x-2 space-x-reverse px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <span>السؤال التالي</span>
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Show login page if not authenticated
  if (currentView === 'login') {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <Sidebar />
      
      {/* Mobile header */}
      <div className="lg:hidden bg-white shadow-sm p-4 flex items-center justify-between">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-md text-gray-600 hover:text-gray-900"
        >
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-800">نادي القراءة</h1>
        <div></div>
      </div>

      {/* Main content */}
      <div className="lg:mr-64 p-6">
        {currentView === 'home' && <HomePage />}
        {currentView === 'materials' && <MaterialsPage />}
        {currentView === 'leaderboard' && <LeaderboardPage />}
        {currentView === 'profile' && <ProfilePage />}
        {currentView === 'quiz' && <QuizPage />}
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}

export default App;