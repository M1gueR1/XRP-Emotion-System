# XRP Web Application Repository

This repository contains the XRP Web application source code using React + TypeScript + Vite with a Python FastAPI backend. The XRP is an open-robotics platform designed to help you take your first steps into engineering, robotics, and software development.

The XRP software platform is an integrated development environment where you can develop your robotics software program using either the visual block programming paradigm or the Python language.

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** (v16 or higher)
- **Python** (v3.8 or higher) 
- **npm** or **yarn**

### Frontend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd XRPWeb
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   The frontend will be available at `http://localhost:3000`

### Backend Setup (AI Assistant)

The backend provides the XRPCode Buddy AI assistant functionality through a secure FastAPI proxy.

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create Python virtual environment**
   ```bash
   python -m venv venv
   
   # Activate virtual environment
   # On Windows:
   venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   
   Create a `.env` file in the `backend/` directory:
   ```bash
   # backend/.env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   Get your free Gemini API key at [Google AI Studio](https://aistudio.google.com/app/apikey)

5. **Start the backend server**
   ```bash
   python main.py
   ```

   The backend API will be available at `http://localhost:8000`

### Running Both Services

For full functionality, run both frontend and backend:

```bash
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend  
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
python main.py
```

## 🤖 XRPCode Buddy - AI Assistant

XRP Web includes **XRPCode Buddy**, an intelligent AI assistant powered by Google Gemini that provides contextual help with your robotics projects. The AI automatically has access to:

- **📚 Complete XRP Documentation** - All API references, tutorials, and programming guides
- **💻 Your Current Code** - Both Python files and Blockly visual programs you have open
- **🎯 Context-Aware Responses** - Answers based on official XRP documentation and your specific code

### Key Features

- **Instant Code Help**: Get explanations and debugging assistance for your current code
- **Documentation-Backed Answers**: All responses reference official XRP robotics documentation
- **Multi-Language Support**: Works with both Python code and Blockly visual programming
- **Active File Awareness**: Knows which file you're currently editing
- **Real-Time Context**: Automatically includes your open files in every conversation
- **Secure API Proxy**: Backend handles API key securely without exposing it to the browser

### AI Assistant Setup

1. **Start the backend server** (see Backend Setup above)
2. **Get a free Google Gemini API key** at [Google AI Studio](https://aistudio.google.com/app/apikey)
3. **Add API key to backend/.env** file as shown in Backend Setup
4. **Restart the backend server** to load the API key
5. **Click the AI Chat tab** in XRP Web
6. **Start coding** - the AI will automatically see your work and XRP documentation!

### AI Model & Architecture

**XRPCode Buddy** uses:
- **Model**: Gemini 2.5 Flash - Google's latest fast and efficient model optimized for real-time conversations and code assistance
- **Architecture**: FastAPI backend proxy with specialized educational prompts
- **Security**: API keys stored server-side, not exposed to browser
- **Context Management**: Automatic file content inclusion and XRP documentation integration 
