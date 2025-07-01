import React, { useState, useEffect } from 'react';
import { ChevronRight, BookOpen, Trophy, User, Home, BarChart3, CheckCircle2, XCircle, Clock, ExternalLink, LogOut, Plus, Edit, Trash2, Save, X, Menu, Users, TrendingUp, Award, Target, PieChart, FileText, Calendar, AlertCircle, Download, Filter, Search, Bell, Settings, Star, Activity, BookmarkCheck } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey);





// متغيرات مؤقتة للاختبارات (ستُحدث لاحقاً لتستخدم قاعدة البيانات)
const mockQuizzes = {};
const mockQuestions = {};

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [currentView, setCurrentView] = useState('login');
  const [materials, setMaterials] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState(null);
  const [selectedQuiz, setSelectedQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [userAnswers, setUserAnswers] = useState({});
  const [scores, setScores] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [quizzes, setQuizzes] = useState([]);

  // Admin state
  const [selectedMaterialForQuizzes, setSelectedMaterialForQuizzes] = useState(null);
  const [selectedQuizForQuestions, setSelectedQuizForQuestions] = useState(null);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showAddQuizForm, setShowAddQuizForm] = useState(false);
  const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState('dashboard');
  const [materialQuizzesForAdmin, setMaterialQuizzesForAdmin] = useState([]);
  const [materialQuizCounts, setMaterialQuizCounts] = useState({});

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    material_url: '',
    category: ''
  });
  const [quizFormData, setQuizFormData] = useState({
    title: '',
    description: ''
  });
  const [questionFormData, setQuestionFormData] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    correct_answer: '',
    points: 10,
    options: { options: ['', '', '', ''] }
  });

  // Supabase functions
  const loadMaterials = async () => {
    try {
      console.log('تحميل المواد...');
      const { data, error } = await supabase
        .from('reading_materials')
        .select('*')
        .eq('is_active', true)
        .order('order_index');
      
      if (error) throw error;
      console.log('تم تحميل المواد:', data?.length, 'مادة');
      setMaterials(data || []);
    } catch (error) {
      console.error('Error loading materials:', error);
      setError('فشل في تحميل المواد');
    }
  };

  const loadQuizzesForMaterial = async (materialId) => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select('*')
        .eq('material_id', materialId)
        .eq('is_active', true)
        .order('order_index');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading quizzes:', error);
      return [];
    }
  };

  const loadQuestionsForQuiz = async (quizId) => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('order_index');
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading questions:', error);
      return [];
    }
  };

  const loadUserScoresFromDB = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('user_scores')
        .select('*')
        .eq('user_id', userId)
        .order('completed_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading user scores:', error);
      return [];
    }
  };

  const saveUserScore = async (scoreData) => {
    try {
      const { data, error } = await supabase
        .from('user_scores')
        .upsert(scoreData)
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving score:', error);
      throw error;
    }
  };

  const loadUserProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('reading_club_profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading user profile:', error);
      return null;
    }
  };

  const authenticateUser = async (email, password) => {
    try {
      console.log('محاولة تسجيل الدخول مع:', { email, password: '***' });
      
      // محاولة تسجيل الدخول مع مهلة زمنية أطول
      const authPromise = supabase.auth.signInWithPassword({
        email,
        password
      });
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('انتهت مهلة الاتصال')), 30000)
      );
      
      const { data, error } = await Promise.race([authPromise, timeoutPromise]);
      
      console.log('نتيجة تسجيل الدخول:', { 
        hasUser: !!data?.user, 
        hasSession: !!data?.session,
        error: error?.message 
      });
      
      if (error) {
        console.error('خطأ في تسجيل الدخول:', error.message);
        throw error;
      }
      
      if (!data?.user) {
        throw new Error('لم يتم العثور على بيانات المستخدم');
      }
      
      return data;
    } catch (error) {
      console.error('خطأ في المصادقة:', error.message || error);
      throw error;
    }
  };

  // Load initial data
  useEffect(() => {
    loadMaterials();
    
    // التحقق من الجلسة المحفوظة محلياً أولاً
    const savedSession = localStorage.getItem('readingClubSession');
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        console.log('جلسة محفوظة موجودة:', sessionData);
        setCurrentUser(sessionData.user);
        setUserProfile(sessionData.profile);
        setCurrentView(sessionData.profile.is_admin ? 'admin-dashboard' : 'home');
        return;
      } catch (error) {
        console.error('خطأ في تحليل الجلسة المحفوظة:', error);
        localStorage.removeItem('readingClubSession');
      }
    }
    
    // التحقق من جلسة Supabase كبديل
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setCurrentUser(session.user);
        loadUserProfile(session.user.id).then(profile => {
          if (profile) {
            setUserProfile(profile);
            setCurrentView(profile.is_admin ? 'admin-dashboard' : 'home');
          }
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setCurrentUser(session.user);
        const profile = await loadUserProfile(session.user.id);
        if (profile) {
          setUserProfile(profile);
          setCurrentView(profile.is_admin ? 'admin-dashboard' : 'home');
          
          // حفظ الجلسة محلياً عند تغيير الحالة
          const sessionData = {
            user: session.user,
            profile: profile,
            timestamp: Date.now()
          };
          localStorage.setItem('readingClubSession', JSON.stringify(sessionData));
        }
      } else {
        // التحقق من وجود جلسة محلية قبل المسح
        const savedSession = localStorage.getItem('readingClubSession');
        if (!savedSession) {
          setCurrentUser(null);
          setUserProfile(null);
          setCurrentView('login');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user scores when user logs in
  useEffect(() => {
    if (currentUser) {
      loadUserScores();
    }
  }, [currentUser]);

  // Load quiz counts when materials change
  useEffect(() => {
    if (materials.length > 0) {
      loadQuizCounts();
    }
  }, [materials]);

  // Reload materials when user logs in or view changes
  useEffect(() => {
    if (currentUser && (currentView === 'materials' || currentView === 'admin-materials')) {
      loadMaterials();
    }
  }, [currentUser, currentView]);

  const loadUserScores = async () => {
    if (currentUser) {
      const userScores = await loadUserScoresFromDB(currentUser.id);
      setScores(userScores);
    }
  };

  const loadQuestions = async (quizId) => {
    const quizQuestions = await loadQuestionsForQuiz(quizId);
    setQuestions(quizQuestions);
    setUserAnswers({});
  };

  const getQuizzesForMaterial = async (materialId) => {
    return await loadQuizzesForMaterial(materialId);
  };

  // Load quizzes for admin when material is selected
  const loadQuizzesForAdmin = async (materialId) => {
    if (materialId) {
      try {
        const quizzes = await loadQuizzesForMaterial(materialId);
        setMaterialQuizzesForAdmin(quizzes);
      } catch (error) {
        console.error('Error loading quizzes for admin:', error);
        setMaterialQuizzesForAdmin([]);
      }
    } else {
      setMaterialQuizzesForAdmin([]);
    }
  };

  // Load quiz counts for all materials
  const loadQuizCounts = async () => {
    const counts = {};
    for (const material of materials) {
      try {
        const quizzes = await loadQuizzesForMaterial(material.id);
        counts[material.id] = quizzes.length;
      } catch (error) {
        console.error(`Error loading quiz count for material ${material.id}:`, error);
        counts[material.id] = 0;
      }
    }
    setMaterialQuizCounts(counts);
  };

  const getTotalQuestionsForMaterial = async (materialId) => {
    const quizzes = await getQuizzesForMaterial(materialId);
    let total = 0;
    for (const quiz of quizzes) {
      const questions = await loadQuestionsForQuiz(quiz.id);
      total += questions.length;
    }
    return total;
  };

  // Login component
  const LoginPage = () => {
    const [authLoading, setAuthLoading] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleLogin = async (e) => {
      e.preventDefault();
      if (!email || !password) {
        setError('الرجاء إدخال البريد الإلكتروني وكلمة المرور');
        return;
      }

      setAuthLoading(true);
      setError(null);

      try {
        console.log('محاولة تسجيل الدخول...');
        const authData = await authenticateUser(email, password);
        console.log('بيانات المصادقة:', authData);
        
        if (authData.user) {
          console.log('المستخدم موجود، تحميل الملف الشخصي...');
          const profile = await loadUserProfile(authData.user.id);
          console.log('الملف الشخصي:', profile);
          if (profile) {
            setCurrentUser(authData.user);
            setUserProfile(profile);
            const newView = profile.is_admin ? 'admin-dashboard' : 'home';
            console.log('تحديث العرض إلى:', newView);
            setCurrentView(newView);
            
            // حفظ الجلسة محلياً
            const sessionData = {
              user: authData.user,
              profile: profile,
              timestamp: Date.now()
            };
            localStorage.setItem('readingClubSession', JSON.stringify(sessionData));
            console.log('تم حفظ الجلسة محلياً');
          } else {
            setError('لم يتم العثور على بيانات الملف الشخصي');
          }
        } else {
          console.log('لا يوجد مستخدم في بيانات المصادقة');
          setError('فشل في تسجيل الدخول');
        }
      } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        setError('فشل تسجيل الدخول: ' + error.message);
      }
      
      setAuthLoading(false);
    };

    const fillUserCredentials = (userEmail) => {
      setEmail(userEmail);
      setPassword('123456');
      setError(null);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4" dir="rtl">
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-xl w-full max-w-md border border-gray-100">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">نادي القراءة</h1>
            <p className="text-gray-600 mt-2 text-sm sm:text-base">منصة التعلم التفاعلي</p>
          </div>

          <div className="space-y-4">
            <div className="text-center mb-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">تسجيل الدخول</h2>
              <p className="text-xs sm:text-sm text-gray-600">ادخل بيانات حسابك أو اضغط على أحد المستخدمين</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="أدخل بريدك الإلكتروني"
                  required
                  dir="ltr"
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="أدخل كلمة المرور"
                  required
                  dir="ltr"
                />
              </div>
              
              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:transform-none flex items-center justify-center gap-2 shadow-lg"
              >
                <User className="w-5 h-5" />
                تسجيل الدخول
              </button>
            </form>
            
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm text-gray-600 text-center mb-3">أزرار تعبئة سريعة:</p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => fillUserCredentials('nama47@nama47.com')}
                  className="w-full bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 py-2 px-4 rounded-lg hover:from-purple-200 hover:to-blue-200 transition-all flex items-center justify-center gap-2 text-sm border border-purple-200"
                >
                  <Settings className="w-4 h-4" />
                  نماء2 (مدير)
                </button>
                
                <button
                  type="button"
                  onClick={() => fillUserCredentials('namaabdulelah@gmail.com')}
                  className="w-full bg-gradient-to-r from-green-100 to-teal-100 text-green-700 py-2 px-4 rounded-lg hover:from-green-200 hover:to-teal-200 transition-all flex items-center justify-center gap-2 text-sm border border-green-200"
                >
                  <BookOpen className="w-4 h-4" />
                  نماء (طالب)
                </button>
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">كلمة المرور للجميع: 123456</p>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center border border-red-200">
                {error}
              </div>
            )}

            {authLoading && (
              <div className="text-center py-4">
                <Clock className="w-6 h-6 text-blue-600 mx-auto animate-spin" />
                <p className="text-sm text-gray-600 mt-2">جاري تسجيل الدخول...</p>
              </div>
            )}
          </div>

          <div className="mt-8 border-t border-gray-200 pt-6">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-xl border border-amber-100 mb-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <User className="w-5 h-5 text-amber-600" />
                معلومات هامة:
              </h3>
              <div className="text-sm text-gray-700 space-y-2">
                <p>• هذه منصة تعليمية حقيقية مع قاعدة بيانات فعلية</p>
                <p>• جميع البيانات والنتائج يتم حفظها بشكل دائم</p>
                <p>• المستخدمون مربوطون بنظام مصادقة Supabase</p>
                <div className="bg-white p-3 rounded-lg mt-3 border border-amber-200">
                  <p className="font-medium text-amber-800 mb-2">المستخدمون المتاحون:</p>
                  <div className="space-y-1 text-xs">
                    <p>• <strong>مدير:</strong> sh.33e33@gmail.com (عبدالإله)</p>
                    <p>• <strong>مدير:</strong> nama47@nama47.com (نماء2) ← زر تعبئة</p>
                    <p>• <strong>طالب:</strong> namaabdulelah@gmail.com (نماء) ← زر تعبئة</p>
                    <p className="text-amber-700 font-medium">• كلمة المرور للجميع: <span className="font-mono">123456</span></p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-xl border border-blue-100">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Star className="w-5 h-5 text-yellow-500" />
                ميزات المنصة:
              </h3>
              <ul className="text-sm text-gray-600 space-y-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  محتوى تعليمي متنوع ومفيد
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  اختبارات تفاعلية ذكية
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  تتبع التقدم والإنجازات
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  منافسة صحية مع الأقران
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCurrentUser(null);
      setUserProfile(null);
      setCurrentView('login');
      setScores([]);
      setUserAnswers({});
      setAdminActiveTab('dashboard');
      setMaterials([]);
      setQuizzes([]);
      
      // مسح الجلسة المحفوظة محلياً
      localStorage.removeItem('readingClubSession');
      console.log('تم مسح الجلسة المحلية');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const saveAnswer = (questionId, answer) => {
    const newAnswers = {
      ...userAnswers,
      [questionId]: answer
    };
    setUserAnswers(newAnswers);
  };

  const submitAnswers = async () => {
    if (!currentUser || !selectedQuiz) return;

    setLoading(true);

    try {
      let correctAnswers = 0;
      let totalPoints = 0;
      let earnedPoints = 0;

      // Save user answers to database
      for (const question of questions) {
        totalPoints += question.points;
        const userAnswer = userAnswers[question.id];
        const isCorrect = userAnswer === question.correct_answer;
        const pointsEarned = isCorrect ? question.points : 0;
        
        if (isCorrect) {
          correctAnswers++;
          earnedPoints += question.points;
        }

        // Save individual answer
        await supabase.from('user_answers').upsert({
          user_id: currentUser.id,
          question_id: question.id,
          material_id: selectedMaterial.id,
          user_answer: userAnswer || '',
          is_correct: isCorrect,
          points_earned: pointsEarned
        });
      }

      const percentage = Math.round((correctAnswers / questions.length) * 100);

      const newScore = {
        user_id: currentUser.id,
        material_id: selectedMaterial.id,
        quiz_id: selectedQuiz.id,
        quiz_title: selectedQuiz.title,
        total_points: earnedPoints,
        max_points: totalPoints,
        percentage: percentage,
        completed_at: new Date().toISOString()
      };

      // Save score to database
      await saveUserScore(newScore);
      
      // Reload user scores
      await loadUserScores();

      alert('تم حفظ إجاباتك بنجاح!');
      setCurrentView('scores');
    } catch (error) {
      console.error('Error submitting answers:', error);
      setError('فشل في حفظ الإجابات');
    }
    
    setLoading(false);
  };

  // Admin functions
  const addMaterial = async (material) => {
    try {
      const newMaterial = {
        ...material,
        is_active: true,
        order_index: materials.length + 1
      };

      const { data, error } = await supabase
        .from('reading_materials')
        .insert([newMaterial])
        .select();

      if (error) throw error;
      
      // إعادة تحميل المواد
      await loadMaterials();
      console.log('تم إضافة المادة بنجاح');
    } catch (error) {
      console.error('خطأ في إضافة المادة:', error);
      setError('فشل في إضافة المادة');
    }
  };

  const updateMaterial = async (id, updates) => {
    try {
      const { error } = await supabase
        .from('reading_materials')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      // إعادة تحميل المواد
      await loadMaterials();
      console.log('تم تحديث المادة بنجاح');
    } catch (error) {
      console.error('خطأ في تحديث المادة:', error);
      setError('فشل في تحديث المادة');
    }
  };

  const deleteMaterial = async (id) => {
    try {
      // حذف المادة من قاعدة البيانات
      const { error } = await supabase
        .from('reading_materials')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // إعادة تحميل المواد من قاعدة البيانات
      await loadMaterials();
      console.log('تم حذف المادة بنجاح');
    } catch (error) {
      console.error('خطأ في حذف المادة:', error);
      setError('فشل في حذف المادة');
    }
  };

  const addQuiz = (materialId, quiz) => {
    const newQuiz = {
      ...quiz,
      id: Date.now(),
      material_id: materialId,
      order_index: (mockQuizzes[materialId] || []).length + 1,
      is_active: true,
      created_at: new Date().toISOString()
    };
    
    if (!mockQuizzes[materialId]) {
      mockQuizzes[materialId] = [];
    }
    mockQuizzes[materialId].push(newQuiz);
    mockQuestions[newQuiz.id] = [];
  };

  const updateQuiz = (materialId, quizId, updates) => {
    if (mockQuizzes[materialId]) {
      mockQuizzes[materialId] = mockQuizzes[materialId].map(q => 
        q.id === quizId ? { ...q, ...updates } : q
      );
    }
  };

  const deleteQuiz = (materialId, quizId) => {
    if (mockQuizzes[materialId]) {
      mockQuizzes[materialId] = mockQuizzes[materialId].filter(q => q.id !== quizId);
      delete mockQuestions[quizId];
    }
  };

  const addQuestion = (quizId, question) => {
    const newQuestion = {
      ...question,
      id: Date.now(),
      quiz_id: quizId,
      order_index: (mockQuestions[quizId] || []).length + 1
    };
    
    if (!mockQuestions[quizId]) {
      mockQuestions[quizId] = [];
    }
    mockQuestions[quizId].push(newQuestion);
  };

  const updateQuestion = (quizId, questionId, updates) => {
    if (mockQuestions[quizId]) {
      mockQuestions[quizId] = mockQuestions[quizId].map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      );
    }
  };

  const deleteQuestion = (quizId, questionId) => {
    if (mockQuestions[quizId]) {
      mockQuestions[quizId] = mockQuestions[quizId].filter(q => q.id !== questionId);
    }
  };

  // Sidebar component for students
  const StudentSidebar = () => (
    <>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={`
        fixed lg:static inset-y-0 right-0 z-50 
        w-64 bg-gray-50 h-screen p-4 border-l border-gray-200 flex flex-col
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `} dir="rtl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
                <BookOpen className="w-6 h-6" />
                نادي القراءة
              </h1>
              <span className="text-xs text-gray-500">منصة التعلم</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <button
            onClick={() => {
              setCurrentView('home');
              setSidebarOpen(false);
            }}
            className={`w-full text-right p-3 rounded-lg flex items-center gap-3 transition-colors ${
              currentView === 'home' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            <Home className="w-5 h-5" />
            الرئيسية
          </button>
          
          <button
            onClick={() => {
              setCurrentView('materials');
              setSidebarOpen(false);
            }}
            className={`w-full text-right p-3 rounded-lg flex items-center gap-3 transition-colors ${
              currentView === 'materials' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            المواد الإثرائية
          </button>
          
          <button
            onClick={() => {
              setCurrentView('scores');
              setSidebarOpen(false);
            }}
            className={`w-full text-right p-3 rounded-lg flex items-center gap-3 transition-colors ${
              currentView === 'scores' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            درجاتي
          </button>
          
          <button
            onClick={() => {
              setCurrentView('leaderboard');
              setSidebarOpen(false);
            }}
            className={`w-full text-right p-3 rounded-lg flex items-center gap-3 transition-colors ${
              currentView === 'leaderboard' ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
            }`}
          >
            <Trophy className="w-5 h-5" />
            لوحة المتصدرين
          </button>
        </nav>
        
        <div className="border-t border-gray-200 pt-4">
          <div className="bg-white p-3 rounded-lg border border-gray-200 mb-3">
            <p className="text-sm text-gray-600">مرحباً</p>
            <p className="font-semibold truncate">{userProfile?.full_name || 'المستخدم'}</p>
            <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full p-3 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-3 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </>
  );

  // Admin Sidebar
  const AdminSidebar = () => (
    <>
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      <div className={`
        fixed lg:static inset-y-0 right-0 z-50 
        w-64 bg-gradient-to-b from-gray-800 to-gray-900 h-screen p-4 flex flex-col text-white
        transform transition-transform duration-300 ease-in-out lg:transform-none
        ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
      `} dir="rtl">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6" />
                لوحة التحكم
              </h1>
              <span className="text-xs text-gray-300">إدارة المنصة</span>
            </div>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <nav className="space-y-2 flex-1">
          <button
            onClick={() => {
              setCurrentView('admin-dashboard');
              setAdminActiveTab('dashboard');
              setSidebarOpen(false);
            }}
            className={`w-full text-right p-3 rounded-lg flex items-center gap-3 transition-colors ${
              currentView === 'admin-dashboard' && adminActiveTab === 'dashboard' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            لوحة التحكم
          </button>
          
          <button
            onClick={() => {
              setCurrentView('admin-dashboard');
              setAdminActiveTab('reports');
              setSidebarOpen(false);
            }}
            className={`w-full text-right p-3 rounded-lg flex items-center gap-3 transition-colors ${
              currentView === 'admin-dashboard' && adminActiveTab === 'reports' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <FileText className="w-5 h-5" />
            تقارير الطلاب
          </button>
          
          <button
            onClick={() => {
              setCurrentView('admin-materials');
              setSidebarOpen(false);
            }}
            className={`w-full text-right p-3 rounded-lg flex items-center gap-3 transition-colors ${
              currentView === 'admin-materials' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            إدارة المواد
          </button>
          
          <button
            onClick={() => {
              setCurrentView('admin-quizzes');
              setSidebarOpen(false);
            }}
            className={`w-full text-right p-3 rounded-lg flex items-center gap-3 transition-colors ${
              currentView === 'admin-quizzes' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <CheckCircle2 className="w-5 h-5" />
            إدارة الاختبارات
          </button>
          
          <button
            onClick={() => {
              setCurrentView('admin-questions');
              setSidebarOpen(false);
            }}
            className={`w-full text-right p-3 rounded-lg flex items-center gap-3 transition-colors ${
              currentView === 'admin-questions' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <Edit className="w-5 h-5" />
            إدارة الأسئلة
          </button>
        </nav>
        
        <div className="border-t border-gray-600 pt-4">
          <div className="bg-gray-700 p-3 rounded-lg mb-3">
            <p className="text-sm text-gray-300">مرحباً</p>
            <p className="font-semibold truncate">{userProfile?.full_name || 'المدير'}</p>
            <p className="text-xs text-gray-400 truncate">{currentUser?.email}</p>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full p-3 text-red-400 hover:bg-gray-700 rounded-lg flex items-center gap-3 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            تسجيل الخروج
          </button>
        </div>
      </div>
    </>
  );

  // Mobile Header component
  const MobileHeader = ({ isAdmin = false }) => (
    <div className={`lg:hidden ${isAdmin ? 'bg-gray-800 text-white' : 'bg-white'} border-b ${isAdmin ? 'border-gray-700' : 'border-gray-200'} p-4 flex items-center justify-between`} dir="rtl">
      <h1 className="text-lg font-bold flex items-center gap-2">
        {isAdmin ? <Settings className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
        {isAdmin ? 'لوحة التحكم' : 'نادي القراءة'}
      </h1>
      <button 
        onClick={() => setSidebarOpen(true)}
        className={`p-2 rounded-lg hover:${isAdmin ? 'bg-gray-700' : 'bg-gray-100'} transition-colors`}
      >
        <Menu className="w-6 h-6" />
      </button>
    </div>
  );

  // Student Home page
  const HomePage = () => {
    const [totalQuizzes, setTotalQuizzes] = useState(0);
    
    useEffect(() => {
      const loadTotalQuizzes = async () => {
        const { data } = await supabase.from('quizzes').select('id', { count: 'exact' });
        setTotalQuizzes(data?.length || 0);
      };
      loadTotalQuizzes();
      // Also ensure materials are loaded
      loadMaterials();
    }, []);
    
    const completedQuizzes = scores.length;
    const totalPoints = scores.reduce((acc, score) => acc + score.total_points, 0);
    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((acc, score) => acc + score.percentage, 0) / scores.length)
      : 0;

    return (
      <div className="p-6" dir="rtl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">مرحباً {userProfile?.full_name}</h1>
          <p className="text-gray-600">استمر في رحلة التعلم واكتشف محتوى جديد</p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{materials.length}</span>
            </div>
            <p className="text-blue-100 text-sm">مواد إثرائية متاحة</p>
          </div>
          
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle2 className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{completedQuizzes}</span>
            </div>
            <p className="text-green-100 text-sm">اختبارات مكتملة</p>
          </div>
          
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-xl text-white">
            <div className="flex items-center justify-between mb-4">
              <Trophy className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{totalPoints}</span>
            </div>
            <p className="text-yellow-100 text-sm">إجمالي النقاط</p>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{averageScore}%</span>
            </div>
            <p className="text-purple-100 text-sm">متوسط الدرجات</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
              <BookmarkCheck className="w-6 h-6 text-blue-600" />
              كيف يعمل نادي القراءة؟
            </h3>
            <ol className="space-y-3 list-decimal list-inside text-gray-700">
              <li className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</span>
                <span>اطلع على المواد الإثرائية المتاحة</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</span>
                <span>اقرأ المحتوى بتمعن وفهم</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</span>
                <span>اختبر معلوماتك من خلال الاختبارات</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-blue-100 text-blue-600 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</span>
                <span>احصل على نقاط وتابع تقدمك</span>
              </li>
            </ol>
          </div>
          
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
              <Target className="w-6 h-6 text-green-600" />
              نصائح للنجاح
            </h3>
            <ul className="space-y-3 text-gray-700">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>اقرأ المواد بعناية قبل البدء بالاختبار</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>دون الملاحظات المهمة أثناء القراءة</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>خذ وقتك في الإجابة على الأسئلة</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <span>تعلم من أخطائك وحاول مرة أخرى</span>
              </li>
            </ul>
          </div>
        </div>
        
        {totalQuizzes > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-3">
              <Activity className="w-6 h-6 text-purple-600" />
              إحصائيات سريعة
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{totalQuizzes}</div>
                <div className="text-sm text-gray-600">إجمالي الاختبارات</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{completedQuizzes}</div>
                <div className="text-sm text-gray-600">مكتملة</div>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{totalQuizzes - completedQuizzes}</div>
                <div className="text-sm text-gray-600">متبقية</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {totalQuizzes > 0 ? Math.round((completedQuizzes / totalQuizzes) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">نسبة الإنجاز</div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Admin Dashboard
  const AdminDashboard = () => {
    const [allUsers, setAllUsers] = useState([]);
    const [allQuizzes, setAllQuizzes] = useState([]);
    
    useEffect(() => {
      const loadAdminData = async () => {
        // Load all users
        const { data: users } = await supabase.from('reading_club_profiles').select('*');
        setAllUsers(users || []);
        
        // Load all quizzes
        const { data: quizzes } = await supabase.from('quizzes').select('*');
        setAllQuizzes(quizzes || []);
        
        // Load materials
        loadMaterials();
      };
      
      if (userProfile?.is_admin) {
        loadAdminData();
      }
    }, [userProfile]);
    
    const systemStats = {
      totalUsers: allUsers.length,
      activeUsers: allUsers.filter(u => {
        const lastActivity = new Date(u.last_activity);
        const now = new Date();
        const daysDiff = (now - lastActivity) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7; // Active if logged in within last 7 days
      }).length,
      totalMaterials: materials.length,
      totalQuizzes: allQuizzes.length,
      averageScore: 85, // Default placeholder until we calculate from user_scores
      completedQuizzes: scores.length
    };

    if (adminActiveTab === 'reports') {
      return (
        <div className="p-6" dir="rtl">
          <h2 className="text-2xl font-bold mb-6">تقارير الطلاب</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <PieChart className="w-6 h-6 text-blue-600" />
                <h3 className="font-semibold">توزيع الدرجات</h3>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm">ممتاز (90-100%)</span>
                  <span className="font-medium text-green-600">2 طلاب</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">جيد جداً (80-89%)</span>
                  <span className="font-medium text-blue-600">2 طلاب</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">جيد (70-79%)</span>
                  <span className="font-medium text-yellow-600">1 طالب</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">مقبول (60-69%)</span>
                  <span className="font-medium text-orange-600">0 طلاب</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-6 h-6 text-purple-600" />
                <h3 className="font-semibold">النشاط الأسبوعي</h3>
              </div>
              <div className="space-y-3">
                {['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'].map((day, index) => (
                  <div key={day} className="flex justify-between items-center">
                    <span className="text-sm">{day}</span>
                    <div className="w-16 bg-gray-200 rounded h-2">
                      <div 
                        className="bg-purple-600 rounded h-2" 
                        style={{ width: `${Math.random() * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-gray-200">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="w-6 h-6 text-green-600" />
                <h3 className="font-semibold">معدل الإنجاز</h3>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 mb-2">80%</div>
                <p className="text-sm text-gray-600">من الطلاب أكملوا مادة واحدة على الأقل</p>
                <div className="mt-4 w-full bg-gray-200 rounded-full h-3">
                  <div className="w-4/5 bg-green-600 rounded-full h-3"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xl font-semibold mb-6">قائمة الطلاب التفصيلية</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-right p-4 font-semibold text-gray-700">الطالب</th>
                    <th className="text-right p-4 font-semibold text-gray-700">المواد المكتملة</th>
                    <th className="text-right p-4 font-semibold text-gray-700">متوسط الدرجات</th>
                    <th className="text-right p-4 font-semibold text-gray-700">آخر نشاط</th>
                    <th className="text-right p-4 font-semibold text-gray-700">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {/* لا يوجد طلاب حتى الآن - سيتم تحميلهم من قاعدة البيانات */ []?.map((student, index) => (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-medium">{student.full_name}</td>
                      <td className="p-4">{student.materials_completed} / 3</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{student.average_percentage}%</span>
                          <div className="w-12 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${student.average_percentage}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-600">{student.last_active}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          student.status === 'نشط' ? 'bg-green-100 text-green-700' :
                          student.status === 'متوسط' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {student.status}
                        </span>
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-gray-500">
                        لا يوجد طلاب مسجلين
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6" dir="rtl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">لوحة تحكم المدير</h1>
          <p className="text-gray-600">نظرة شاملة على أداء منصة نادي القراءة</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
            <div className="flex items-center justify-between mb-4">
              <Users className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{systemStats.totalUsers}</span>
            </div>
            <div>
              <p className="text-blue-100 text-sm">إجمالي المستخدمين</p>
              <p className="text-xs text-blue-200 mt-1">{systemStats.activeUsers} نشط حالياً</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
            <div className="flex items-center justify-between mb-4">
              <BookOpen className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{systemStats.totalMaterials}</span>
            </div>
            <div>
              <p className="text-green-100 text-sm">مواد إثرائية</p>
              <p className="text-xs text-green-200 mt-1">{systemStats.totalQuizzes} اختبار متاح</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl text-white">
            <div className="flex items-center justify-between mb-4">
              <BarChart3 className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{systemStats.averageScore}%</span>
            </div>
            <div>
              <p className="text-purple-100 text-sm">متوسط الأداء العام</p>
              <p className="text-xs text-purple-200 mt-1">+5% من الشهر الماضي</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-xl text-white">
            <div className="flex items-center justify-between mb-4">
              <Award className="w-8 h-8 opacity-80" />
              <span className="text-3xl font-bold">{systemStats.completedQuizzes}</span>
            </div>
            <div>
              <p className="text-yellow-100 text-sm">اختبارات مكتملة</p>
              <p className="text-xs text-yellow-200 mt-1">هذا الشهر</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-blue-600" />
              <h2 className="text-xl font-semibold">النشاط الأخير</h2>
            </div>
            <div className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                لا توجد أنشطة حديثة
              </div>
              {/* البيانات ستأتي من قاعدة البيانات */ false && [].map((activity, index) => (
                <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                    activity.type === 'quiz_completed' ? 'bg-green-600' :
                    activity.type === 'material_started' ? 'bg-blue-600' :
                    'bg-gray-600'
                  }`}></div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{activity.user}</p>
                    <p className="text-sm text-gray-600">{activity.action}</p>
                    <div className="flex items-center gap-4 mt-2">
                      {activity.score && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                          {activity.score}%
                        </span>
                      )}
                      <span className="text-xs text-gray-500">{activity.time}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-green-600" />
              <h2 className="text-xl font-semibold">أفضل الأداءات</h2>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                  <div>
                    <p className="font-semibold text-gray-800">لا يوجد بيانات</p>
                    <p className="text-sm text-gray-600">لا توجد مواد مكتملة</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-yellow-600">0%</span>
                  <p className="text-xs text-gray-500">متوسط الدرجات</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="text-center py-8 text-gray-500">
                  لا توجد بيانات طلاب متاحة
                </div>
                {/* قائمة فارغة - سيتم تحميلها من قاعدة البيانات */ false && []?.map((student, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {index + 2}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{student.full_name}</p>
                        <p className="text-xs text-gray-600">{student.materials_completed} مواد مكتملة</p>
                      </div>
                    </div>
                    <span className="font-semibold text-gray-700">{student.average_percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold">أداء المواد الإثرائية</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right p-4 font-semibold text-gray-700">المادة</th>
                  <th className="text-right p-4 font-semibold text-gray-700">المكتملون</th>
                  <th className="text-right p-4 font-semibold text-gray-700">متوسط الدرجات</th>
                  <th className="text-right p-4 font-semibold text-gray-700">مستوى الصعوبة</th>
                  <th className="text-right p-4 font-semibold text-gray-700">الاتجاه</th>
                  <th className="text-right p-4 font-semibold text-gray-700">الأداء</th>
                </tr>
              </thead>
              <tbody>
                {materials.length > 0 ? materials.map((material, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-800">{material.title}</div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>-</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: '0%' }}
                          />
                        </div>
                        <span className="font-medium">-</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                        غير محدد
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium text-sm text-gray-500">
                        -
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
                        <Clock className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">
                          لا توجد بيانات
                        </span>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-gray-500">
                      لا توجد مواد متاحة
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // Materials page
  const MaterialsPage = () => {
    const [materialsData, setMaterialsData] = useState([]);
    const [loadingMaterials, setLoadingMaterials] = useState(true);

    // Force reload materials when component mounts
    useEffect(() => {
      loadMaterials();
    }, []);

    useEffect(() => {
      const loadMaterialsData = async () => {
        setLoadingMaterials(true);
        const data = [];
        
        for (const material of materials) {
          const materialScores = scores.filter(s => s.material_id === material.id);
          const completedQuizzes = materialScores.length;
          const averageScore = materialScores.length > 0 
            ? Math.round(materialScores.reduce((acc, score) => acc + score.percentage, 0) / materialScores.length)
            : 0;
          
          // تحميل الاختبارات لهذه المادة
          const materialQuizzes = await loadQuizzesForMaterial(material.id);
          
          // حساب إجمالي الأسئلة
          let totalQuestions = 0;
          for (const quiz of materialQuizzes) {
            const questions = await loadQuestionsForQuiz(quiz.id);
            totalQuestions += questions.length;
          }
          
          data.push({
            ...material,
            completedQuizzes,
            averageScore,
            totalQuestions,
            materialQuizzes
          });
        }
        
        setMaterialsData(data);
        setLoadingMaterials(false);
      };

      if (materials.length > 0) {
        loadMaterialsData();
      } else {
        setLoadingMaterials(false);
      }
    }, [materials, scores]);

    if (loadingMaterials) {
      return (
        <div className="p-6 text-center" dir="rtl">
          <div className="text-lg text-gray-600">جاري تحميل المواد...</div>
        </div>
      );
    }

    return (
      <div className="p-6" dir="rtl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">المواد الإثرائية</h1>
          <p className="text-gray-600">اكتشف المحتوى التعليمي المتنوع واختبر معلوماتك</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {materialsData.length > 0 ? materialsData.map(material => (
            <div key={material.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                    {material.category || 'عام'}
                  </span>
                  {material.completedQuizzes === material.materialQuizzes.length && material.materialQuizzes.length > 0 && (
                    <div className="flex items-center gap-1 text-green-600">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="text-sm">مكتمل</span>
                    </div>
                  )}
                </div>
                
                <h3 className="text-xl font-semibold mb-3">{material.title}</h3>
                <p className="text-gray-600 mb-4 line-clamp-3">{material.description}</p>
                
                <div className="mb-6">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>الاختبارات</span>
                    <span className="font-medium">{material.materialQuizzes.length} اختبار</span>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>إجمالي الأسئلة</span>
                    <span className="font-medium">{material.totalQuestions} سؤال</span>
                  </div>
                  {material.averageScore > 0 && (
                    <div className="flex justify-between text-sm text-gray-600 mb-3">
                      <span>متوسط الدرجات</span>
                      <span className="font-medium">{material.averageScore}%</span>
                    </div>
                  )}
                  
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                    <div 
                      className={`h-2.5 rounded-full transition-all ${
                        material.completedQuizzes === material.materialQuizzes.length && material.materialQuizzes.length > 0 ? 'bg-green-600' : 'bg-blue-600'
                      }`}
                      style={{ width: `${material.materialQuizzes.length > 0 ? (material.completedQuizzes / material.materialQuizzes.length) * 100 : 0}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    {material.completedQuizzes} / {material.materialQuizzes.length} اختبار مكتمل
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <a 
                    href={material.material_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gray-100 text-gray-700 py-3 px-4 rounded-lg text-center hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    اقرأ المادة
                  </a>
                  <button
                    onClick={() => {
                      setSelectedMaterial(material);
                      setCurrentView('quizzes');
                    }}
                    className="bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    عرض الاختبارات ({material.materialQuizzes.length})
                  </button>
                </div>
              </div>
            </div>
          )) : (
            <div className="col-span-full text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📚</div>
              <h3 className="text-xl font-semibold text-gray-600 mb-2">لا توجد مواد متاحة حالياً</h3>
              <p className="text-gray-500">ستظهر المواد التعليمية هنا عند إضافتها من قِبل الإدارة</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Quizzes page
  const QuizzesPage = () => {
    const [materialQuizzes, setMaterialQuizzes] = useState([]);
    const [loadingQuizzes, setLoadingQuizzes] = useState(true);

    useEffect(() => {
      const loadQuizzes = async () => {
        if (selectedMaterial) {
          setLoadingQuizzes(true);
          try {
            const quizzes = await loadQuizzesForMaterial(selectedMaterial.id);
            setMaterialQuizzes(quizzes);
          } catch (error) {
            console.error('خطأ في تحميل الاختبارات:', error);
            setMaterialQuizzes([]);
          }
          setLoadingQuizzes(false);
        }
      };

      loadQuizzes();
    }, [selectedMaterial]);

    if (!selectedMaterial) {
      setCurrentView('materials');
      return null;
    }

    if (loadingQuizzes) {
      return (
        <div className="p-6 text-center" dir="rtl">
          <div className="text-lg text-gray-600">جاري تحميل الاختبارات...</div>
        </div>
      );
    }

    return (
      <div className="p-6" dir="rtl">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setCurrentView('materials')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h2 className="text-3xl font-bold">{selectedMaterial.title}</h2>
            <p className="text-gray-600">{materialQuizzes.length} اختبار متاح</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {materialQuizzes.length > 0 ? materialQuizzes.map((quiz, index) => {
            const quizQuestions = mockQuestions[quiz.id] || [];
            const totalPoints = quizQuestions.reduce((sum, q) => sum + q.points, 0);
            const quizScore = scores.find(s => s.quiz_id === quiz.id);
            
            return (
              <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-xl transition-all transform hover:-translate-y-1">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">
                      اختبار {index + 1}
                    </span>
                    {quizScore && quizScore.percentage === 100 && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm">مكتمل</span>
                      </div>
                    )}
                  </div>
                  
                  <h3 className="text-xl font-semibold mb-3">{quiz.title}</h3>
                  <p className="text-gray-600 mb-4">{quiz.description}</p>
                  
                  <div className="mb-6">
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="block font-medium">عدد الأسئلة</span>
                        <span>{quizQuestions.length} سؤال</span>
                      </div>
                      <div>
                        <span className="block font-medium">إجمالي النقاط</span>
                        <span>{totalPoints} نقطة</span>
                      </div>
                    </div>
                    
                    {quizScore && (
                      <div className="mb-4">
                        <div className="flex justify-between text-sm text-gray-600 mb-1">
                          <span>آخر درجة</span>
                          <span className="font-medium">{quizScore.percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full transition-all ${
                              quizScore.percentage === 100 ? 'bg-green-600' :
                              quizScore.percentage >= 80 ? 'bg-blue-600' :
                              quizScore.percentage >= 60 ? 'bg-yellow-600' :
                              'bg-red-600'
                            }`}
                            style={{ width: `${quizScore.percentage}%` }}
                          />
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {quizScore.total_points} / {quizScore.max_points} نقطة
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedQuiz(quiz);
                      loadQuestions(quiz.id);
                      setCurrentView('quiz');
                    }}
                    disabled={quizQuestions.length === 0}
                    className={`w-full py-3 px-4 rounded-lg transition-colors ${
                      quizQuestions.length === 0
                        ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        : quizScore
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                  >
                    {quizQuestions.length === 0 
                      ? 'لا توجد أسئلة متاحة'
                      : quizScore 
                      ? 'إعادة الاختبار' 
                      : 'ابدأ الاختبار'}
                  </button>
                </div>
              </div>
            );
          }) : (
            <div className="col-span-full text-center py-12">
              <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold text-gray-500 mb-2">لا توجد اختبارات متاحة</h3>
              <p className="text-gray-400">لم يتم إضافة أي اختبارات لهذه المادة بعد</p>
            </div>
          )}
        </div>
        
        {false && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">لا توجد اختبارات متاحة</h3>
            <p className="text-gray-400">لم يتم إضافة أي اختبارات لهذه المادة بعد</p>
          </div>
        )}
      </div>
    );
  };

  // Quiz taking page
  const QuizPage = () => {
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [showResults, setShowResults] = useState(false);
    const currentQuestion = questions[currentQuestionIndex];

    if (loading) {
      return (
        <div className="p-6 flex items-center justify-center" dir="rtl">
          <div className="text-center">
            <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-600">جاري تحميل الأسئلة...</p>
          </div>
        </div>
      );
    }

    if (!currentQuestion && !showResults) {
      return (
        <div className="p-6" dir="rtl">
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl border border-gray-200">
            <h3 className="text-2xl font-bold mb-6 text-center">انتهى الاختبار!</h3>
            <p className="text-center text-gray-600 mb-6">لقد أجبت على جميع الأسئلة</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => setShowResults(true)}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors"
              >
                عرض النتائج
              </button>
              <button
                onClick={submitAnswers}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
              >
                حفظ الإجابات
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (showResults) {
      const correctAnswers = questions.filter(q => userAnswers[q.id] === q.correct_answer).length;
      const totalQuestions = questions.length;
      const percentage = Math.round((correctAnswers / totalQuestions) * 100);
      
      return (
        <div className="p-6" dir="rtl">
          <div className="max-w-4xl mx-auto">
            <h3 className="text-2xl font-bold mb-6">نتائج الاختبار</h3>
            
            <div className="bg-white p-6 rounded-xl border border-gray-200 mb-6">
              <div className="text-center">
                <div className={`text-5xl font-bold mb-2 ${
                  percentage >= 90 ? 'text-green-600' :
                  percentage >= 80 ? 'text-blue-600' :
                  percentage >= 70 ? 'text-yellow-600' :
                  'text-red-600'
                }`}>{percentage}%</div>
                <p className="text-gray-600">
                  أجبت بشكل صحيح على {correctAnswers} من {totalQuestions} أسئلة
                </p>
                <div className={`inline-block px-4 py-2 rounded-full text-sm font-medium mt-3 ${
                  percentage >= 90 ? 'bg-green-100 text-green-700' :
                  percentage >= 80 ? 'bg-blue-100 text-blue-700' :
                  percentage >= 70 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {percentage >= 90 ? 'ممتاز!' :
                   percentage >= 80 ? 'جيد جداً' :
                   percentage >= 70 ? 'جيد' :
                   'يحتاج تحسين'}
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              {questions.map((question, index) => {
                const userAnswer = userAnswers[question.id];
                const isCorrect = userAnswer === question.correct_answer;
                
                return (
                  <div key={question.id} className="bg-white p-4 rounded-xl border border-gray-200">
                    <div className="flex items-start gap-3">
                      {isCorrect ? (
                        <CheckCircle2 className="w-6 h-6 text-green-600 mt-1 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 mt-1 flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium mb-2">
                          {index + 1}. {question.question_text}
                        </p>
                        <p className="text-sm text-gray-600">
                          إجابتك: {userAnswer || 'لم تجب'}
                        </p>
                        {!isCorrect && (
                          <p className="text-sm text-green-600 mt-1">
                            الإجابة الصحيحة: {question.correct_answer}
                          </p>
                        )}
                      </div>
                      <span className="text-sm text-gray-500 flex-shrink-0">{question.points} نقطة</span>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="mt-6 flex flex-col sm:flex-row gap-4">
              <button
                onClick={() => {
                  setShowResults(false);
                  setCurrentQuestionIndex(0);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
              >
                مراجعة الإجابات
              </button>
              <button
                onClick={submitAnswers}
                className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors"
              >
                حفظ النتائج
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="p-6" dir="rtl">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <h3 className="text-2xl font-bold mb-2">{selectedMaterial?.title}</h3>
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>السؤال {currentQuestionIndex + 1} من {questions.length}</span>
              <span className="font-medium">{currentQuestion.points} نقطة</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="bg-white p-8 rounded-xl border border-gray-200">
            <h4 className="text-xl font-semibold mb-6">{currentQuestion.question_text}</h4>
            
            {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
              <div className="space-y-3">
                {currentQuestion.options.options.map((option, index) => (
                  <label key={index} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name={`question-${currentQuestion.id}`}
                      value={option}
                      checked={userAnswers[currentQuestion.id] === option}
                      onChange={(e) => saveAnswer(currentQuestion.id, e.target.value)}
                      className="ml-3 text-blue-600"
                    />
                    <span className="text-gray-700">{option}</span>
                  </label>
                ))}
              </div>
            )}
            
            {currentQuestion.question_type === 'true_false' && (
              <div className="space-y-3">
                <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value="true"
                    checked={userAnswers[currentQuestion.id] === 'true'}
                    onChange={(e) => saveAnswer(currentQuestion.id, e.target.value)}
                    className="ml-3 text-blue-600"
                  />
                  <span className="text-gray-700">صح</span>
                </label>
                <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                  <input
                    type="radio"
                    name={`question-${currentQuestion.id}`}
                    value="false"
                    checked={userAnswers[currentQuestion.id] === 'false'}
                    onChange={(e) => saveAnswer(currentQuestion.id, e.target.value)}
                    className="ml-3 text-blue-600"
                  />
                  <span className="text-gray-700">خطأ</span>
                </label>
              </div>
            )}
            
            {currentQuestion.question_type === 'short_answer' && (
              <textarea
                value={userAnswers[currentQuestion.id] || ''}
                onChange={(e) => saveAnswer(currentQuestion.id, e.target.value)}
                className="w-full p-4 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
                placeholder="اكتب إجابتك هنا..."
              />
            )}
          </div>
          
          <div className="flex justify-between mt-6 gap-4">
            <button
              onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
              disabled={currentQuestionIndex === 0}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
              السابق
            </button>
            
            {currentQuestionIndex === questions.length - 1 ? (
              <button
                onClick={() => setShowResults(true)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                إنهاء الاختبار
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                التالي
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Scores page
  const ScoresPage = () => {
    const totalScore = scores.reduce((acc, score) => acc + score.total_points, 0);
    const completedCount = scores.filter(s => s.completed_at).length;
    const averagePercentage = scores.length > 0
      ? Math.round(scores.reduce((acc, score) => acc + score.percentage, 0) / scores.length)
      : 0;

    return (
      <div className="p-6" dir="rtl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">درجاتي</h1>
          <p className="text-gray-600">تابع تقدمك وإنجازاتك في جميع المواد</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl text-white">
            <div className="text-3xl font-bold mb-2">{totalScore}</div>
            <p className="text-blue-100">إجمالي النقاط</p>
          </div>
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl text-white">
            <div className="text-3xl font-bold mb-2">{completedCount}</div>
            <p className="text-green-100">اختبارات مكتملة</p>
          </div>
          <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 rounded-xl text-white">
            <div className="text-3xl font-bold mb-2">{averagePercentage}%</div>
            <p className="text-yellow-100">متوسط الدرجات</p>
          </div>
        </div>
        
        <div className="space-y-6">
          {materials.map(material => {
            const materialQuizzes = getQuizzesForMaterial(material.id);
            const materialScores = scores.filter(s => s.material_id === material.id);
            const completedQuizzes = materialScores.length;
            const materialAverage = materialScores.length > 0 
              ? Math.round(materialScores.reduce((acc, score) => acc + score.percentage, 0) / materialScores.length)
              : 0;
            const totalMaterialPoints = materialScores.reduce((acc, score) => acc + score.total_points, 0);
            
            return (
              <div key={material.id} className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div className="flex-1 mb-3 sm:mb-0">
                    <h3 className="text-xl font-semibold mb-1">{material.title}</h3>
                    <p className="text-gray-600">{material.category}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <span>{completedQuizzes} / {materialQuizzes.length} اختبار مكتمل</span>
                      {materialScores.length > 0 && (
                        <span>متوسط الدرجات: {materialAverage}%</span>
                      )}
                      {totalMaterialPoints > 0 && (
                        <span>إجمالي النقاط: {totalMaterialPoints}</span>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedMaterial(material);
                      setCurrentView('quizzes');
                    }}
                    className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    عرض الاختبارات
                  </button>
                </div>
                
                {materialQuizzes.length > 0 && (
                  <div className="space-y-3">
                    {materialQuizzes.map((quiz, index) => {
                      const quizScore = materialScores.find(s => s.quiz_id === quiz.id);
                      const quizQuestions = mockQuestions[quiz.id] || [];
                      const totalQuizPoints = quizQuestions.reduce((sum, q) => sum + q.points, 0);
                      
                      return (
                        <div key={quiz.id} className="bg-gray-50 p-4 rounded-lg">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex-1 mb-2 sm:mb-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                                  اختبار {index + 1}
                                </span>
                                <h4 className="font-medium">{quiz.title}</h4>
                              </div>
                              <p className="text-sm text-gray-600">{quiz.description}</p>
                            </div>
                            
                            {quizScore ? (
                              <div className="text-right">
                                <div className={`text-2xl font-bold ${
                                  quizScore.percentage === 100 ? 'text-green-600' :
                                  quizScore.percentage >= 80 ? 'text-blue-600' :
                                  quizScore.percentage >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {quizScore.percentage}%
                                </div>
                                <div className="text-sm text-gray-600">
                                  {quizScore.total_points} / {quizScore.max_points} نقطة
                                </div>
                                {quizScore.completed_at && (
                                  <div className="text-xs text-gray-500 mt-1">
                                    {new Date(quizScore.completed_at).toLocaleDateString('ar-SA')}
                                  </div>
                                )}
                                
                                <div className="mt-2">
                                  <div className="w-24 bg-gray-200 rounded-full h-2">
                                    <div 
                                      className={`h-2 rounded-full transition-all ${
                                        quizScore.percentage === 100 ? 'bg-green-600' :
                                        quizScore.percentage >= 80 ? 'bg-blue-600' :
                                        quizScore.percentage >= 60 ? 'bg-yellow-600' :
                                        'bg-red-600'
                                      }`}
                                      style={{ width: `${quizScore.percentage}%` }}
                                    />
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="text-right">
                                <div className="text-xl text-gray-400 mb-1">لم يبدأ</div>
                                <div className="text-sm text-gray-500 mb-2">
                                  {quizQuestions.length} سؤال • {totalQuizPoints} نقطة
                                </div>
                                <button
                                  onClick={() => {
                                    setSelectedMaterial(material);
                                    setSelectedQuiz(quiz);
                                    loadQuestions(quiz.id);
                                    setCurrentView('quiz');
                                  }}
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  ابدأ الآن
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {materialQuizzes.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    <p className="text-sm">لا توجد اختبارات متاحة لهذه المادة</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Leaderboard page
  const LeaderboardPage = () => {
    const currentUserRank = leaderboard.findIndex(user => user.user_id === currentUser?.id) + 1;

    return (
      <div className="p-6" dir="rtl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">لوحة المتصدرين</h1>
          <p className="text-gray-600">تنافس مع زملائك واكتشف ترتيبك</p>
        </div>
        
        {currentUserRank > 0 && (
          <div className="bg-blue-50 p-4 rounded-xl mb-6 border border-blue-200">
            <p className="text-blue-800">
              ترتيبك الحالي: <span className="font-bold text-xl">{currentUserRank}</span> من {leaderboard.length}
            </p>
          </div>
        )}
        
        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right p-4 font-semibold text-gray-700">الترتيب</th>
                <th className="text-right p-4 font-semibold text-gray-700">الاسم</th>
                <th className="text-right p-4 font-semibold text-gray-700">النقاط</th>
                <th className="text-right p-4 font-semibold text-gray-700">المواد المكتملة</th>
                <th className="text-right p-4 font-semibold text-gray-700">متوسط الدرجات</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((user, index) => (
                <tr 
                  key={user.user_id} 
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    user.user_id === currentUser?.id ? 'bg-blue-50' : ''
                  }`}
                >
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {index === 0 && <Trophy className="w-6 h-6 text-yellow-500" />}
                      {index === 1 && <Trophy className="w-6 h-6 text-gray-400" />}
                      {index === 2 && <Trophy className="w-6 h-6 text-orange-600" />}
                      <span className="font-bold text-lg">{index + 1}</span>
                    </div>
                  </td>
                  <td className="p-4 font-medium">
                    {user.full_name}
                    {user.user_id === currentUser?.id && (
                      <span className="mr-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">أنت</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="text-blue-600 font-semibold text-lg">{user.total_score}</span>
                  </td>
                  <td className="p-4">{user.materials_completed}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${user.average_percentage}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{user.average_percentage}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {leaderboard.map((user, index) => (
            <div 
              key={user.user_id}
              className={`bg-white p-4 rounded-xl border border-gray-200 ${
                user.user_id === currentUser?.id ? 'bg-blue-50 border-blue-200' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                  {index === 1 && <Trophy className="w-5 h-5 text-gray-400" />}
                  {index === 2 && <Trophy className="w-5 h-5 text-orange-600" />}
                  <span className="font-bold text-lg">#{index + 1}</span>
                </div>
                <span className="text-blue-600 font-semibold text-lg">{user.total_score} نقطة</span>
              </div>
              
              <div className="mb-3">
                <h3 className="font-medium">
                  {user.full_name}
                  {user.user_id === currentUser?.id && (
                    <span className="mr-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">أنت</span>
                  )}
                </h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-600">المواد المكتملة:</span>
                  <span className="font-medium mr-1">{user.materials_completed}</span>
                </div>
                <div>
                  <span className="text-gray-600">متوسط الدرجات:</span>
                  <span className="font-medium mr-1">{user.average_percentage}%</span>
                </div>
              </div>
              
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${user.average_percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Admin Materials Management
  const AdminMaterialsPage = () => {
    // Force reload materials when component mounts
    useEffect(() => {
      loadMaterials();
    }, []);

    const handleSaveMaterial = async () => {
      try {
        if (editingMaterial) {
          await updateMaterial(editingMaterial.id, formData);
        } else {
          await addMaterial(formData);
        }
        setEditingMaterial(null);
        setShowAddForm(false);
        setFormData({ title: '', description: '', material_url: '', category: '' });
      } catch (error) {
        console.error('خطأ في حفظ المادة:', error);
      }
    };

    return (
      <div className="p-6" dir="rtl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-2xl font-bold">إدارة المواد الإثرائية</h2>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            إضافة مادة جديدة
          </button>
        </div>

        {(showAddForm || editingMaterial) && (
          <div className="bg-gray-50 p-6 rounded-xl mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingMaterial ? 'تعديل المادة' : 'إضافة مادة جديدة'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">رابط المادة</label>
                <input
                  type="url"
                  value={formData.material_url}
                  onChange={(e) => setFormData({ ...formData, material_url: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveMaterial}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                حفظ
              </button>
              <button
                onClick={() => {
                  setEditingMaterial(null);
                  setShowAddForm(false);
                  setFormData({ title: '', description: '', material_url: '', category: '' });
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                إلغاء
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-right p-4 font-semibold text-gray-700">العنوان</th>
                <th className="text-right p-4 font-semibold text-gray-700">التصنيف</th>
                <th className="text-right p-4 font-semibold text-gray-700">عدد الاختبارات</th>
                <th className="text-right p-4 font-semibold text-gray-700">تاريخ الإضافة</th>
                <th className="text-right p-4 font-semibold text-gray-700">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {materials.map(material => {
                const quizCount = materialQuizCounts[material.id] || 0;
                return (
                  <tr key={material.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div>
                        <p className="font-medium">{material.title}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{material.description}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">
                        {material.category}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="font-medium">{quizCount} اختبار</span>
                    </td>
                    <td className="p-4 text-sm text-gray-600">
                      {new Date(material.created_at).toLocaleDateString('ar-SA')}
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingMaterial(material);
                            setFormData({
                              title: material.title,
                              description: material.description,
                              material_url: material.material_url,
                              category: material.category
                            });
                          }}
                          className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذه المادة؟')) {
                              deleteMaterial(material.id);
                            }
                          }}
                          className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Admin Quizzes Management
  const AdminQuizzesPage = () => {
    // Force reload materials when component mounts
    useEffect(() => {
      loadMaterials();
    }, []);

    const handleSaveQuiz = () => {
      const materialId = selectedMaterialForQuizzes.id;
      
      if (editingQuiz) {
        updateQuiz(materialId, editingQuiz.id, quizFormData);
      } else {
        addQuiz(materialId, quizFormData);
      }
      
      setEditingQuiz(null);
      setShowAddQuizForm(false);
      setQuizFormData({ title: '', description: '' });
    };

    return (
      <div className="p-6" dir="rtl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">إدارة الاختبارات</h2>
            {selectedMaterialForQuizzes && (
              <p className="text-gray-600 mt-1">المادة: {selectedMaterialForQuizzes.title}</p>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={selectedMaterialForQuizzes?.id || ''}
              onChange={(e) => {
                const material = materials.find(m => m.id === parseInt(e.target.value));
                setSelectedMaterialForQuizzes(material);
                loadQuizzesForAdmin(material?.id);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر المادة</option>
              {materials.map(material => (
                <option key={material.id} value={material.id}>
                  {material.title}
                </option>
              ))}
            </select>
            {selectedMaterialForQuizzes && (
              <button
                onClick={() => setShowAddQuizForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                إضافة اختبار
              </button>
            )}
          </div>
        </div>

        {(showAddQuizForm || editingQuiz) && selectedMaterialForQuizzes && (
          <div className="bg-gray-50 p-6 rounded-xl mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingQuiz ? 'تعديل الاختبار' : 'إضافة اختبار جديد'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الاختبار</label>
                <input
                  type="text"
                  value={quizFormData.title}
                  onChange={(e) => setQuizFormData({ ...quizFormData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="مثال: اختبار المفاهيم الأساسية"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">وصف الاختبار</label>
                <textarea
                  value={quizFormData.description}
                  onChange={(e) => setQuizFormData({ ...quizFormData, description: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="وصف مختصر عن محتوى الاختبار"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveQuiz}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                حفظ الاختبار
              </button>
              <button
                onClick={() => {
                  setEditingQuiz(null);
                  setShowAddQuizForm(false);
                  setQuizFormData({ title: '', description: '' });
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                إلغاء
              </button>
            </div>
          </div>
        )}

        {selectedMaterialForQuizzes && (
          <div className="space-y-4">
            {materialQuizzesForAdmin.map((quiz, index) => {
              const quizQuestions = mockQuestions[quiz.id] || [];
              return (
                <div key={quiz.id} className="bg-white p-6 rounded-xl border border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-medium">
                          اختبار {index + 1}
                        </span>
                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                          {quizQuestions.length} سؤال
                        </span>
                      </div>
                      <h4 className="font-medium mb-2">{quiz.title}</h4>
                      <p className="text-sm text-gray-600">{quiz.description}</p>
                    </div>
                    
                    <div className="flex gap-2 mt-3 sm:mt-0">
                      <button
                        onClick={() => {
                          setEditingQuiz(quiz);
                          setQuizFormData({
                            title: quiz.title,
                            description: quiz.description
                          });
                        }}
                        className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200 transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('هل أنت متأكد من حذف هذا الاختبار؟')) {
                            deleteQuiz(selectedMaterialForQuizzes.id, quiz.id);
                          }
                        }}
                        className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!selectedMaterialForQuizzes && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">اختر مادة من القائمة أعلاه لعرض وإدارة اختباراتها</p>
          </div>
        )}
      </div>
    );
  };

  // Admin Questions Management
  const AdminQuestionsPage = () => {
    // Force reload materials when component mounts
    useEffect(() => {
      loadMaterials();
    }, []);

    const handleSaveQuestion = () => {
      const quizId = selectedQuizForQuestions.id;
      
      if (editingQuestion) {
        updateQuestion(quizId, editingQuestion.id, questionFormData);
      } else {
        addQuestion(quizId, questionFormData);
      }
      
      setEditingQuestion(null);
      setShowAddQuestionForm(false);
      setQuestionFormData({
        question_text: '',
        question_type: 'multiple_choice',
        correct_answer: '',
        points: 10,
        options: { options: ['', '', '', ''] }
      });
    };

    return (
      <div className="p-6" dir="rtl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">إدارة الأسئلة</h2>
            {selectedMaterialForQuizzes && selectedQuizForQuestions && (
              <p className="text-gray-600 mt-1">
                المادة: {selectedMaterialForQuizzes.title} - الاختبار: {selectedQuizForQuestions.title}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <select
              value={selectedMaterialForQuizzes?.id || ''}
              onChange={(e) => {
                const material = materials.find(m => m.id === parseInt(e.target.value));
                setSelectedMaterialForQuizzes(material);
                setSelectedQuizForQuestions(null);
                loadQuizzesForAdmin(material?.id);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">اختر المادة</option>
              {materials.map(material => (
                <option key={material.id} value={material.id}>
                  {material.title}
                </option>
              ))}
            </select>
            
            {selectedMaterialForQuizzes && (
              <select
                value={selectedQuizForQuestions?.id || ''}
                onChange={(e) => {
                  const quizId = parseInt(e.target.value);
                  const selectedQuiz = materialQuizzesForAdmin.find(q => q.id === quizId);
                  setSelectedQuizForQuestions(selectedQuiz);
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">اختر الاختبار</option>
                {materialQuizzesForAdmin.map(quiz => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </select>
            )}
            
            {selectedQuizForQuestions && (
              <button
                onClick={() => setShowAddQuestionForm(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                إضافة سؤال
              </button>
            )}
          </div>
        </div>

        {(showAddQuestionForm || editingQuestion) && selectedQuizForQuestions && (
          <div className="bg-gray-50 p-6 rounded-xl mb-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingQuestion ? 'تعديل السؤال' : 'إضافة سؤال جديد'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">نص السؤال</label>
                <textarea
                  value={questionFormData.question_text}
                  onChange={(e) => setQuestionFormData({ ...questionFormData, question_text: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">نوع السؤال</label>
                  <select
                    value={questionFormData.question_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setQuestionFormData({ 
                        ...questionFormData, 
                        question_type: newType,
                        options: newType === 'multiple_choice' ? { options: ['', '', '', ''] } : undefined,
                        correct_answer: ''
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="multiple_choice">اختيار متعدد</option>
                    <option value="true_false">صح أو خطأ</option>
                    <option value="short_answer">إجابة قصيرة</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">النقاط</label>
                  <input
                    type="number"
                    value={questionFormData.points}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, points: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                </div>
              </div>

              {questionFormData.question_type === 'multiple_choice' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">الخيارات</label>
                  <div className="space-y-2">
                    {questionFormData.options.options.map((option, index) => (
                      <input
                        key={index}
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...questionFormData.options.options];
                          newOptions[index] = e.target.value;
                          setQuestionFormData({ 
                            ...questionFormData, 
                            options: { options: newOptions }
                          });
                        }}
                        placeholder={`الخيار ${index + 1}`}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">الإجابة الصحيحة</label>
                {questionFormData.question_type === 'multiple_choice' ? (
                  <select
                    value={questionFormData.correct_answer}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, correct_answer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">اختر الإجابة الصحيحة</option>
                    {questionFormData.options.options.map((option, index) => (
                      option && <option key={index} value={option}>{option}</option>
                    ))}
                  </select>
                ) : questionFormData.question_type === 'true_false' ? (
                  <select
                    value={questionFormData.correct_answer}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, correct_answer: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">اختر الإجابة</option>
                    <option value="true">صح</option>
                    <option value="false">خطأ</option>
                  </select>
                ) : (
                  <textarea
                    value={questionFormData.correct_answer}
                    onChange={(e) => setQuestionFormData({ ...questionFormData, correct_answer: e.target.value })}
                    placeholder="اكتب الإجابة النموذجية"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={2}
                  />
                )}
              </div>
            </div>
            
            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSaveQuestion}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                حفظ السؤال
              </button>
              <button
                onClick={() => {
                  setEditingQuestion(null);
                  setShowAddQuestionForm(false);
                  setQuestionFormData({
                    question_text: '',
                    question_type: 'multiple_choice',
                    correct_answer: '',
                    points: 10,
                    options: { options: ['', '', '', ''] }
                  });
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                إلغاء
              </button>
            </div>
          </div>
        )}

        {selectedQuizForQuestions && (
          <div className="space-y-4">
            {(mockQuestions[selectedQuizForQuestions.id] || []).map((question, index) => (
              <div key={question.id} className="bg-white p-6 rounded-xl border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-medium">
                        السؤال {index + 1}
                      </span>
                      <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                        {question.question_type === 'multiple_choice' ? 'اختيار متعدد' :
                         question.question_type === 'true_false' ? 'صح/خطأ' : 'إجابة قصيرة'}
                      </span>
                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs">
                        {question.points} نقطة
                      </span>
                    </div>
                    <p className="font-medium mb-2">{question.question_text}</p>
                    
                    {question.question_type === 'multiple_choice' && question.options && (
                      <div className="text-sm text-gray-600 mb-2">
                        <p className="font-medium mb-1">الخيارات:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {question.options.options.map((option, i) => (
                            <li key={i} className={option === question.correct_answer ? 'text-green-600 font-medium' : ''}>
                              {option} {option === question.correct_answer && '✓'}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <p className="text-sm text-green-600">
                      <span className="font-medium">الإجابة الصحيحة:</span> {question.correct_answer}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 mt-3 sm:mt-0">
                    <button
                      onClick={() => {
                        setEditingQuestion(question);
                        setQuestionFormData({
                          question_text: question.question_text,
                          question_type: question.question_type,
                          correct_answer: question.correct_answer,
                          points: question.points,
                          options: question.options || { options: ['', '', '', ''] }
                        });
                      }}
                      className="bg-blue-100 text-blue-700 p-2 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذا السؤال؟')) {
                          deleteQuestion(selectedQuizForQuestions.id, question.id);
                        }
                      }}
                      className="bg-red-100 text-red-700 p-2 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!selectedMaterialForQuizzes && (
          <div className="text-center py-12">
            <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">اختر مادة واختبار من القوائم أعلاه لإدارة الأسئلة</p>
          </div>
        )}
      </div>
    );
  };

  // Render main app
  if (currentView === 'login') {
    return <LoginPage />;
  }

  const isAdmin = userProfile?.is_admin;

  return (
    <div className="flex h-screen bg-gray-50">
      {isAdmin ? <AdminSidebar /> : <StudentSidebar />}
      <div className="flex-1 flex flex-col overflow-hidden">
        <MobileHeader isAdmin={isAdmin} />
        <div className="flex-1 overflow-auto">
          {/* Student Views */}
          {!isAdmin && currentView === 'home' && <HomePage />}
          {!isAdmin && currentView === 'materials' && <MaterialsPage />}
          {!isAdmin && currentView === 'quizzes' && <QuizzesPage />}
          {!isAdmin && currentView === 'quiz' && <QuizPage />}
          {!isAdmin && currentView === 'scores' && <ScoresPage />}
          {!isAdmin && currentView === 'leaderboard' && <LeaderboardPage />}
          
          {/* Admin Views */}
          {isAdmin && currentView === 'admin-dashboard' && <AdminDashboard />}
          {isAdmin && currentView === 'admin-materials' && <AdminMaterialsPage />}
          {isAdmin && currentView === 'admin-quizzes' && <AdminQuizzesPage />}
          {isAdmin && currentView === 'admin-questions' && <AdminQuestionsPage />}
        </div>
      </div>
    </div>
  );
}

export default App;