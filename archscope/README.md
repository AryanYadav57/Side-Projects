<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/box.svg" width="80" alt="ArchScope Logo" />
  <h1 align="center">ArchScope</h1>
  <p align="center">
    <strong>Instantly visualize the internal structure of any repository.</strong>
  </p>
</div>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#how-it-works">How It Works</a> •
  <a href="#technologies">Technologies</a>
</p>

---

**ArchScope** is a modern, beautifully designed web application that allows you to instantly visualize the folder and file structure of any project. Whether you drag and drop a folder directly, upload a ZIP file, or paste a GitHub repository link, ArchScope processes the files natively and renders a stunning, interactive hierarchical view of the architecture.

## Features ✨

- **Instant Folder Drops**: Uses the HTML5 File System Access API to parse deeply nested folders directly on your machine instantly—no uploads required.
- **GitHub Repository Scanner**: Simply paste a GitHub URL (even direct links to deep sub-directories), and ArchScope will instantly fetch and map out the file tree using the GitHub API.
- **ZIP Extraction Support**: An integrated Node.js backend handles traditional `.zip` file drops by securely extracting and reading the structure.
- **Dual View Modes**: 
  - **Tree View**: A highly readable, collapsible file-explorer style list.
  - **Diagram View**: A gorgeous, zoomed, pannable, fully interactive node-based flowchart highlighting folders and files.
- **Premium UI/UX**: Built with meticulously crafted Tailwind CSS styles, Framer Motion micro-animations, glassmorphism, glowing accents, and dynamic layout scaling.

## Quick Start 🚀

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed on your machine.

### 1. Clone the repository
```bash
git clone https://github.com/AryanYadav57/archscope.git
cd archscope
```

### 2. Start the Backend Server (For ZIP handling)
```bash
cd backend
npm install
node server.js
```
*The server will start running on `http://localhost:5000`.*

### 3. Start the Frontend Application
Open a new terminal window inside the main folder:
```bash
cd frontend
npm install
npm start
```
*The React application will automatically open in your browser at `http://localhost:3000`.*

## How To Push to GitHub 🛠️
To put this newly finalized project on your GitHub, follow these simple steps right in your terminal at the root project directory (`archscope`):

1. **Initialize Git (if not already done)**: `git init`
2. **Add Files**: `git add .`
3. **Commit**: `git commit -m "Initial commit of ArchScope"`
4. **Create a new Repository** on GitHub, then link it:
   ```bash
   git branch -M main
   git remote add origin https://github.com/AryanYadav57/archscope.git
   git push -u origin main
   ```

## Technologies 💻
- **Frontend**: React 19, Tailwind CSS v3, Framer Motion, Lucide React, React Dropzone, React-D3-Tree, Axios.
- **Backend**: Node.js, Express, Multer (file uploads), AdmZip (zip parsing).

---

<p align="center">
  Built for seamless architectural visualization.<br/>
  Designed & Developed with ❤️ by <strong>Aryan Yadav</strong>.
</p>
