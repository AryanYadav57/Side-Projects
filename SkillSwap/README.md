# SkillSwap 🎓⚡

> A modern college skill marketplace — share what you know, discover what you need.

![React Native](https://img.shields.io/badge/React_Native-0.84-blue?logo=react)
![Node.js](https://img.shields.io/badge/Backend-Node.js-green?logo=node.js)
![MongoDB](https://img.shields.io/badge/Database-MongoDB_Atlas-green?logo=mongodb)
![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 📱 Screenshots

> Dark glassmorphism UI with bottom tab navigation.

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure register & login with bcrypt password hashing
- 🌑 **Dark Glass UI** — Glassmorphism design with dark theme by default
- 📋 **Skill Listings** — Browse, filter, search, and sort skills by category/price/rating
- 💬 **In-App Chat** — Start conversations directly from skill cards
- 🔖 **Bookmarks** — Save skills to your personal list
- 🔍 **Search** — Live full-screen skill search with recent search history
- 📱 **Bottom Tab Navigation** — Home · Search · Messages · Profile
- 📳 **Haptic Feedback** — Tactile response on every action
- 🌐 **Backend API** — REST API with MongoDB Atlas persistence

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Mobile App | React Native (CLI) |
| Navigation | React Navigation v6 (Stack + Bottom Tabs) |
| State | React Context API |
| Storage | AsyncStorage (token persistence) |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcryptjs |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- Android Studio / Xcode
- MongoDB Atlas account

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/SkillSwap.git
cd SkillSwap
```

### 2. Install frontend dependencies
```bash
npm install
```

### 3. Set up the backend
```bash
cd backend
npm install
```

Create `backend/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_key
```

### 4. Run the backend
```bash
cd backend
npm run dev
```

### 5. Run the app
```bash
# In a new terminal, from the project root:
npx react-native start --reset-cache

# In another terminal:
npx react-native run-android
# or
npx react-native run-ios
```

---

## 📁 Project Structure

```
SkillSwap/
├── App.tsx                # Entry point + providers
├── context/               # AuthContext, ThemeContext, BookmarksContext, NotificationsContext
├── navigation/            # StackNavigator + Bottom Tab Navigator
├── screens/               # All app screens
├── components/            # SkillCard, MessageBubble
├── utils/                 # API utility, haptics
├── data/                  # Fallback dummy data
├── types/                 # TypeScript types
├── styles/                # Global styles + dark glass palette
└── backend/               # Express + MongoDB API
    ├── config/            # DB connection
    ├── models/            # User, Skill schemas
    ├── routes/            # Auth and Skills routes
    └── middleware/        # JWT auth middleware
```

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

## 📄 License

[MIT](LICENSE)

---

Made with ❤️ for college skill sharing.
