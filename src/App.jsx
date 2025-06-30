import React, { useState, useEffect } from 'react';
import { ChevronRight, BookOpen, Trophy, User, Home, BarChart3, CheckCircle2, XCircle, Clock, ExternalLink, LogOut, Plus, Edit, Trash2, Save, X, Menu, Star, Award, Users, FileText, Target, ArrowLeft, TrendingUp, PieChart, Settings, Activity, BookmarkCheck, Calendar, AlertCircle, Download, Filter, Search, Bell } from 'lucide-react';

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

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
      checkAdminStatus(data.email);
    }
  };

  // Check if user is admin
  const checkAdminStatus = (email) => {
    const adminEmails = ['nama47@nama47.com'];
    setIsAdmin(adminEmails.includes(email));
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

  // Admin functions
  const loadAllUsers = async () => {
    if (!supabase || !isAdmin) return;
    
    const { data, error } = await supabase
      .from('reading_club_profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) {
      setAllUsers(data);
    }
  };

  const saveMaterial = async (materialData) => {
    if (!supabase || !isAdmin) return;
    
    setLoading(true);
    try {
      if (editingMaterial) {
        // Update existing material
        const { error } = await supabase
          .from('reading_club_materials')
          .update(materialData)
          .eq('id', editingMaterial.id);
        
        if (error) throw error;
      } else {
        // Create new material
        const { error } = await supabase
          .from('reading_club_materials')
          .insert([materialData]);
        
        if (error) throw error;
      }
      
      await loadMaterials();
      setShowMaterialForm(false);
      setEditingMaterial(null);
    } catch (error) {
      setError('حدث خطأ أثناء حفظ المادة');
    } finally {
      setLoading(false);
    }
  };

  const deleteMaterial = async (materialId) => {
    if (!supabase || !isAdmin) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('reading_club_materials')
        .delete()
        .eq('id', materialId);
      
      if (error) throw error;
      
      await loadMaterials();
    } catch (error) {
      setError('حدث خطأ أثناء حذف المادة');
    } finally {
      setLoading(false);
    }
  };

  const saveQuestion = async (questionData) => {
    if (!supabase || !isAdmin) return;
    
    setLoading(true);
    try {
      if (editingQuestion) {
        // Update existing question
        const { error } = await supabase
          .from('reading_club_questions')
          .update(questionData)
          .eq('id', editingQuestion.id);
        
        if (error) throw error;
      } else {
        // Create new question
        const { error } = await supabase
          .from('reading_club_questions')
          .insert([questionData]);
        
        if (error) throw error;
      }
      
      if (selectedMaterial) {
        await loadQuestions(selectedMaterial.id);
      }
      setShowQuestionForm(false);
      setEditingQuestion(null);
    } catch (error) {
      setError('حدث خطأ أثناء حفظ السؤال');
    } finally {
      setLoading(false);
    }
  };

  const deleteQuestion = async (questionId) => {
    if (!supabase || !isAdmin) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('reading_club_questions')
        .delete()
        .eq('id', questionId);
      
      if (error) throw error;
      
      if (selectedMaterial) {
        await loadQuestions(selectedMaterial.id);
      }
    } catch (error) {
      setError('حدث خطأ أثناء حذف السؤال');
    } finally {
      setLoading(false);
    }
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

  // Sidebar components - تم تحسين التصميم
  const StudentSidebar = () => (
    <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-gradient-to-b from-gray-50 to-white shadow-xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} xl:translate-x-0 xl:static xl:inset-0 xl:shadow-none xl:border-l xl:border-gray-200`}>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold truncate">نادي القراءة</h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="xl:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
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
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-all text-right ${
              currentView === 'home'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-700'
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
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-all text-right ${
              currentView === 'materials'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-green-50 hover:text-green-700'
            }`}
          >
            <BookOpen className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">المواد الإثرائية</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('leaderboard');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-all text-right ${
              currentView === 'leaderboard'
                ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-yellow-50 hover:text-yellow-700'
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
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-all text-right ${
              currentView === 'profile'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-purple-50 hover:text-purple-700'
            }`}
          >
            <User className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">الملف الشخصي</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('statistics');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-all text-right ${
              currentView === 'statistics'
                ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-lg transform scale-105'
                : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
            }`}
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">الإحصائيات</span>
          </button>
        </nav>

        {/* User info */}
        <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100">
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
              <User className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {userProfile?.full_name || currentUser?.email}
              </p>
              <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" />
                عضو نشط
              </p>
            </div>
          </div>
          
          <div className="bg-white rounded-lg p-3 mb-3 border border-gray-200">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">النقاط الإجمالية</span>
              <div className="flex items-center gap-1">
                <Award className="w-4 h-4 text-yellow-500" />
                <span className="font-bold text-blue-600">
                  {scores.reduce((total, score) => total + score.total_points, 0)}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 space-x-reverse text-red-600 hover:text-white hover:bg-red-500 py-3 px-3 rounded-xl transition-all transform hover:scale-105 text-sm font-medium shadow-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );

  const AdminSidebar = () => (
    <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-gradient-to-b from-gray-800 to-gray-900 shadow-xl transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} xl:translate-x-0 xl:static xl:inset-0 xl:shadow-none`}>
      <div className="flex flex-col h-full text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-gradient-to-r from-red-600 to-pink-600">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <h2 className="text-xl font-bold truncate">لوحة الإدارة</h2>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="xl:hidden p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <button
            onClick={() => {
              setCurrentView('admin-dashboard');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-all text-right ${
              currentView === 'admin-dashboard'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 shadow-lg transform scale-105'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <BarChart3 className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">لوحة التحكم</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('admin-materials');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-all text-right ${
              currentView === 'admin-materials'
                ? 'bg-gradient-to-r from-green-500 to-green-600 shadow-lg transform scale-105'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <FileText className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">إدارة المواد</span>
          </button>

          <button
            onClick={() => {
              setCurrentView('admin-users');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center space-x-3 space-x-reverse px-4 py-3 rounded-xl transition-all text-right ${
              currentView === 'admin-users'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 shadow-lg transform scale-105'
                : 'text-gray-300 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <Users className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium">إدارة المستخدمين</span>
          </button>
        </nav>

        {/* Admin info */}
        <div className="p-4 bg-gradient-to-r from-gray-700 to-gray-800">
          <div className="flex items-center space-x-3 space-x-reverse mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-red-600 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
              <Settings className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">
                {userProfile?.full_name || currentUser?.email}
              </p>
              <p className="text-xs text-gray-300 truncate flex items-center gap-1">
                <Award className="w-3 h-3 text-yellow-500" />
                مدير النظام
              </p>
            </div>
          </div>
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center space-x-2 space-x-reverse text-red-400 hover:text-white hover:bg-red-600 py-3 px-3 rounded-xl transition-all transform hover:scale-105 text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Main Sidebar component that switches between Student and Admin
  const Sidebar = () => isAdmin ? <AdminSidebar /> : <StudentSidebar />;

  // Home page component - تم تحسين التصميم
  const HomePage = () => {
    const totalPoints = scores.reduce((sum, score) => sum + score.total_points, 0);
    const completedMaterials = scores.length;
    const averageScore = completedMaterials > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score.percentage, 0) / completedMaterials)
      : 0;
    const userRank = leaderboard.findIndex(entry => entry.user_id === currentUser?.id) + 1;

    return (
      <div className="p-6 space-y-8" dir="rtl">
        {/* Header for mobile */}
        <div className="xl:hidden flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">الرئيسية</h1>
          <Home className="w-8 h-8 text-blue-600" />
        </div>

        {/* Enhanced Welcome section with gradients */}
        <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-2xl shadow-2xl p-8 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent rounded-2xl"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-6 space-x-reverse">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                  <User className="w-10 h-10" />
                </div>
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-3">
                    مرحباً، {userProfile?.full_name || 'عضو محترم'}
                  </h2>
                  <p className="text-white/90 text-lg leading-relaxed">
                    استمر في رحلتك القرائية واكتشف عوالم جديدة من المعرفة والإبداع
                  </p>
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm shadow-lg">
                  <BookOpen className="w-12 h-12 text-white" />
                </div>
              </div>
            </div>
            
            {/* User Progress Summary with enhanced design */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-5 text-center border border-white/20">
                <div className="text-3xl font-bold mb-1">{completedMaterials}</div>
                <div className="text-sm opacity-90">مادة مكتملة</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-5 text-center border border-white/20">
                <div className="text-3xl font-bold mb-1">{averageScore}%</div>
                <div className="text-sm opacity-90">متوسط الدرجات</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-5 text-center border border-white/20">
                <div className="text-3xl font-bold mb-1">{totalPoints}</div>
                <div className="text-sm opacity-90">إجمالي النقاط</div>
              </div>
              <div className="bg-white/15 backdrop-blur-md rounded-xl p-5 text-center border border-white/20">
                <div className="text-3xl font-bold mb-1">#{userRank || '-'}</div>
                <div className="text-sm opacity-90">ترتيبك</div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Quick Access Cards with hover effects */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
               onClick={() => setCurrentView('materials')}>
            <div className="flex items-center space-x-4 space-x-reverse mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-800">{materials.length}</p>
                <p className="text-sm text-gray-600">مادة متاحة</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-blue-600 font-semibold">تصفح المواد</span>
              <ChevronRight className="w-5 h-5 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
               onClick={() => setCurrentView('profile')}>
            <div className="flex items-center space-x-4 space-x-reverse mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-800">{scores.length}</p>
                <p className="text-sm text-gray-600">اختبار مكتمل</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-green-600 font-semibold">عرض الملف الشخصي</span>
              <ChevronRight className="w-5 h-5 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
               onClick={() => setCurrentView('leaderboard')}>
            <div className="flex items-center space-x-4 space-x-reverse mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-800">#{userRank || '-'}</p>
                <p className="text-sm text-gray-600">ترتيبك</p>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-yellow-600 font-semibold">لوحة المتصدرين</span>
              <ChevronRight className="w-5 h-5 text-yellow-600" />
            </div>
          </div>
        </div>

        {/* Enhanced Recent materials section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">المواد الحديثة</h3>
            </div>
            <button
              onClick={() => setCurrentView('materials')}
              className="bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 space-x-reverse transition-colors"
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
                <div key={material.id} className="flex items-center space-x-4 space-x-reverse p-4 border border-gray-200 rounded-xl hover:bg-gradient-to-r hover:from-gray-50 hover:to-blue-50 transition-all duration-300">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    isCompleted ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-blue-500 to-blue-600'
                  } shadow-lg`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-white" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-800 mb-1">{material.title}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2">{material.description}</p>
                  </div>
                  
                  <div className="flex items-center space-x-3 space-x-reverse">
                    {materialScore && (
                      <div className="flex items-center space-x-1 space-x-reverse">
                        <Star className="w-4 h-4 text-yellow-500" />
                        <span className="text-sm font-semibold text-green-600">
                          {materialScore.percentage}%
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        setSelectedMaterial(material);
                        setCurrentView('quiz');
                        loadQuestions(material.id);
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isCompleted 
                          ? 'bg-green-50 text-green-600 hover:bg-green-100'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                      }`}
                    >
                      {isCompleted ? 'إعادة الاختبار' : 'بدء الاختبار'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Enhanced Top performers section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-yellow-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-800">المتصدرون</h3>
            </div>
            <button
              onClick={() => setCurrentView('leaderboard')}
              className="bg-yellow-50 hover:bg-yellow-100 text-yellow-600 hover:text-yellow-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center space-x-2 space-x-reverse transition-colors"
            >
              <span>عرض الكل</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-3">
            {leaderboard.slice(0, 5).map((entry, index) => (
              <div key={entry.user_id} className="flex items-center space-x-4 space-x-reverse p-3 rounded-xl hover:bg-gray-50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm ${
                  index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                  index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' :
                  index === 2 ? 'bg-gradient-to-r from-orange-400 to-orange-500 text-white' :
                  'bg-gradient-to-r from-blue-400 to-blue-500 text-white'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex-1">
                  <p className="font-semibold text-gray-800">
                    {entry.user_profiles?.full_name || 'مستخدم'}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <div className="flex items-center space-x-1 space-x-reverse text-gray-600">
                    <Award className="w-4 h-4 text-yellow-500" />
                    <span className="text-sm font-semibold">{entry.total_points}</span>
                  </div>
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

      {/* Enhanced Statistics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Materials Card */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-2xl shadow-lg border border-blue-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-800 bg-clip-text text-transparent">
                {materials.length}
              </p>
              <p className="text-sm text-blue-700 font-medium">إجمالي المواد</p>
            </div>
          </div>
        </div>

        {/* Completed Materials Card */}
        <div className="bg-gradient-to-br from-green-50 to-emerald-100 p-6 rounded-2xl shadow-lg border border-green-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-800 bg-clip-text text-transparent">
                {scores.length}
              </p>
              <p className="text-sm text-green-700 font-medium">مواد مكتملة</p>
            </div>
          </div>
        </div>

        {/* Remaining Materials Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-100 p-6 rounded-2xl shadow-lg border border-amber-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold bg-gradient-to-r from-amber-700 to-orange-800 bg-clip-text text-transparent">
                {materials.length - scores.length}
              </p>
              <p className="text-sm text-amber-700 font-medium">مواد متبقية</p>
            </div>
          </div>
        </div>

        {/* Average Score Card */}
        <div className="bg-gradient-to-br from-purple-50 to-pink-100 p-6 rounded-2xl shadow-lg border border-purple-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <Target className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold bg-gradient-to-r from-purple-700 to-pink-800 bg-clip-text text-transparent">
                {scores.length > 0 
                  ? Math.round(scores.reduce((sum, score) => sum + score.percentage, 0) / scores.length)
                  : 0
                }%
              </p>
              <p className="text-sm text-purple-700 font-medium">متوسط الدرجات</p>
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
            <div 
              key={material.id} 
              className={`relative overflow-hidden rounded-2xl shadow-lg border-0 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 ${
                isCompleted 
                  ? 'bg-gradient-to-br from-green-50 via-white to-emerald-50' 
                  : 'bg-gradient-to-br from-blue-50 via-white to-indigo-50'
              }`}
            >
              {/* Decorative gradient overlay */}
              <div className={`absolute top-0 right-0 w-20 h-20 opacity-10 ${
                isCompleted 
                  ? 'bg-gradient-to-bl from-green-400 to-transparent' 
                  : 'bg-gradient-to-bl from-blue-400 to-transparent'
              }`}></div>
              
              <div className="relative z-10">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-2 line-clamp-2">
                      {material.title}
                    </h3>
                    <p className="text-gray-600 text-sm line-clamp-3 mb-4 leading-relaxed">
                      {material.description}
                    </p>
                  </div>
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ml-3 shadow-md ${
                    isCompleted 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                      : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    ) : (
                      <BookOpen className="w-6 h-6 text-white" />
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  {materialScore && (
                    <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-white/20">
                      <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-gray-700 font-medium">أفضل نتيجة</span>
                        <span className={`font-bold text-lg ${
                          materialScore.percentage >= 80 ? 'text-green-600' :
                          materialScore.percentage >= 60 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {materialScore.percentage}%
                        </span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-500 ${
                            materialScore.percentage >= 80 ? 'bg-gradient-to-r from-green-400 to-green-600' :
                            materialScore.percentage >= 60 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                            'bg-gradient-to-r from-red-400 to-red-600'
                          }`}
                          style={{ width: `${materialScore.percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {material.material_url && (
                    <a
                      href={material.material_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-center space-x-2 space-x-reverse bg-white/70 backdrop-blur-sm text-gray-700 py-3 px-4 rounded-xl hover:bg-white/90 transition-all duration-200 text-sm font-medium border border-gray-200/50 shadow-sm hover:shadow-md"
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
                    className={`w-full py-3 px-4 rounded-xl transition-all duration-200 text-sm font-medium shadow-lg hover:shadow-xl transform hover:scale-105 ${
                      isCompleted 
                        ? 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white'
                    }`}
                  >
                    {materialScore ? (
                      <span className="flex items-center justify-center space-x-2 space-x-reverse">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>إعادة الاختبار</span>
                      </span>
                    ) : (
                      <span className="flex items-center justify-center space-x-2 space-x-reverse">
                        <BookOpen className="w-4 h-4" />
                        <span>بدء الاختبار</span>
                      </span>
                    )}
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

  // Quiz Selection page component
  const QuizSelectionPage = () => {
    if (!selectedMaterial) {
      setCurrentView('materials');
      return null;
    }

    const materialScore = scores.find(s => s.material_id === selectedMaterial.id);

    return (
      <div className="min-h-screen bg-gray-50 p-4" dir="rtl">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6 p-6">
            <div className="flex items-center space-x-4 space-x-reverse mb-4">
              <button
                onClick={() => setCurrentView('materials')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-800">{selectedMaterial.title}</h1>
                <p className="text-gray-600">{selectedMaterial.description}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4 space-x-reverse text-sm text-gray-600">
              <div className="flex items-center space-x-1 space-x-reverse">
                <BookOpen className="w-4 h-4" />
                <span>مادة تعليمية</span>
              </div>
              <div className="flex items-center space-x-1 space-x-reverse">
                <Clock className="w-4 h-4" />
                <span>وقت مقدر: 30 دقيقة</span>
              </div>
            </div>
          </div>

          {/* Quiz Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-gray-800 mb-2">اختبار المادة</h2>
                <p className="text-gray-600">اختبر معرفتك في هذه المادة</p>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{questions.length}</div>
                <div className="text-sm text-gray-600">سؤال</div>
              </div>
            </div>

            {/* Quiz Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Target className="w-5 h-5 text-blue-600" />
                  <span className="font-medium text-blue-900">عدد الأسئلة</span>
                </div>
                <div className="text-2xl font-bold text-blue-600 mt-1">{questions.length}</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Clock className="w-5 h-5 text-green-600" />
                  <span className="font-medium text-green-900">الوقت المقدر</span>
                </div>
                <div className="text-2xl font-bold text-green-600 mt-1">{Math.ceil(questions.length * 2)} دقيقة</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Star className="w-5 h-5 text-purple-600" />
                  <span className="font-medium text-purple-900">النقاط المتاحة</span>
                </div>
                <div className="text-2xl font-bold text-purple-600 mt-1">{questions.length * 10}</div>
              </div>
            </div>

            {/* Previous Score if exists */}
            {materialScore && (
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-gray-800">آخر محاولة</h3>
                    <p className="text-sm text-gray-600">يمكنك إعادة المحاولة لتحسين درجتك</p>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {materialScore.percentage}%
                    </div>
                    <div className="text-sm text-gray-600">الدرجة</div>
                  </div>
                </div>
              </div>
            )}

            {/* Start Quiz Button */}
            <div className="text-center">
              <button
                onClick={() => {
                  setCurrentView('quiz');
                  setCurrentQuestionIndex(0);
                  setUserAnswers({});
                }}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 space-x-reverse mx-auto text-lg font-medium"
              >
                <BookOpen className="w-5 h-5" />
                <span>بدء الاختبار</span>
              </button>
            </div>
          </div>
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

  // Statistics page component
  const StatisticsPage = () => {
    const totalPoints = scores.reduce((sum, score) => sum + score.total_points, 0);
    const completedMaterials = scores.length;
    const averageScore = completedMaterials > 0 
      ? Math.round(scores.reduce((sum, score) => sum + score.percentage, 0) / completedMaterials)
      : 0;
    const userRank = leaderboard.findIndex(entry => entry.user_id === currentUser?.id) + 1;
    
    // Calculate performance trends
    const recentScores = scores.slice(-5);
    const perfectScores = scores.filter(s => s.percentage === 100).length;
    const goodScores = scores.filter(s => s.percentage >= 80 && s.percentage < 100).length;
    const averageScores = scores.filter(s => s.percentage >= 60 && s.percentage < 80).length;
    const poorScores = scores.filter(s => s.percentage < 60).length;

    return (
      <div className="space-y-8">
        {/* Header for mobile */}
        <div className="xl:hidden flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">الإحصائيات</h1>
          <BarChart3 className="w-8 h-8 text-blue-600" />
        </div>

        {/* Overall Performance Summary */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl shadow-xl p-6 text-white">
          <h2 className="text-2xl font-bold mb-6">ملخص الأداء العام</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{totalPoints}</div>
              <div className="text-sm opacity-90">إجمالي النقاط</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{completedMaterials}</div>
              <div className="text-sm opacity-90">مادة مكتملة</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">{averageScore}%</div>
              <div className="text-sm opacity-90">متوسط الدرجات</div>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-3xl font-bold">#{userRank || '-'}</div>
              <div className="text-sm opacity-90">ترتيبك</div>
            </div>
          </div>
        </div>

        {/* Performance Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2 space-x-reverse">
            <PieChart className="w-6 h-6 text-blue-600" />
            <span>توزيع الأداء</span>
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="text-2xl font-bold text-green-600">{perfectScores}</div>
              </div>
              <div className="text-sm text-gray-600">درجات مثالية</div>
              <div className="text-xs text-gray-500">(100%)</div>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="text-2xl font-bold text-blue-600">{goodScores}</div>
              </div>
              <div className="text-sm text-gray-600">درجات جيدة</div>
              <div className="text-xs text-gray-500">(80-99%)</div>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="text-2xl font-bold text-yellow-600">{averageScores}</div>
              </div>
              <div className="text-sm text-gray-600">درجات متوسطة</div>
              <div className="text-xs text-gray-500">(60-79%)</div>
            </div>
            
            <div className="text-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <div className="text-2xl font-bold text-red-600">{poorScores}</div>
              </div>
              <div className="text-sm text-gray-600">درجات ضعيفة</div>
              <div className="text-xs text-gray-500">(أقل من 60%)</div>
            </div>
          </div>
        </div>

        {/* Recent Performance Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2 space-x-reverse">
            <TrendingUp className="w-6 h-6 text-green-600" />
            <span>الأداء الحديث</span>
          </h3>
          
          {recentScores.length > 0 ? (
            <div className="space-y-4">
              {recentScores.reverse().map((score, index) => {
                const material = materials.find(m => m.id === score.material_id);
                return (
                  <div key={score.id} className="flex items-center space-x-4 space-x-reverse p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold ${
                        score.percentage >= 90 ? 'bg-green-500' :
                        score.percentage >= 80 ? 'bg-blue-500' :
                        score.percentage >= 70 ? 'bg-yellow-500' :
                        score.percentage >= 60 ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}>
                        {score.percentage}%
                      </div>
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">
                        {material?.title || 'مادة غير معروفة'}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {new Date(score.completed_at).toLocaleDateString('ar-SA')}
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">{score.total_points}</div>
                      <div className="text-sm text-gray-600">نقطة</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">لم تكمل أي اختبارات بعد</p>
              <button
                onClick={() => setCurrentView('materials')}
                className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                تصفح المواد
              </button>
            </div>
          )}
        </div>

        {/* Detailed Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2 space-x-reverse">
              <Target className="w-5 h-5 text-purple-600" />
              <span>إحصائيات مفصلة</span>
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">أعلى درجة</span>
                <span className="font-bold text-green-600">
                  {scores.length > 0 ? Math.max(...scores.map(s => s.percentage)) : 0}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">أقل درجة</span>
                <span className="font-bold text-red-600">
                  {scores.length > 0 ? Math.min(...scores.map(s => s.percentage)) : 0}%
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">إجمالي الاختبارات</span>
                <span className="font-bold text-blue-600">{scores.length}</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-600">معدل النجاح</span>
                <span className="font-bold text-purple-600">
                  {scores.length > 0 
                    ? Math.round((scores.filter(s => s.percentage >= 60).length / scores.length) * 100)
                    : 0
                  }%
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center space-x-2 space-x-reverse">
              <Award className="w-5 h-5 text-yellow-600" />
              <span>الإنجازات</span>
            </h3>
            
            <div className="space-y-3">
              {perfectScores > 0 && (
                <div className="flex items-center space-x-3 space-x-reverse p-3 bg-green-50 rounded-lg">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <Award className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <div className="font-medium text-green-800">درجات مثالية</div>
                    <div className="text-sm text-green-600">{perfectScores} اختبار بدرجة كاملة</div>
                  </div>
                </div>
              )}
              
              {averageScore >= 80 && (
                <div className="flex items-center space-x-3 space-x-reverse p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Star className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-medium text-blue-800">متفوق</div>
                    <div className="text-sm text-blue-600">متوسط درجات ممتاز</div>
                  </div>
                </div>
              )}
              
              {completedMaterials >= 5 && (
                <div className="flex items-center space-x-3 space-x-reverse p-3 bg-purple-50 rounded-lg">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="font-medium text-purple-800">قارئ نشط</div>
                    <div className="text-sm text-purple-600">أكمل {completedMaterials} مادة</div>
                  </div>
                </div>
              )}
              
              {userRank <= 10 && userRank > 0 && (
                <div className="flex items-center space-x-3 space-x-reverse p-3 bg-yellow-50 rounded-lg">
                  <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                    <Trophy className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <div className="font-medium text-yellow-800">ضمن العشرة الأوائل</div>
                    <div className="text-sm text-yellow-600">المركز #{userRank}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Admin Dashboard Component
  const AdminDashboardPage = () => {
    const totalUsers = allUsers.length;
    const totalMaterials = materials.length;
    const totalQuestions = questions.length;
    const totalAttempts = scores.length;

    useEffect(() => {
      if (isAdmin) {
        loadAllUsers();
      }
    }, [isAdmin]);

    return (
      <div className="space-y-8">
        <div className="xl:hidden flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">لوحة الإدارة</h1>
          <BarChart3 className="w-8 h-8 text-red-600" />
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalUsers}</p>
                <p className="text-sm text-gray-600">إجمالي المستخدمين</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalMaterials}</p>
                <p className="text-sm text-gray-600">إجمالي المواد</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalQuestions}</p>
                <p className="text-sm text-gray-600">إجمالي الأسئلة</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 space-x-reverse">
              <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{totalAttempts}</p>
                <p className="text-sm text-gray-600">إجمالي المحاولات</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">آخر المحاولات</h3>
          <div className="space-y-3">
            {scores.slice().reverse().slice(0, 10).map((score) => {
              const material = materials.find(m => m.id === score.material_id);
              const user = allUsers.find(u => u.id === score.user_id);
              
              return (
                <div key={score.id} className="flex items-center space-x-4 space-x-reverse p-3 border border-gray-100 rounded-lg">
                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{user?.full_name || 'مستخدم'}</p>
                    <p className="text-sm text-gray-600">{material?.title || 'مادة محذوفة'}</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-bold ${
                      score.percentage >= 80 ? 'text-green-600' :
                      score.percentage >= 60 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {score.percentage}%
                    </p>
                    <p className="text-xs text-gray-500">{score.points} نقطة</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Admin Materials Management Component
  const AdminMaterialsPage = () => {
    const [materialForm, setMaterialForm] = useState({
      title: '',
      description: '',
      material_url: ''
    });

    useEffect(() => {
      if (editingMaterial) {
        setMaterialForm(editingMaterial);
      } else {
        setMaterialForm({ title: '', description: '', material_url: '' });
      }
    }, [editingMaterial]);

    const handleSaveMaterial = async (e) => {
      e.preventDefault();
      await saveMaterial(materialForm);
    };

    return (
      <div className="space-y-8">
        <div className="xl:hidden flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">إدارة المواد</h1>
          <Edit className="w-8 h-8 text-red-600" />
        </div>

        {/* Add/Edit Material Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingMaterial ? 'تعديل المادة' : 'إضافة مادة جديدة'}
            </h3>
            {showMaterialForm && (
              <button
                onClick={() => {
                  setShowMaterialForm(false);
                  setEditingMaterial(null);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {showMaterialForm || editingMaterial ? (
            <form onSubmit={handleSaveMaterial} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  عنوان المادة
                </label>
                <input
                  type="text"
                  value={materialForm.title}
                  onChange={(e) => setMaterialForm({...materialForm, title: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  وصف المادة
                </label>
                <textarea
                  value={materialForm.description}
                  onChange={(e) => setMaterialForm({...materialForm, description: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  رابط المادة (اختياري)
                </label>
                <input
                  type="url"
                  value={materialForm.material_url}
                  onChange={(e) => setMaterialForm({...materialForm, material_url: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex space-x-3 space-x-reverse">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 space-x-reverse px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'جاري الحفظ...' : 'حفظ'}</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowMaterialForm(false);
                    setEditingMaterial(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowMaterialForm(true)}
              className="flex items-center space-x-2 space-x-reverse px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة مادة جديدة</span>
            </button>
          )}
        </div>

        {/* Materials List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">المواد الموجودة</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {materials.map((material) => (
              <div key={material.id} className="p-4 flex items-center space-x-4 space-x-reverse">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-800">{material.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{material.description}</p>
                  {material.material_url && (
                    <a
                      href={material.material_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm mt-1 inline-flex items-center space-x-1 space-x-reverse"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>عرض المادة</span>
                    </a>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 space-x-reverse">
                  <button
                    onClick={() => {
                      setSelectedMaterial(material);
                      setCurrentView('admin-questions');
                      loadQuestions(material.id);
                    }}
                    className="p-2 text-purple-600 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Target className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      setEditingMaterial(material);
                      setShowMaterialForm(true);
                    }}
                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => {
                      if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
                        deleteMaterial(material.id);
                      }
                    }}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Admin Users Management Component
  const AdminUsersPage = () => {
    useEffect(() => {
      if (isAdmin) {
        loadAllUsers();
      }
    }, [isAdmin]);

    return (
      <div className="space-y-8">
        <div className="xl:hidden flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h1>
          <Users className="w-8 h-8 text-red-600" />
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">قائمة المستخدمين</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {allUsers.map((user) => {
              const userScores = scores.filter(score => score.user_id === user.id);
              const totalPoints = userScores.reduce((sum, score) => sum + score.total_points, 0);
              const isUserAdmin = user.email === 'nama47@nama47.com';
              
              return (
                <div key={user.id} className="p-4 flex items-center space-x-4 space-x-reverse">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-600" />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 space-x-reverse">
                      <h4 className="font-medium text-gray-800">{user.full_name}</h4>
                      {isUserAdmin && (
                        <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          مدير
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{user.email}</p>
                    <p className="text-xs text-gray-500">
                      انضم في {new Date(user.created_at).toLocaleDateString('ar')}
                    </p>
                  </div>
                  
                  <div className="text-center">
                    <p className="font-semibold text-gray-800">{totalPoints}</p>
                    <p className="text-xs text-gray-500">نقطة</p>
                  </div>
                  
                  <div className="text-center">
                    <p className="font-semibold text-gray-800">{userScores.length}</p>
                    <p className="text-xs text-gray-500">محاولة</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Admin Questions Management Component
  const AdminQuestionsPage = () => {
    const [questionForm, setQuestionForm] = useState({
      question_text: '',
      question_type: 'multiple_choice',
      option_a: '',
      option_b: '',
      option_c: '',
      option_d: '',
      correct_answer: '',
      question_order: questions.length + 1
    });

    useEffect(() => {
      if (editingQuestion) {
        setQuestionForm(editingQuestion);
      } else {
        setQuestionForm({
          question_text: '',
          question_type: 'multiple_choice',
          option_a: '',
          option_b: '',
          option_c: '',
          option_d: '',
          correct_answer: '',
          question_order: questions.length + 1
        });
      }
    }, [editingQuestion, questions.length]);

    const handleSaveQuestion = async (e) => {
      e.preventDefault();
      const questionData = {
        ...questionForm,
        material_id: selectedMaterial.id
      };
      await saveQuestion(questionData);
    };

    return (
      <div className="space-y-8">
        <div className="flex items-center space-x-4 space-x-reverse">
          <button
            onClick={() => setCurrentView('admin-materials')}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-800">
              إدارة أسئلة: {selectedMaterial?.title}
            </h1>
          </div>
          <Target className="w-8 h-8 text-red-600" />
        </div>

        {/* Add/Edit Question Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">
              {editingQuestion ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
            </h3>
            {showQuestionForm && (
              <button
                onClick={() => {
                  setShowQuestionForm(false);
                  setEditingQuestion(null);
                }}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {showQuestionForm || editingQuestion ? (
            <form onSubmit={handleSaveQuestion} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نص السؤال
                </label>
                <textarea
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({...questionForm, question_text: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows="3"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  نوع السؤال
                </label>
                <select
                  value={questionForm.question_type}
                  onChange={(e) => setQuestionForm({...questionForm, question_type: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="multiple_choice">متعدد الخيارات</option>
                  <option value="true_false">صح أم خطأ</option>
                </select>
              </div>

              {questionForm.question_type === 'multiple_choice' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الخيار أ
                      </label>
                      <input
                        type="text"
                        value={questionForm.option_a}
                        onChange={(e) => setQuestionForm({...questionForm, option_a: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الخيار ب
                      </label>
                      <input
                        type="text"
                        value={questionForm.option_b}
                        onChange={(e) => setQuestionForm({...questionForm, option_b: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الخيار ج (اختياري)
                      </label>
                      <input
                        type="text"
                        value={questionForm.option_c}
                        onChange={(e) => setQuestionForm({...questionForm, option_c: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        الخيار د (اختياري)
                      </label>
                      <input
                        type="text"
                        value={questionForm.option_d}
                        onChange={(e) => setQuestionForm({...questionForm, option_d: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      الإجابة الصحيحة
                    </label>
                    <select
                      value={questionForm.correct_answer}
                      onChange={(e) => setQuestionForm({...questionForm, correct_answer: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">اختر الإجابة الصحيحة</option>
                      <option value="A">الخيار أ</option>
                      <option value="B">الخيار ب</option>
                      {questionForm.option_c && <option value="C">الخيار ج</option>}
                      {questionForm.option_d && <option value="D">الخيار د</option>}
                    </select>
                  </div>
                </>
              )}

              {questionForm.question_type === 'true_false' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    الإجابة الصحيحة
                  </label>
                  <select
                    value={questionForm.correct_answer}
                    onChange={(e) => setQuestionForm({...questionForm, correct_answer: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">اختر الإجابة الصحيحة</option>
                    <option value="true">صحيح</option>
                    <option value="false">خطأ</option>
                  </select>
                </div>
              )}

              <div className="flex space-x-3 space-x-reverse">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 space-x-reverse px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  <span>{loading ? 'جاري الحفظ...' : 'حفظ'}</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setShowQuestionForm(false);
                    setEditingQuestion(null);
                  }}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowQuestionForm(true)}
              className="flex items-center space-x-2 space-x-reverse px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              <span>إضافة سؤال جديد</span>
            </button>
          )}
        </div>

        {/* Questions List */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">الأسئلة الموجودة ({questions.length})</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {questions.map((question, index) => (
              <div key={question.id} className="p-4">
                <div className="flex items-start space-x-4 space-x-reverse">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 space-x-reverse mb-2">
                      <span className="text-sm font-medium text-gray-500">السؤال {index + 1}</span>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        question.question_type === 'multiple_choice' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {question.question_type === 'multiple_choice' ? 'متعدد الخيارات' : 'صح أم خطأ'}
                      </span>
                    </div>
                    <p className="font-medium text-gray-800 mb-3">{question.question_text}</p>
                    
                    {question.question_type === 'multiple_choice' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <p className={`p-2 rounded ${question.correct_answer === 'A' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                          أ. {question.option_a}
                        </p>
                        <p className={`p-2 rounded ${question.correct_answer === 'B' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                          ب. {question.option_b}
                        </p>
                        {question.option_c && (
                          <p className={`p-2 rounded ${question.correct_answer === 'C' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                            ج. {question.option_c}
                          </p>
                        )}
                        {question.option_d && (
                          <p className={`p-2 rounded ${question.correct_answer === 'D' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                            د. {question.option_d}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {question.question_type === 'true_false' && (
                      <div className="flex space-x-4 space-x-reverse text-sm">
                        <span className={`px-3 py-1 rounded ${question.correct_answer === 'true' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                          صحيح
                        </span>
                        <span className={`px-3 py-1 rounded ${question.correct_answer === 'false' ? 'bg-green-100 text-green-800' : 'bg-gray-100'}`}>
                          خطأ
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <button
                      onClick={() => {
                        setEditingQuestion(question);
                        setShowQuestionForm(true);
                      }}
                      className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
                          deleteQuestion(question.id);
                        }
                      }}
                      className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {questions.length === 0 && (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-500 mb-2">لا توجد أسئلة</h3>
              <p className="text-gray-400">ابدأ بإضافة أسئلة لهذه المادة</p>
            </div>
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
                {currentView === 'admin-dashboard' && 'لوحة الإدارة'}
                {currentView === 'admin-materials' && 'إدارة المواد'}
                {currentView === 'admin-users' && 'إدارة المستخدمين'}
                {currentView === 'admin-questions' && `إدارة أسئلة: ${selectedMaterial?.title}`}
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
            {currentView === 'quiz-selection' && <QuizSelectionPage />}
            {currentView === 'quiz' && <QuizPage />}
            {currentView === 'statistics' && <StatisticsPage />}
            {currentView === 'admin-dashboard' && isAdmin && <AdminDashboardPage />}
            {currentView === 'admin-materials' && isAdmin && <AdminMaterialsPage />}
            {currentView === 'admin-users' && isAdmin && <AdminUsersPage />}
            {currentView === 'admin-questions' && isAdmin && <AdminQuestionsPage />}
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