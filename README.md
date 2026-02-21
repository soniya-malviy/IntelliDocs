# 📘 IntelliDocs – AI-Powered RAG Document Assistant

IntelliDocs is a **full-stack Retrieval-Augmented Generation (RAG) system** that allows users to upload PDF documents and ask natural-language questions to receive **accurate, source-grounded answers**.

The project combines a **MERN stack backend**, a **modern React frontend**, and a **Python-based AI pipeline** using embeddings and FAISS for semantic search.

DEMO VIDEO: https://www.loom.com/share/869179c03b3e437da3b7848710e09319

## Features

- Secure user authentication using JWT
- Upload and manage PDF documents
- AI-powered document question answering (RAG)
- Semantic search using vector embeddings
- Source-aware answers (reduces hallucinations)
- Chat-style modern UI
- Multi-user document isolation



## How It Works (RAG Pipeline)

```
PDF Upload
↓
Text Extraction
↓
Text Chunking
↓
Embeddings Generation
↓
FAISS Vector Store
↓
User Question
↓
Similarity Search (Top-K Chunks)
↓
LLM Answer + Sources

```



## Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Axios
- Lucide Icons

### Backend
- Node.js
- Express.js
- MongoDB Atlas
- Mongoose
- JWT Authentication
- Multer (file uploads)

### AI / Python
- Python 3.11
- LangChain
- FAISS (faiss-cpu)
- Sentence Transformers
- PyPDF



## 📁 Project Structure

```text
IntelliDocs/
├── Backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── models/
│   │   ├── middleware/
│   │   └── server.js
│   └── uploads/
│
├── ai-agent/
│   ├── index_documents.py
│   ├── embeddings.py
│   ├── query_rag.py
│   ├── utils/
│   │   └── pdf_loader.py
│   └── vector_store/
│
├── Frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── api/
│   │   └── context/
│   └── vite.config.js
│
└── README.md

```


## ⚙️ Installation & Setup

### Clone Repository

```bash
git clone https://github.com/soniya-malviy/IntelliDocs.git
cd IntelliDocs
```

Backend Setup

```
cd Backend
npm install
```

Create .env file:

```
PORT=5001
MONGO_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
NODE_ENV=development
```

Run backend:

```
npm run dev
```

Python AI Agent Setup

```
cd ai-agent
python3.11 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

Required libraries:

```
pip install langchain langchain-community langchain-text-splitters
pip install sentence-transformers
pip install pypdf
pip install faiss-cpu
```

Frontend Setup

```
cd Frontend
npm install
npm run dev
```


## Authentication Flow

  - User registers and logs in
  - JWT token is generated
  - Token is sent in Authorization header
  - Protected routes verify JWT



## Document Upload Flow

```
User → Upload PDF → Backend (Multer)
→ File saved → Metadata stored in MongoDB
→ Python indexing triggered
→ FAISS vector store created
```

## Question Answering Flow

```sql
User Question
→ Convert question to embedding
→ FAISS similarity search
→ Retrieve top-K chunks
→ Inject chunks into prompt
→ LLM generates answer
→ Return answer + sources
```

## Example Embedding Code

```python
MODEL_NAME = "llama-3.1-8b-instant"
```


## Deployment

  - Frontend: Vercel
  - Backend: Render
  - Database: MongoDB Atlas
  
Note: CORS configured to allow Vercel frontend domain.


 
## Author

**Soniya Malviya**
**Full-Stack & AI Developer**
