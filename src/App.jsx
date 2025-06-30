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
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 text-right rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium truncate">{item.name}</span>
              </button>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <div className="flex items-center space-x-3 space-x-reverse mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">
                  {userProfile?.full_name || 'مستخدم'}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {userProfile?.email}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 space-x-reverse text-red-600 hover:text-red-700 hover:bg-red-50 transition-colors py-2 px-3 rounded-md text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
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
    <div className="space-y-8">
      {/* Header Section */}
      <div className="xl:hidden flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">المواد القرائية</h1>
        <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
          {materials.length} مادة
        </div>
      </div>

      {/* Stats Cards for Desktop */}
      <div className="hidden xl:grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <BookOpen className="w-8 h-8 text-blue-600 ml-3" />
            <div>
              <p className="text-2xl font-bold text-gray-800">{materials.length}</p>
              <p className="text-sm text-gray-600">إجمالي المواد</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 ml-3" />
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {scores.filter(score => score.percentage >= 70).length}
              </p>
              <p className="text-sm text-gray-600">مواد مكتملة</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Clock className="w-8 h-8 text-orange-600 ml-3" />
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {materials.length - scores.filter(score => score.percentage >= 70).length}
              </p>
              <p className="text-sm text-gray-600">مواد متبقية</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center">
            <Star className="w-8 h-8 text-yellow-600 ml-3" />
            <div>
              <p className="text-2xl font-bold text-gray-800">
                {scores.reduce((total, score) => total + score.total_points, 0)}
              </p>
              <p className="text-sm text-gray-600">إجمالي النقاط</p>
            </div>
          </div>
        </div>
      </div>

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
        {materials.map((material) => {
          const materialScore = scores.find(score => score.material_id === material.id);
          const isCompleted = materialScore && materialScore.percentage >= 70;
          
          return (
            <div key={material.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-300 transition-all duration-300 group">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-800 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {material.title}
                  </h3>
                  {isCompleted && (
                    <CheckCircle2 className="w-6 h-6 text-green-500 flex-shrink-0 ml-2" />
                  )}
                </div>
                
                <p className="text-gray-600 mb-4 line-clamp-3 text-sm leading-relaxed">
                  {material.description}
                </p>
                
                <div className="flex items-center justify-between mb-6">
                  <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-3 py-1 rounded-full">
                    {material.category}
                  </span>
                  {materialScore && (
                    <div className="text-sm">
                      <span className={`font-bold ${isCompleted ? 'text-green-600' : 'text-blue-600'}`}>
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
              <div className="bg-white rounded-xl shadow-lg border-2 border-yellow-300 p-6 text-center relative -mt-4">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                  الأول
                </div>
                <div className="w-20 h-20 bg-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trophy className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-bold text-gray-800 text-lg mb-2">
                  {leaderboard[0]?.user_profiles?.full_name || 'مستخدم'}
                </h3>
                <div className="flex items-center justify-center space-x-2 space-x-reverse text-yellow-600 font-semibold">
                  <Star className="w-5 h-5" />
                  <span>{leaderboard[0]?.total_points} نقطة</span>
                </div>
              </div>

              {/* Third place */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">جميع المتعلمين</h2>
              <div className="flex items-center space-x-2 space-x-reverse text-gray-600">
                <Users className="w-5 h-5" />
                <span className="text-sm">{leaderboard.length} متعلم</span>
              </div>
            </div>
          </div>
          
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {leaderboard.map((entry, index) => {
              const isCurrentUser = entry.user_id === currentUser?.id;
              return (
                <div key={entry.user_id} className={`p-4 lg:p-6 flex items-center justify-between hover:bg-gray-50 transition-colors ${isCurrentUser ? 'bg-blue-50 border-r-4 border-blue-500' : ''}`}>
                  <div className="flex items-center space-x-4 space-x-reverse">
                    <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center font-bold text-white text-sm lg:text-base ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className={`font-semibold text-sm lg:text-base ${isCurrentUser ? 'text-blue-800' : 'text-gray-800'}`}>
                        {entry.user_profiles?.full_name || 'مستخدم'}
                        {isCurrentUser && (
                          <span className="text-blue-600 text-xs lg:text-sm mr-2">(أنت)</span>
                        )}
                      </p>
                      {index < 3 && (
                        <p className="text-xs text-gray-500">
                          {index === 0 ? 'المركز الأول' : index === 1 ? 'المركز الثاني' : 'المركز الثالث'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Star className="w-4 h-4 lg:w-5 lg:h-5 text-yellow-500" />
                    <span className={`font-bold text-sm lg:text-base ${isCurrentUser ? 'text-blue-800' : 'text-gray-800'}`}>
                      {entry.total_points}
                    </span>
                    <span className="text-xs lg:text-sm text-gray-500">نقطة</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Empty state */}
        {leaderboard.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500 mb-2">لا توجد نتائج بعد</h3>
            <p className="text-gray-400">ابدأ حل الاختبارات لتظهر في لوحة المتصدرين</p>
          </div>
        )}
      </div>
    );
  };

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
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setCurrentView('materials')}
                className="flex items-center space-x-2 space-x-reverse text-gray-600 hover:text-gray-800 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">العودة للمواد</span>
                <span className="sm:hidden">عودة</span>
              </button>
              <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {currentQuestionIndex + 1} / {totalQuestions}
              </div>
            </div>

            <h1 className="text-xl lg:text-2xl font-bold text-gray-800 mb-4">{selectedMaterial.title}</h1>
            
            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>التقدم</span>
                <span>{Math.round(((currentQuestionIndex + 1) / totalQuestions) * 100)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((currentQuestionIndex + 1) / totalQuestions) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 lg:p-8">
            <div className="mb-6">
              <div className="flex items-center space-x-3 space-x-reverse mb-4">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-sm">{currentQuestionIndex + 1}</span>
                </div>
                <h2 className="text-lg lg:text-xl font-semibold text-gray-800 leading-relaxed">
                  {currentQuestion.question_text}
                </h2>
              </div>
            </div>

            {/* Answer options */}
            <div className="space-y-3 lg:space-y-4">
              {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
                currentQuestion.options.map((option, index) => {
                  const isSelected = userAnswers[currentQuestion.id] === option;
                  return (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(option)}
                      className={`w-full p-4 lg:p-5 text-right rounded-xl border-2 transition-all duration-200 hover:shadow-sm ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50 text-blue-800 shadow-md' 
                          : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/30'
                      }`}
                    >
                      <div className="flex items-center space-x-3 space-x-reverse">
                        <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                          isSelected ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {isSelected && <div className="w-2 h-2 bg-white rounded-full m-auto" />}
                        </div>
                        <span className="text-sm lg:text-base leading-relaxed">{option}</span>
                      </div>
                    </button>
                  );
                })
              )}

              {currentQuestion.question_type === 'true_false' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleAnswerSelect('true')}
                    className={`p-4 lg:p-6 text-center rounded-xl border-2 transition-all duration-200 hover:shadow-sm ${
                      userAnswers[currentQuestion.id] === 'true' 
                        ? 'border-green-500 bg-green-50 text-green-800 shadow-md' 
                        : 'border-gray-200 hover:border-green-300 hover:bg-green-50/30'
                    }`}
                  >
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-600" />
                    <span className="font-semibold">صحيح</span>
                  </button>
                  <button
                    onClick={() => handleAnswerSelect('false')}
                    className={`p-4 lg:p-6 text-center rounded-xl border-2 transition-all duration-200 hover:shadow-sm ${
                      userAnswers[currentQuestion.id] === 'false' 
                        ? 'border-red-500 bg-red-50 text-red-800 shadow-md' 
                        : 'border-gray-200 hover:border-red-300 hover:bg-red-50/30'
                    }`}
                  >
                    <XCircle className="w-8 h-8 mx-auto mb-2 text-red-600" />
                    <span className="font-semibold">خطأ</span>
                  </button>
                </div>
              )}

              {currentQuestion.question_type === 'short_answer' && (
                <div className="relative">
                  <textarea
                    value={userAnswers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswerSelect(e.target.value)}
                    className="w-full p-4 lg:p-5 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none resize-none transition-colors"
                    rows="6"
                    placeholder="اكتب إجابتك هنا..."
                  />
                  <div className="absolute bottom-3 left-3 text-xs text-gray-400">
                    {(userAnswers[currentQuestion.id] || '').length} حرف
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between">
              <button
                onClick={goToPrevQuestion}
                disabled={currentQuestionIndex === 0}
                className="flex items-center space-x-2 space-x-reverse px-4 py-2.5 text-gray-600 hover:text-gray-800 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent transition-colors rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">السؤال السابق</span>
                <span className="sm:hidden">السابق</span>
              </button>

              <div className="text-center px-4">
                <p className="text-sm text-gray-600 mb-1">
                  <span className="font-medium text-blue-600">{answeredQuestions}</span>
                  <span className="mx-1">من</span>
                  <span>{totalQuestions}</span>
                </p>
                <p className="text-xs text-gray-400">تم الإجابة</p>
              </div>

              {currentQuestionIndex === questions.length - 1 ? (
                <button
                  onClick={finishQuiz}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                >
                  <span className="hidden sm:inline">إنهاء الاختبار</span>
                  <span className="sm:hidden">إنهاء</span>
                </button>
              ) : (
                <button
                  onClick={goToNextQuestion}
                  className="flex items-center space-x-2 space-x-reverse px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg font-medium"
                >
                  <span className="hidden sm:inline">السؤال التالي</span>
                  <span className="sm:hidden">التالي</span>
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>
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
    <div className="min-h-screen bg-gray-50 flex" dir="rtl">
      <Sidebar />
      
      {/* Main container */}
      <div className="flex-1 flex flex-col min-w-0 xl:mr-64">
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
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
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