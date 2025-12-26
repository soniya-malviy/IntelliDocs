import sys
import os
import json
import faiss
import pickle
import numpy as np
from dotenv import load_dotenv
from openai import OpenAI

from embeddings import get_embedding

# ---------------- LOAD ENV ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not found in .env")

# ---------------- OPENAI CLIENT ----------------
client = OpenAI(api_key=OPENAI_API_KEY)
MODEL_NAME = "gpt-4o-mini"

# ---------------- VECTOR STORE ----------------
def load_vector_store(doc_id):
    vector_path = os.path.join(
        BASE_DIR, "vector_store", f"faiss_index_{doc_id}"
    )
    meta_path = f"{vector_path}_meta.pkl"

    if not os.path.exists(vector_path) or not os.path.exists(meta_path):
        raise FileNotFoundError(f"Vector store not found for doc_id: {doc_id}")

    index = faiss.read_index(vector_path)
    with open(meta_path, "rb") as f:
        metadata = pickle.load(f)

    return index, metadata


def retrieve_chunks(question, doc_id, k=3):
    # Embed query
    query_embedding = get_embedding(question)

    # Load document-specific index
    index, metadata = load_vector_store(doc_id)

    # Vector search
    distances, indices = index.search(
        np.array([query_embedding]), k
    )

    # Fetch chunks
    chunks = [
        metadata["chunks"][i] for i in indices[0]
    ]

    return chunks


# ---------------- OPENAI GENERATION ----------------
def openai_generate(system_prompt, user_prompt):
    response = client.chat.completions.create(
        model=MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0.2,
    )
    return response.choices[0].message.content.strip()


# ---------------- STAGE 1: GROUNDED ANSWER ----------------
def grounded_answer(question, context):
    system_prompt = (
        "You are a strict document-based assistant. "
        "You must answer ONLY from the provided context. "
        "Do not use external knowledge."
    )

    user_prompt = f"""
Context:
{context}

Question:
{question}

If the answer is not present in the context, reply exactly:
Answer not found in the document.

Otherwise, write ONE clear factual paragraph.
"""

    return openai_generate(system_prompt, user_prompt)


# ---------------- FACT EXTRACTION ----------------
def extract_key_points(answer, max_points=3):
    sentences = [
        s.strip()
        for s in answer.replace("\n", " ").split(".")
        if len(s.strip()) > 30
    ]
    return sentences[:max_points]


# ---------------- STAGE 2: FINAL REFINEMENT ----------------
def refine_answer(question, key_points):
    system_prompt = (
        "You are an expert technical writer. "
        "Rewrite answers clearly and professionally using only given facts."
    )

    facts = "\n".join([f"- {p}" for p in key_points])

    user_prompt = f"""
Question:
{question}

Facts:
{facts}

Write a clean, well-structured final answer.
Do NOT add new information.
"""

    return openai_generate(system_prompt, user_prompt)


# ---------------- MAIN RAG PIPELINE ----------------
def answer_question(question, doc_id):
    chunks = retrieve_chunks(question, doc_id)
    context = "\n".join(chunks)

    raw_answer = grounded_answer(question, context)

    if raw_answer.lower().startswith("answer not found"):
        return {
            "answer": raw_answer,
            "key_points": [],
            "sources": chunks,
            "doc_id": doc_id,
        }

    key_points = extract_key_points(raw_answer)
    final_answer = refine_answer(question, key_points)

    return {
        "answer": final_answer,
        "key_points": key_points,
        "sources": chunks,
        "doc_id": doc_id,
    }


# ---------------- ENTRY POINT ----------------
if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise RuntimeError("Usage: python query_rag.py <question> <doc_id>")

    question = sys.argv[1]
    doc_id = sys.argv[2]

    result = answer_question(question, doc_id)
    print(json.dumps(result, ensure_ascii=False))
