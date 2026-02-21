import sys
import os
import faiss
import pickle
import datetime
from langchain_text_splitters import RecursiveCharacterTextSplitter
from utils.pdf_loader import load_pdf_text
from embeddings import get_embeddings
import sys
import os



# ---------------- PATH SETUP ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.append(BASE_DIR)
VECTOR_DIR = os.path.join(BASE_DIR, "vector_store")
os.makedirs(VECTOR_DIR, exist_ok=True)


def index_pdf(file_path: str, doc_id: str):
    # 1️⃣ Load PDF text
    text = load_pdf_text(file_path)

    # 2️⃣ Chunk text
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=100
    )
    chunks = splitter.split_text(text)

    # 3️⃣ Generate embeddings
    embeddings = get_embeddings(chunks)

    # 4️⃣ Create FAISS index
    dim = len(embeddings[0])
    index = faiss.IndexFlatL2(dim)
    index.add(embeddings)

    # 5️⃣ Document-specific vector store path (ABSOLUTE)
    doc_vector_store = os.path.join(
        VECTOR_DIR,
        f"faiss_index_{doc_id}"
    )

    # 6️⃣ Save FAISS index
    faiss.write_index(index, doc_vector_store)

    # 7️⃣ Save metadata
    metadata = {
        "doc_id": doc_id,
        "file_name": os.path.basename(file_path),
        "chunks": chunks,
        "indexed_at": datetime.datetime.now().isoformat()
    }

    with open(f"{doc_vector_store}_meta.pkl", "wb") as f:
        pickle.dump(metadata, f)

    print("INDEXING_SUCCESS")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python index_documents.py <file_path> <doc_id>")
        sys.exit(1)

    file_path = sys.argv[1]
    doc_id = sys.argv[2]

    index_pdf(file_path, doc_id)
