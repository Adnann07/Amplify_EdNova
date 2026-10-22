# Amplify: Adaptive AI-Powered Learning Platform

> **Live Platform:** [amplifywebsite-production.up.railway.app](https://amplifywebsite-production.up.railway.app)

> **Don't Memorise, Visualise** — A revolutionary adaptive learning platform built for Bangladesh, designed to transform passive textbook learning into intelligent, personalized education powered by cutting-edge AI models.

![Project Status](https://img.shields.io/badge/Status-Active%20Development-brightgreen)
![License](https://img.shields.io/badge/License-MIT-blue)
![Built with](https://img.shields.io/badge/Built%20with-Laravel%20%7C%20Python%20%7C%20JavaScript-blue)

[![Laravel](https://img.shields.io/badge/Laravel-12-FF2D20?logo=laravel&logoColor=white)](https://laravel.com/)
[![PHP](https://img.shields.io/badge/PHP-8.2%2B-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Flutter](https://img.shields.io/badge/Flutter-Mobile%20App-02569B?logo=flutter&logoColor=white)](https://github.com/Adnann07/Amplifyapp)
[![Dart](https://img.shields.io/badge/Dart-Mobile%20Client-0175C2?logo=dart&logoColor=white)](https://dart.dev/)
[![Manim](https://img.shields.io/badge/Manim-Visualizations-000000?logo=python&logoColor=white)](https://www.manim.community/)
[![Three.js](https://img.shields.io/badge/Three.js-3D%20Labs-000000?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![Neo4j](https://img.shields.io/badge/Neo4j-Knowledge%20Graph-4581C3?logo=neo4j&logoColor=white)](https://neo4j.com/)
[![FAISS](https://img.shields.io/badge/FAISS-Vector%20Search-0467DF?logo=meta&logoColor=white)](https://github.com/facebookresearch/faiss)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agent%20Workflows-1C3C3C?logo=langchain&logoColor=white)](https://langchain-ai.github.io/langgraph/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Redis](https://img.shields.io/badge/Redis-Cache%20%26%20Queues-DC382D?logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Deployment-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![AWS](https://img.shields.io/badge/AWS-EC2%20Mobile%20Backend-FF9900?logo=amazonaws&logoColor=white)](https://aws.amazon.com/ec2/)
[![Railway](https://img.shields.io/badge/Railway-Live%20Deployment-000000?logo=railway&logoColor=white)](https://amplifywebsite-production.up.railway.app)
[![Groq](https://img.shields.io/badge/Groq-LLM%20Inference-F55036?logo=groq&logoColor=white)](https://groq.com/)
[![OpenRouter](https://img.shields.io/badge/OpenRouter-Model%20Routing-6466F1?logo=openrouter&logoColor=white)](https://openrouter.ai/)
[![Azure](https://img.shields.io/badge/Azure-Speech%20Services-0078D4?logo=microsoftazure&logoColor=white)](https://azure.microsoft.com/products/ai-services/ai-speech)

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Core Features & Use Cases](#core-features--use-cases)
3. [Technical Architecture](#technical-architecture)
4. [Manim Visualization Pipeline](#manim-visualization-pipeline)
5. [Database Architecture](#database-architecture)
6. [AI Models & Methodologies](#ai-models--methodologies)
7. [Data Privacy & Security](#data-privacy--security)
8. [Installation & Setup](#installation--setup)
9. [Usage Guide](#usage-guide)
10. [API Documentation](#api-documentation)
11. [Performance Metrics](#performance-metrics)
12. [Troubleshooting](#troubleshooting)
13. [Contributing](#contributing)
14. [NCTB Textbook Q&A Assistant](#nctb-textbook-qa-assistant)
15. [License](#license)
16. [Flutter Mobile App](#flutter-mobile-app)

---

## 🎯 Project Overview

**Amplify** is an intelligent, adaptive learning platform designed to revolutionize NCTB-aligned education in Bangladesh. Unlike traditional passive learning systems, Amplify uses advanced AI and machine learning to adapt to each student's learning pace, cognitive abilities, and learning style in real-time.

### Key Objectives

- **Personalized Learning**: Adapt curriculum delivery based on individual student performance and learning patterns
- **Engagement Through Visualization**: Transform complex concepts into animated 3D visuals using Manim
- **Real-time Attention Tracking**: Monitor student engagement and provide timely interventions
- **Offline-First Architecture**: Enable quality education in areas with limited connectivity
- **Privacy-Preserving**: Process sensitive biometric data (facial expressions) entirely on the client-side

### Target Users

- **Secondary & Higher Secondary Students** (Classes 9-12)
- **Teachers & Educators** (Classroom administration and monitoring)
- **Educational Institutions** (Bangladesh NCTB curriculum aligned)
- **Career-Seekers** (Guidance and opportunity matching)

---

## 🌟 Core Features & Use Cases

### 1. **Personalised AI Tutor** (Amplify Tutor)

#### Overview
The Amplify Tutor is the core learning engine that provides one-on-one adaptive tutoring through document analysis and conversational AI. It learns individual student patterns and adjusts teaching methodology accordingly.

#### Use Cases

| Use Case | Description | Technical Implementation |
|----------|-------------|--------------------------|
| **Conceptual Learning** | Student uploads a lesson or textbook and gets personalized explanations | PDF parsing, semantic chunking with Neo4j knowledge graphs, contextual QA |
| **Exam Preparation** | Adaptive quizzing based on weak areas identified through prior interactions | Spaced repetition scheduling, attention tracking, performance analytics |
| **Doubts & Clarification** | Student asks follow-up questions on topics they don't understand | Multi-turn conversation with context retention, semantic search |
| **Progress Monitoring** | Teachers track student learning patterns and identify at-risk students | Dashboard analytics, attention logs, performance trajectories |

#### Key Features

- **Document Processing**: PDF parsing, OCR for scanned documents, semantic chunking (300 words with 60-word overlap)
- **Conversational AI**: Multi-turn dialogue with context retention, RAG-based responses, contextual quizzes
- **Accessible PDF Tutor**: Upload PDFs for text extraction and vision OCR, then get hint-first, level- and learning-style-adapted Groq responses in English, French, Arabic, or Moroccan Darija, with browser text-to-speech. Groq requests go through the FastAPI `/api/pdf-tutor/chat` endpoint, use the same server-side Groq configuration as AI Classroom and Deep Learn, and fall back across the shared Groq model set. Open `backend/frontend/pdf-tutor.html`.
- **Visual Animation**: Manim-powered animated explanations of lesson topics
- **Attention Monitoring**: Real-time facial expression recognition with distraction warnings (5-8 second threshold)

#### AI Models Used

- **GPT-OSS-120B / GPT-OSS-20B** (Primary reasoning)
- **Qwen 3.6-27B** (Alternative for specific tasks)
- **Gemini 2.0 Flash Lite** (Slide generation and visualizations)

---

### 2. **Full Knowledge System** (Second Brain)

A comprehensive study companion combining spaced repetition (SM-2 algorithm), topic hierarchies, and engagement analytics.

**Key Features:**
- SM-2 algorithm for optimal review scheduling
- Concept dependency trees with prerequisite validation
- Attention drift detection before exams
- Study session analytics with performance correlation

---

### 3. **NCTB Offline Mode**

Privacy-preserving, curriculum-aligned knowledge system for accurate NCTB textbook answers without internet.

**Technical Specifications:**
- OpenAI text-embedding-3-small (1536-dim vectors)
- Cosine similarity search with threshold ≥ 0.7
- Hybrid search combining keyword and semantic matching
- LLM hallucination prevention through grounding

---

### 4. **Einstein Mode** (Advanced Research Assistance)

Multimodal research layer for students advancing beyond textbooks with visual context at every step.

**Model Stack:**
- **Primary**: GPT-OSS-120B (reasoning-heavy tasks)
- **Research**: Llama 3.3-70B (breadth of knowledge)
- **Vision**: Qwen 3.6-27B (multimodal understanding)

---

### 5. **3D Lab** (Practical Experiments & Simulations)

Interactive 3D simulations of chemistry practicals, physics experiments, and biological processes.

**Features:**
- 50+ pre-built chemistry practicals covering NCTB curriculum
- Gesture recognition using MediaPipe Hands (±5mm precision, <33ms latency)
- Voice commands in English using the Web Speech API
- Real-time 3D rendering with Three.js and Manim

---

### 6. **Classroom AI** (Educator Tools)

Complete classroom management system with real-time monitoring and adaptive lesson delivery.

**Features:**
- Real-time attention heatmaps and student monitoring
- Quiz builder with auto-grading for objective questions
- Material distribution and engagement tracking
- Communication hub for announcements and feedback

---

### 7. **Deep Learn** (Multi-Expert Discussion System)

Three AI experts (Dr. Arif, Dr. Nafisa, Dr. Rakib) debate topics from different angles using LangGraph orchestration.

**Technical Implementation:**
- LangGraph-based state management for conversation flow
- Each expert routed through different model for diversity
- PDF context integration to prevent hallucination
- Full conversation transcripts with export capability

---

### 8. **Career Engine** (Opportunity Matching)

AI-powered career guidance that matches learners to international career paths and official employer career portals.

**Features:**
- Profile-based career assessment and personalized learning roadmaps
- International employer examples across technology, finance, healthcare, engineering, creative, and consulting careers
- Links to official company career portals; example roles are not a feed of verified live vacancies

---

### 9. **Chemistry Experiments** (Interactive Virtual Lab)

Comprehensive collection of 50+ NCTB chemistry practicals with detailed observations and 3D animations.

---

## 🏗️ Technical Architecture

### System Overview

The platform uses a three-tier architecture:
- **Frontend**: Vanilla JavaScript, Vite, face-api.js, Three.js
- **Backend**: Laravel (PHP) + FastAPI (Python)
- **Data**: MySQL, Neo4j, Vector Database

### Technology Stack

**Frontend:**
- Vanilla JavaScript (ES6+)
- Vite for build optimization
- face-api.js for facial recognition (client-side)
- Three.js + Manim for 3D visualization

**Backend (Python/FastAPI):**
- FastAPI with async support
- LangGraph for multi-expert discussions
- Groq & OpenRouter APIs for LLM integration
- Manim for animated visualizations
- Azure Cognitive Services TTS

**Backend (PHP/Laravel):**
- Laravel 11+ framework
- OTP-based authentication
- MySQL 8.0 database
- WebSocket for real-time updates

**Infrastructure:**
- Docker + Docker Compose
- Nginx + PHP-FPM
- Railway.app (primary) or Vercel (secondary)

---

## 🤖 AI Models & Methodologies

### Large Language Models

| Model | Provider | Use Case | Speed | Cost |
|-------|----------|----------|-------|------|
| **GPT-OSS-120B** | OpenRouter | Complex reasoning | Slow | $$$ |
| **Llama 3.3-70B** | Groq | Balanced quality/speed | Medium | $$ |
| **GPT-OSS-20B** | Groq | Fast generation | Fast | $ |
| **Qwen 3.6-27B** | OpenRouter | Multimodal tasks | Medium | $$ |
| **Gemini 2.0 Flash** | Google | Quick synthesis | Fast | $ |

### RAG (Retrieval-Augmented Generation) Pipeline

```
Document → Chunking → Embedding (1536-dim)
Student Query → Vector Search (Top-K=4)
→ LLM Context Augmentation → Response Generation
```

### Face Expression Recognition

**Architecture:**
- Tiny Face Detector for face localization
- Face Expression Net for 7-emotion classification
- 3-state classifier: Focused / Confused / Distracted
- Hysteresis-based smoothing to prevent false positives

**Distraction Warning:**
- 5-8 second threshold before triggering
- Azure TTS warning in English
- 30-second cooldown between warnings
- 30 FPS detection rate

## Manim Visualization Pipeline

Manim is used as a server-side rendering engine for short, concept-focused visual explanations. The browser requests a visual from the tutor interface, while the Python/FastAPI service performs code generation and video rendering. The generated MP4 is then played by the normal HTML5 video player.

#### Request-to-video flow

```mermaid
flowchart LR
   A[Lesson text or tutor prompt] --> B[Frontend fetchAnimatedVisual]
   B --> C[FastAPI POST /generate]
   C --> D[OpenRouter LLM generates Manim Python]
   D --> E[AST syntax validation]
   E --> F[Pre-flight API and undefined-name checks]
   F --> G[Manim Community Edition render]
   G --> H[MP4 moved to backend/videos]
   H --> I[GET /videos/job-id.mp4]
   I --> J[Autoplay loop in lecture visual panel]
```

#### Implementation details

1. **Prompt construction:** `generate_manim_code()` sends the lesson topic and optional context to an OpenRouter-compatible chat client. The model is instructed to return executable Python, use a `Scene` class based on `MovingCameraScene`, and prefer a small set of reliable Manim primitives such as `Text`, `Circle`, `Line`, `Arrow`, `VGroup`, `Create`, `Write`, and `Transform`.
2. **Pre-render validation:** The service parses generated code with Python `ast`. If the first response has invalid syntax, it retries with a simpler generation prompt. `sanitize_code()` also checks for undefined names and known camera API mistakes, then asks the LLM for a corrected version before rendering.
3. **Rendering:** Each request receives an eight-character UUID job ID. The generated scene is written to `backend/scenes/scene_<job-id>.py`. Manim is invoked through the same Python interpreter as FastAPI with low-quality preview rendering (`-ql`), the `Scene` class, and a job-specific media directory. This produces a 480p15 MP4 that is moved to `backend/videos/<job-id>.mp4`.
4. **Reliability controls:** The endpoint checks that Manim is installed before generation, retries failed renders up to three times, regenerates simpler code for syntax failures, and asks the LLM to repair other render errors. A render that exceeds the 120-second subprocess timeout returns a gateway timeout instead of leaving the request hanging.
5. **Frontend delivery:** The frontend calls the deployed FastAPI `/generate` endpoint, receives the `video_url`, and creates a blob URL for the returned MP4. The lecture panel displays it in a muted, autoplaying, looping `<video>` element. If generation fails, the UI shows its configured fallback visual.

Manim is a generated-media subsystem, not the browser's 3D engine. Three.js remains responsible for interactive lab scenes, while Manim is responsible for deterministic explanatory animations rendered on the backend.

## 🗄️ Database Architecture

Amplify uses separate storage mechanisms for different data shapes instead of forcing authentication, graph relationships, and document search into one database. Laravel is the system of record for relational application data; the tutor uses graph and browser-local stores for learning context.

```mermaid
flowchart TB
   UI[Frontend applications] -->|Auth and classroom API| L[Laravel API]
   UI -->|Tutor graph queries when enabled| N[Neo4j]
   UI -->|Document chunks, TF-IDF index, chat snapshot| LS[Browser localStorage]
   L --> SQL[(SQL database)]
   F[FastAPI AI service] --> N
   F --> V[Generated videos and scene files]
   SQL -. optional cache or queue driver .-> R[(Redis)]
```

### 1. Laravel SQL database: transactional application data

Laravel reads the connection from `DB_CONNECTION` and defaults to SQLite when no value is supplied. The repository includes migrations for:

- `users`, including the student/teacher role used by authentication and classroom authorization
- `personal_access_tokens` for Laravel Sanctum API tokens
- `classrooms`, owned by a teacher and identified by a unique enrollment code
- `classroom_student`, the many-to-many relationship between students and classrooms
- `classroom_notifications`, messages associated with a classroom
- Laravel's cache and queue support tables

For containerized deployment, `docker-compose.yml` provisions MySQL 8.0 as the `db` service. The PHP application connects to it through `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, and `DB_PASSWORD`. MySQL is the intended production-style relational backend in the included Docker setup, while SQLite is convenient for local development and tests. PostgreSQL and MariaDB are also defined as Laravel adapters in `config/database.php`, but they are not separately provisioned by the repository's Docker Compose file.

### 2. Neo4j: optional knowledge graph for tutor relationships

Neo4j stores relationships that are naturally represented as a graph: document concepts, topic connections, prerequisites, and learning-state links such as mastered or struggling. The tutor frontend connects through Neo4j's transactional HTTP endpoint when `NEO4J_HOST`, `NEO4J_USER`, and `NEO4J_PASS` are available. The Python service also exposes a `/neo4j` proxy backed by the official async Neo4j driver and `NEO4J_URI`/`NEO4J_PASS` environment variables.

Neo4j is optional. On startup or connection failure, the tutor falls back to browser storage rather than making basic document study depend on an external graph database. This makes the feature usable in local or offline-oriented deployments while preserving richer graph traversal when Neo4j is configured.

### 3. Browser-local TF-IDF store: document retrieval fallback

The document tutor parses and chunks uploaded material in the frontend. Its local retrieval path uses a TF-IDF vector store rather than a hosted vector database. A document snapshot includes chunk text, page numbers, token statistics, graph metadata, and chat history, and is stored in `localStorage` under `amplify_tutor_documents`.

The local store is bounded to the most recent 20 documents. It supports offline study and keeps retrieval state in the browser. When Neo4j is enabled, graph metadata can be synchronized there; localStorage remains the fallback and the client-side cache for the tutor experience.

### 4. Redis, queues, and cache configuration

Laravel defines Redis connections for the default and cache databases and supports Redis as a queue, cache, session, or application backend through environment configuration. Redis is not required by the core Docker Compose definition, which currently provisions MySQL only. Deployments that need background rendering, high-volume classroom events, or shared cache state can enable Redis with the corresponding Laravel `REDIS_*`, `CACHE_STORE`, `QUEUE_CONNECTION`, or `SESSION_DRIVER` variables.

### Data ownership summary

| Data | Primary store | Purpose | Required? |
|------|---------------|---------|-----------|
| Users, roles, classrooms, memberships, notifications | Laravel SQL (SQLite/MySQL/etc.) | Transactions, authorization, and durable application records | Yes |
| Concepts, prerequisites, and learning relationships | Neo4j | Graph traversal and knowledge context | Optional |
| PDF chunks and local tutor snapshots | Browser `localStorage` with TF-IDF index | Offline-capable retrieval and session continuity | Fallback path |
| Rendered Manim MP4 files | FastAPI `backend/videos` directory | Visual delivery through `/videos` | Created per render |
| Cache, queue, and session state | Laravel file/database/Redis drivers | Operational scaling and asynchronous work | Configurable |

---

## 🔒 Data Privacy & Security

### Critical Privacy Guarantee

**NO facial data is ever transmitted or stored on servers.**

**Client-Side Processing:**
```
Face Detection (face-api.js in browser)
    ↓
7-Emotion Classification (WebGL GPU)
    ↓
Attention State Classification (3 values: focused/confused/distracted)
    ↓
ONLY State JSON Sent to Server
```

### Privacy Features by Data Type

**Facial Recognition:**
- Processed entirely client-side using face-api.js
- Only abstract attention state sent to server (3 values)
- No face images, pixels, or landmarks transmitted
- Session-based tracking (resets per login)
- 90-day retention policy with GDPR compliance

**Document Upload:**
- HTTPS encrypted transmission
- Virus scanned on server
- Original PDF deleted within 24 hours
- Only text chunks and embeddings stored
- 30-day retention with on-demand deletion

**Chat History:**
- AES-256-GCM encryption at-rest
- TLS 1.3 in-transit encryption
- 12-month retention with student consent
- Student controls access (no teacher/admin access)

**Behavioral Data:**
- Aggregated before analysis (5+ students minimum)
- De-identified for research
- Opt-out available in settings

### Compliance

- ✅ **GDPR Article 9**: Biometric data processed locally, not stored
- ✅ **CCPA**: No data sales, one-click opt-out
- ✅ **Bangladesh DPA**: Educational purpose consent + local storage

### Security Architecture

**Authentication:**
- OTP-based login (6-digit code)
- JWT tokens (30-day expiration)
- httpOnly cookies (CSRF protection)
- Rate limiting (5 OTP requests/hour per IP)

**Encryption:**
- TLS 1.3 mandatory for all endpoints
- AES-256 database encryption
- Certificate pinning for mobile apps

**API Security:**
- Rate limiting per endpoint
- Request validation (JSON Schema)
- SQL injection prevention (parameterized queries)
- XSS prevention (HTML sanitization)
- CORS policy (only allowed origins)

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js 20.x or higher
- PHP 8.2 or higher
- Python 3.12 or higher
- Docker (optional)
- MySQL 8.0
- Neo4j 5.x

### Quick Start

```bash
# Clone repository
git clone https://github.com/amplify/website.git
cd AmplifyWebsite

# Setup environment
cp .env.example .env
# Edit .env with your API keys

# Docker setup (easiest)
docker-compose up -d

# Or manual setup:
composer install                    # PHP dependencies
cd backend && pip install -r requirements.txt
npm install && npm run dev         # Frontend

# Access at http://localhost:5173
```

### Production Deployment

**Railway (Recommended):**
```bash
npm i -g railway
railway login
railway up
```

**Vercel:**
```bash
npm i -g vercel
vercel
```

**Self-Hosted:**
```bash
docker build -t amplify:latest .
docker run -d -p 8888:80 amplify:latest
```

---

## 💻 Usage Guide

### For Students

1. **Start Learning**
   - Upload PDF lesson
   - Ask questions in English
   - Receive AI-generated explanations with visuals

2. **Enable Attention Tracking**
   - Click "Attention Tracker" button
   - Grant camera permission
   - AI monitors focus level in real-time
   - Warnings trigger if distracted >5 seconds

3. **Access 3D Lab**
   - Select chemistry experiment
   - Use gestures to rotate/zoom molecules
   - Voice commands in English
   - Complete interactive quiz

### For Teachers

1. **Create Classroom**
   - Set subject, class level, schedule
   - System generates 6-digit enrollment code
   - Share code with students

2. **Real-time Monitoring**
   - View live attention heatmap
   - See which topics students struggle with
   - Identify at-risk students needing intervention

3. **Assessment**
   - Create and deploy quizzes
   - Auto-grade objective questions
   - Analyze performance by topic
   - Provide personalized feedback

---

## 🔗 API Documentation

### Authentication
```
POST /api/auth/otp
Request: {phone: "+8801712345678"}
Response: {success: true, expires_in: 600}

POST /api/auth/verify
Request: {phone: "+8801712345678", otp: "123456"}
Response: {token: "eyJhbGc...", student: {...}}
```

### Tutor API
```
POST /api/tutor/upload-document
Request: {file: PDF, subject: "Chemistry", topic: "Organic Reactions"}
Response: {documentId, pages, chunks, status}

POST /api/tutor/chat
Request: {documentId, message: "English-language question"}
Response: {response, references, followUp}
```

### Analytics API
```
GET /api/analytics/student/{id}/performance
GET /api/analytics/classroom/{id}/dashboard
```

---

## 📊 Performance Metrics

### System Performance

| Metric | Target | Current |
|--------|--------|---------|
| API Response (p95) | <200ms | 150ms |
| Tutor Latency | <3s | 2.2s |
| Video Generation | <30s | 18s |
| Face Detection FPS | 30 | 28 |
| Classroom Sync | <1s | 800ms |

### AI Model Performance

- **Tutor Accuracy**: F1 Score 0.82 on NCTB benchmark
- **Answer Relevance**: 88% (human-rated)
- **Hallucination Rate**: <2% (RAG grounded)
- **Face Detection**: 94% accuracy, 3% false positive rate
- **Manim Success**: 92% successful rendering

---

## 🐛 Troubleshooting

**Camera Permission Denied:**
1. Check browser permissions (Chrome Settings → Privacy)
2. Clear site cookies
3. Use incognito window
4. Try Chrome or Edge

**Attention Tracker Model Load Failed:**
1. Check internet connection
2. Clear browser cache
3. Check available disk space (50MB needed)

**PDF Upload Error (413):**
- File exceeds 50MB limit
- Compress or split PDF
- Use online compressor

**Quiz Not Loading:**
1. Refresh page
2. Check internet connection
3. Clear localStorage
4. Try different browser

**Chat Response Slow:**
1. Check API key limits
2. Try simpler query
3. Check backend status
4. Contact support with request ID

---

## 🤝 Contributing

### Development Workflow

1. Fork repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and write tests
4. Commit: `git commit -m "Add amazing feature"`
5. Push and submit pull request

### Code Standards

**JavaScript:** ESLint, const/let, arrow functions, async/await
**Python:** PEP 8, type hints, docstrings, Black formatter
**PHP:** PSR-12, type hints, DocBlocks

---

## NCTB Textbook Q&A Assistant

Amplify also includes a dedicated Retrieval-Augmented Generation (RAG) chatbot for Class 11-12 NCTB textbook questions. The assistant grounds its answers in the selected textbook rather than relying only on the language model's general knowledge. It supports English and ICT materials and is available as a standalone deployed application on Hugging Face:

**Live chatbot:** [NCTB Textbook Q&A Assistant on Hugging Face](https://huggingface.co/spaces/addyjeddy/book-chatbot-better/tree/main)

### Capabilities

- **Multi-subject support:** English and ICT textbooks
- **Hybrid retrieval:** Combines semantic similarity from FAISS with keyword matching to retrieve relevant textbook passages
- **LLM inference:** Uses Groq-hosted models, including GPT-OSS 120B, with a configurable model mapping
- **English-language processing:** Grounds answers in the selected textbook
- **Voice input:** Uses the browser Web Speech API for speech-to-text input
- **Conversation history:** Saves conversations with timestamps and restores them across browser sessions
- **Revision export:** Generates PDF revision material from chat history
- **Graceful failures:** Retries transient API errors with exponential backoff and provides a useful response when a retrieval or model service is unavailable

### RAG architecture

```mermaid
flowchart LR
   Q[Student question] --> S[Subject selection]
   S --> R1[FAISS semantic search]
   S --> R2[Keyword matching]
   R1 --> M[Merge and rank context]
   R2 --> M
   M --> C[Textbook-grounded prompt]
   C --> G[Groq LLM inference]
   G --> H[Save chat history]
   H --> A[Display answer or export PDF]
```

The retrieval process searches the FAISS index for the selected textbook and combines the best semantic results with keyword matches. The resulting context is truncated to a controlled size before it is passed to the LLM, which reduces irrelevant context and helps keep answers grounded in NCTB content. The default retrieval configuration is:

| Parameter | Value | Purpose |
|-----------|-------|---------|
| Semantic results (`semantic_k`) | 3 | Top vector-similarity matches |
| Keyword results (`keyword_n`) | 2 | Additional exact or lexical matches |
| Combined results (`max_results`) | 4 | Maximum context documents sent onward |
| Per-document limit (`truncate_chars`) | 800 characters | Keeps individual passages focused |
| Total context limit (`context_chars`) | 2,000 characters | Bounds the final prompt context |

### Technology stack and index structure

- **Interface:** Gradio with custom responsive dark-theme CSS
- **Embeddings:** `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`
- **Vector database:** FAISS (`faiss-cpu`) with 384-dimensional embeddings
- **Language model:** Groq API using `openai/gpt-oss-120b` by default
- **PDF generation:** FPDF with embedded font support
- **Speech recognition:** Browser-side Web Speech API
- **Conversation persistence:** JSON-backed history and browser session persistence

Each textbook index contains document embeddings, source and chapter metadata, and a document store containing the original passage text. The expected index directories are:

- `nctb_english_index_v2` - English textbook
- `nctb_ict_index_better` - ICT textbook

### Running the chatbot locally

The standalone chatbot requires Python 3.8 or newer, a Groq API key, and approximately 2-4 GB of disk space for the textbook indexes. Install its dependencies and configure the key before starting Gradio:

```bash
pip install gradio langchain-community langchain-huggingface langchain-groq faiss-cpu fpdf sentence-transformers
export GROQ_API_KEY="your-groq-api-key-here"
python app.py
```

The local interface is served at `http://127.0.0.1:7860`. Place the pre-built FAISS indexes in the application root before asking questions. The active model can be changed through the model mapping, for example:

```python
GROQ_MODELS = {
   "GPT-OSS 120B": "openai/gpt-oss-120b",
}
```

### Typical interaction flow

1. The student selects a textbook and types or speaks a question.
2. Hybrid retrieval searches the selected FAISS index.
3. Retrieved passages are assembled into a grounded system prompt.
4. Groq generates the answer using the chosen model.
5. The question and answer are saved to history for later review or PDF export.

For questions outside the selected textbook, students can rephrase the question or choose a more relevant subject. If an index cannot be loaded, check that its directory is in the application root and that the process has read permission. If responses are slow, the first request may be loading the embedding model and FAISS index into memory.

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](LICENSE) file for details.

---

## 📧 Contact & Support

- **Email**: support@amplifywebsite.com
- **Documentation**: docs.amplifywebsite.com
- **GitHub Issues**: github.com/amplify/website/issues
- **Community Forum**: forum.amplifywebsite.com

---

## 🙏 Acknowledgments

- Built with ❤️ for education in Bangladesh
- Supported by: Banglalink, Applink Store, hSenid Mobile, AceIT
- Featured in: Aspire Institute, Dhaka Tribune, Prothom Alo, The Business Standard
- Special thanks to all educators and students using Amplify

---

**Last Updated:** September 2, 2025  
**Version:** 1.0.0  
**Maintainer:** Amplify Development Team

---

## Flutter Mobile App

Amplify is also available as a dedicated Flutter and Dart mobile application. The app is designed as an offline-first virtual learning lab that helps students **visualize, not memorize**. It extends the web platform with mobile-friendly interactive simulations, programming tools, AI learning assistance, exam preparation resources, educational content, and services for students with limited internet access.

**Mobile app source repository:** [github.com/Adnann07/Amplifyapp](https://github.com/Adnann07/Amplifyapp)
**Download/access the app:** [amplifywebsite-production.up.railway.app](https://amplifywebsite-production.up.railway.app)

### Mobile app capabilities

#### Virtual learning labs

- **Physics Lab:** Interactive simulations for mechanics, optics, electricity, and related concepts
- **Chemistry Lab:** Molecular models, reaction simulations, and periodic-table exploration
- **Biology Lab:** 3D organ models, cell structures, and ecosystem visualizations
- **Math Lab:** Graph plotters, geometry tools, and equation solvers
- **ICT Lab:** Programming exercises with syntax highlighting and code execution
- **Mechanical engineering visuals:** 3D components, assemblies, operation animations, and engineering diagrams
- **Robotics knowledge:** Introductory robotics concepts, robot programming, and real-world applications

#### DSA and programming

- Step-by-step data structure and algorithm visualizations
- Demonstrations of arrays, linked lists, trees, and graphs
- Complexity analysis tools
- Built-in C compiler for writing, compiling, and running programs
- More than 30 ICT fundamentals exercises and tutorials
- Syntax highlighting, error detection, sample programs, and guided learning materials

#### AI-powered learning tools

- AI assistant powered by the Llama API for context-aware explanations
- Automatic study-notes generation from any topic
- Personalized flashcard generation
- AI-generated quizzes for practice and revision
- Homework support, concept clarification, and interactive question-and-answer sessions

#### Exam preparation and educational content

- Free HSC exam preparation content and topic-based quizzes
- MBBS flashcards for medical terminology and concepts
- IELTS preparation exams
- Vocabulary builder with more than 300 essential words
- English grammar, comprehension, and writing foundations
- Educational audiobooks and subject-specific audio content
- Text-to-speech support for learning materials
- Progress tracking and learning analytics

#### Academic, rural, and engagement services

- University admission updates, deadlines, and scholarship opportunities
- Emergency management lessons covering disaster preparedness, first aid, and safety
- Gamified learning for younger students in Classes 1-5
- Brain exercises for mental math, memory, and reaction time
- Leaderboards, achievement badges, and engaging learning paths
- SMS services for students without reliable internet access or smartphones, including exam suggestions, daily vocabulary, scientific facts, study tips, and mnemonics
- OTP-based subscription verification, premium-content access, and subscription plans

### Flutter application architecture

```mermaid
flowchart TB
   U[Student using Flutter app] --> P[Provider state management]
   P --> F[Feature modules]
   F --> L[Virtual labs and 3D content]
   F --> AI[AI assistant, notes, flashcards, quizzes]
   F --> E[Exam resources and gamification]
   F --> SMS[SMS, OTP, and subscription services]
   P --> C[Offline cache and shared_preferences]
   F --> H[HTTP REST client]
   H --> PHP[Custom PHP API]
   PHP --> AWS[AWS EC2 Ubuntu server]
   AWS --> FS[JSON and text file storage]
   F --> T[Third-party services]
   T --> LL[Llama API]
   T --> AP[Applink SMS and subscription APIs]
   T --> CAAS[CaaS billing and messaging API]
```

The app follows a modular client-server architecture. Flutter provides the cross-platform UI, while Dart feature modules communicate with a custom PHP backend through RESTful HTTP requests. Provider coordinates shared application state, loading states, and feature-level updates. Content that is needed repeatedly is cached locally, allowing core learning experiences to remain available when connectivity is intermittent or unavailable.

The backend is hosted on an AWS EC2 Ubuntu environment and uses local JSON/text storage for the app's server-side records. External services provide AI generation through the Llama API, OTP and SMS delivery through Applink, subscription operations through the Applink subscription service, and carrier billing or messaging through the CaaS API.

### Flutter technology stack

| Layer | Technology | Responsibility |
|------|------------|----------------|
| Application framework | Flutter and Dart | Cross-platform mobile interface and application logic |
| State management | Provider | Reactive state, service access, and feature coordination |
| Networking | `http` package | REST API requests to the PHP backend and external services |
| Web parsing | `html` package | Parsing web-based academic and opportunity content |
| Local persistence | `shared_preferences` | Lightweight settings, cached content, and offline state |
| 3D content | `model_viewer_plus` | Displaying interactive 3D educational models |
| Embedded content | `webview_flutter` | Presenting compatible web learning experiences inside the app |
| Speech | `flutter_tts` | Reading learning content aloud |
| Device input | `sensors_plus` | Accessing device sensor data for interactive experiences |
| Charts | `fl_chart` | Progress tracking and data visualization |
| Analytics | `firebase_core`, `firebase_analytics` | Firebase initialization and usage analytics |

### Offline-first design

Offline support is a core part of the mobile experience rather than an afterthought. The app can cache downloaded learning content and lightweight user preferences through `shared_preferences`. Students can therefore revisit selected lessons, basic lab material, quizzes, and other downloaded resources without maintaining a continuous connection. When the connection returns, network-backed features such as AI assistance, live academic updates, SMS operations, and subscription actions can communicate with their respective services.

### Getting started with the Flutter app

#### Prerequisites

- Flutter SDK `>=3.7.2 <4.0.0`
- Android Studio or VS Code with Flutter extensions
- Android device or emulator with minimum SDK 21

#### Installation and development

```bash
git clone https://github.com/Adnann07/Amplifyapp.git
cd Amplifyapp
flutter pub get
flutter run
```

To create a release APK:

```bash
flutter build apk --release
```

For the ready-to-use app or the latest distribution instructions, visit the live Amplify website: [amplifywebsite-production.up.railway.app](https://amplifywebsite-production.up.railway.app).

### Typical mobile workflow

1. Open the app and choose a subject or learning area.
2. Explore a virtual lab, DSA visualization, programming exercise, or academic resource.
3. Use the AI assistant to ask questions, create notes, generate flashcards, or build quizzes.
4. Download relevant content for later offline study.
5. Practice with HSC, IELTS, MBBS, vocabulary, or gamified learning resources.
6. Use SMS services when smartphone or internet access is limited.
7. Authenticate with OTP and subscribe when premium content or services are required.
