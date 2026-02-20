import sys
import os
import json
import faiss
import pickle
import numpy as np
from dotenv import load_dotenv
from groq import Groq

from embeddings import get_embedding

# ---------------- LOAD ENV ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY not found in .env")

# ---------------- GROQ CLIENT ----------------
client = Groq(api_key=GROQ_API_KEY)
MODEL_NAME = "llama-3.1-8b-instant"


# ---------------- VECTOR STORE ----------------
def load_vector_store(doc_id):
    vector_path = os.path.join(BASE_DIR, "vector_store", f"faiss_index_{doc_id}")
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
    distances, indices = index.search(np.array([query_embedding]), k)

    # Fetch chunks
    chunks = [metadata["chunks"][i] for i in indices[0]]

    return chunks


# ---------------- GROQ GENERATION ----------------
def groq_generate(system_prompt, user_prompt, call_type="GENERAL"):
    # Log what's being sent to Groq
    print(f"\n{'=' * 60}", file=sys.stderr)
    print(f"🔵 Groq API Call: {call_type}", file=sys.stderr)
    print(f"{'=' * 60}", file=sys.stderr)

    # Extract query/question from user_prompt if it contains "Question:"
    query_sent = None
    context_sent = None
    if "Question:" in user_prompt:
        parts = user_prompt.split("Question:")
        if len(parts) > 1:
            context_part = (
                parts[0].replace("Context:", "").strip()
                if "Context:" in parts[0]
                else None
            )
            query_part = parts[1].strip()
            if context_part:
                context_sent = context_part
                query_sent = query_part.split("\n")[0].strip()
            else:
                query_sent = query_part.split("\n")[0].strip()

    if query_sent:
        print(f"📝 QUERY SENT TO Groq: {query_sent[:200]}...", file=sys.stderr)

    if context_sent:
        context_length = len(context_sent)
        print(
            f"📄 CONTEXT SENT (NOT FULL PDF): {context_length} characters",
            file=sys.stderr,
        )
        print(f"   First 200 chars: {context_sent[:200]}...", file=sys.stderr)
        print(f"   ✅ This is RETRIEVED CHUNKS, NOT the full PDF", file=sys.stderr)
    else:
        # Check if it's facts/key points
        if "Facts:" in user_prompt:
            print(
                f"📋 KEY POINTS SENT (extracted facts, not full PDF)", file=sys.stderr
            )
        else:
            print(f"📝 Only query/question sent (no context)", file=sys.stderr)

    # Log the request data to stderr
    request_data = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.2,
    }
    print(f"\n📤 Full Request Data:", file=sys.stderr)
    print(
        json.dumps(
            {
                "model": request_data["model"],
                "system_prompt_length": len(system_prompt),
                "user_prompt_length": len(user_prompt),
                "temperature": request_data["temperature"],
            },
            indent=2,
        ),
        file=sys.stderr,
    )
    print(f"{'=' * 60}\n", file=sys.stderr)

    # Make the actual API call
    try:
        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
        )

        # Log the response to stderr
        print(f"\n{'=' * 60}", file=sys.stderr)
        print(f"📥 Groq API Response", file=sys.stderr)
        print(f"{'=' * 60}", file=sys.stderr)
        print(
            json.dumps(
                {
                    "id": response.id,
                    "model": response.model,
                    "usage": {
                        "prompt_tokens": response.usage.prompt_tokens,
                        "completion_tokens": response.usage.completion_tokens,
                        "total_tokens": response.usage.total_tokens,
                    },
                    "choices": [
                        {
                            "message": {
                                "role": response.choices[0].message.role,
                                "content": response.choices[0].message.content[:200]
                                + "..."
                                if len(response.choices[0].message.content) > 200
                                else response.choices[0].message.content,
                            },
                            "finish_reason": response.choices[0].finish_reason,
                        }
                    ],
                },
                indent=2,
            ),
            file=sys.stderr,
        )
        print(f"{'=' * 60}\n", file=sys.stderr)

        return response.choices[0].message.content.strip()

    except Exception as e:
        error_type = type(e).__name__
        print(f"\n🚨 Groq API Error: {error_type}", file=sys.stderr)
        print(f"Message: {str(e)}", file=sys.stderr)

        # Handle specific Groq errors
        if hasattr(e, "error") and e.error:
            error_details = e.error
            print(
                f"Error Details: {json.dumps(error_details, indent=2)}", file=sys.stderr
            )

            if error_details.get("type") in ["rate_limit_error", "insufficient_quota"]:
                raise RuntimeError("QUOTA_EXCEEDED")
            elif error_details.get("type") == "invalid_request_error":
                if "Your API key is invalid" in str(e):
                    raise RuntimeError("INVALID_API_KEY")

        # For other errors, return a generic error
        raise RuntimeError(f"API_ERROR: {str(e)}")


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

    return groq_generate(system_prompt, user_prompt, "GROUNDED_ANSWER")


# ---------------- FACT EXTRACTION ----------------
def extract_key_points(answer, max_points=3):
    sentences = [
        s.strip() for s in answer.replace("\n", " ").split(".") if len(s.strip()) > 30
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

    return groq_generate(system_prompt, user_prompt, "REFINE_ANSWER")


# ---------------- MAIN RAG PIPELINE ----------------
def answer_question(question, doc_id):
    print(f"\n{'=' * 60}", file=sys.stderr)
    print(f"🚀 STARTING RAG QUERY PROCESS", file=sys.stderr)
    print(f"{'=' * 60}", file=sys.stderr)
    print(f"❓ ORIGINAL QUESTION: {question}", file=sys.stderr)
    print(f"📚 Document ID: {doc_id}", file=sys.stderr)

    chunks = retrieve_chunks(question, doc_id)
    context = "\n".join(chunks)

    print(f"\n📦 RETRIEVED CHUNKS INFO:", file=sys.stderr)
    print(f"   Number of chunks: {len(chunks)}", file=sys.stderr)
    print(f"   Total context length: {len(context)} characters", file=sys.stderr)
    print(
        f"   ✅ Sending ONLY these {len(chunks)} relevant chunks to OpenAI",
        file=sys.stderr,
    )
    print(f"   ❌ NOT sending the full PDF", file=sys.stderr)
    print(
        f"   First chunk preview: {chunks[0][:150] if chunks else 'N/A'}...",
        file=sys.stderr,
    )
    print(f"{'=' * 60}\n", file=sys.stderr)

    raw_answer = grounded_answer(question, context)

    if raw_answer.lower().startswith("answer not found"):
        return {
            "answer": raw_answer,
            "key_points": [],
            "sources": chunks,
            "doc_id": doc_id,
        }

    key_points = extract_key_points(raw_answer)
    # print(key_points)
    final_answer = refine_answer(question, key_points)
    # print(final_answer)
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
