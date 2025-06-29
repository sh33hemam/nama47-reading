# نادي القراءة التفاعلي 📚

منصة تفاعلية لتشجيع القراءة وتقييم الفهم من خلال الأسئلة والاختبارات التفاعلية.

## ✨ الميزات

- 📖 **إدارة المواد الإثرائية**: رفع وتنظيم المواد التعليمية
- ❓ **أسئلة تفاعلية**: اختيار متعدد، صح/خطأ، أسئلة مقالية
- 📊 **تتبع التقدم**: نظام نقاط ودرجات شامل
- 🏆 **لوحة المتصدرين**: منافسة صحية بين المشاركين
- 👥 **إدارة المستخدمين**: نظام مصادقة آمن
- 📱 **تصميم متجاوب**: يعمل على جميع الأجهزة
- 🌙 **واجهة عربية**: تدعم الكتابة من اليمين لليسار

## 🚀 البدء السريع

### المتطلبات

- Node.js 18+ 
- npm أو yarn
- حساب Supabase

### 1. تنزيل المشروع

```bash
git clone https://github.com/sh33hemam/nama47-reading.git
cd nama47-reading
```

### 2. تثبيت التبعيات

```bash
npm install
```

### 3. إعداد متغيرات البيئة

انسخ ملف `.env.example` وأعد تسميته إلى `.env`:

```bash
cp .env.example .env
```

حدّث القيم في ملف `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. تشغيل التطبيق

```bash
npm run dev
```

التطبيق سيعمل على `http://localhost:3000`

## 🏗️ البناء للإنتاج

```bash
npm run build
```

الملفات المبنية ستكون في مجلد `dist/`

## 📦 النشر على Netlify

1. ارفع مجلد المشروع إلى GitHub
2. اربط مستودع GitHub بـ Netlify
3. أضف متغيرات البيئة في إعدادات Netlify:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. سيتم النشر تلقائياً

## 🛠️ التقنيات المستخدمة

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **Deployment**: Netlify

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT.

---

صُنع بـ ❤️ من قِبل فريق نماء للتعليم

🚀 Generated with [Claude Code](https://claude.ai/code)