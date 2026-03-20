# دليل استخدام Convex في GlobalTawasul

## ✅ ما تم إنجازه

### 1. Backend (Convex Functions)
- ✅ Schema: users, posts, followers, messages
- ✅ Functions: CRUD operations لكل جدول
- ✅ Seed: إضافة 5 مستخدمين تجريبيين

### 2. Frontend (index.html)
- ✅ إضافة دالة `convexQuery()` للقراءة
- ✅ إضافة دالة `convexMutation()` للكتابة
- ✅ دوال مثال: `loadUsersFromConvex()`, `loadPostsFromConvex()`

---

## 🚀 كيفية الاستخدام

### 1. تفعيل الـ Functions في Frontend

في ملف `index.html`، ابحث عن:
```javascript
// Call on page load
document.addEventListener('DOMContentLoaded', () => {
    // Uncomment to enable Convex integration
    // loadUsersFromConvex();
    // loadPostsFromConvex();
});
```

غيّر إلى:
```javascript
document.addEventListener('DOMContentLoaded', () => {
    loadUsersFromConvex();
    loadPostsFromConvex();
});
```

### 2. استخدام Convex في الكود

#### جلب المستخدمين:
```javascript
const users = await convexQuery('users:getAll');
```

#### جلب مستخدم محدد:
```javascript
const user = await convexQuery('users:getById', { id: 'user-id-here' });
```

#### إنشاء منشور:
```javascript
await convexMutation('posts:create', {
    userId: 'user-id',
    content: 'محتوى المنشور',
    imageUrl: 'optional-image-url'
});
```

#### متابعة مستخدم:
```javascript
await convexMutation('followers:follow', {
    followerId: 'your-id',
    followingId: 'target-user-id'
});
```

#### إرسال رسالة:
```javascript
await convexMutation('messages:send', {
    senderId: 'your-id',
    receiverId: 'receiver-id',
    content: 'نص الرسالة'
});
```

---

## 🔄 استبدال SQLite بـ Convex

### الخطوة 1: إضافة مستخدمين تجريبيين
```bash
npx convex run seed:seedUsers
```

### الخطوة 2: اختبار الـ API
```bash
# جلب المستخدمين
npx convex run users:getAll

# إنشاء منشور
npx convex run posts:create '{"userId": "your-user-id", "content": "Hello"}'
```

### الخطوة 3: تحديث Frontend
استبدل دوال `loadStateFromLocalStorage()` بـ `loadUsersFromConvex()` و `loadPostsFromConvex()`

---

## 📝 Functions المتاحة

### Users
- `users:getAll` - جلب جميع المستخدمين
- `users:getById` - جلب مستخدم محدد
- `users:create` - إنشاء مستخدم جديد
- `users:update` - تحديث مستخدم

### Posts
- `posts:getAll` - جلب جميع المنشورات
- `posts:getByUser` - جلب منشورات مستخدم
- `posts:create` - إنشاء منشور
- `posts:like` - إعجاب بمنشور

### Followers
- `followers:getFollowers` - جلب المتابعين
- `followers:getFollowing` - جلب المتابَعون
- `followers:getRequests` - جلب طلبات المتابعة
- `followers:follow` - متابعة مستخدم
- `followers:accept` - قبول طلب
- `followers:unfollow` - إلغاء المتابعة

### Messages
- `messages:getConversations` - جلب المحادثات
- `messages:getMessages` - جلب رسائل محادثة
- `messages:send` - إرسال رسالة
- `messages:markRead` - تحديد كمقروء

---

## ⚡ Real-time Updates

لاستخدام Real-time updates مع Convex:

```javascript
// مثال: تحديث المنشورات تلقائياً
setInterval(async () => {
    const posts = await convexQuery('posts:getAll');
    if (posts) {
        updatePostsUI(posts);
    }
}, 5000); // تحديث كل 5 ثواني
```

---

## 🔗 الروابط

- **Convex Dashboard**: https://dashboard.convex.dev
- **Cloud URL**: https://befitting-ant-354.convex.cloud
- **HTTP URL**: https://befitting-ant-354.convex.site
