import numpy as np
from sentence_transformers import SentenceTransformer

# Load model once (important for performance)
_model = SentenceTransformer("all-MiniLM-L6-v2")

def get_embeddings(texts):
    """
    Generate embeddings for a list of texts.
    Returns: np.ndarray (float32)
    """
    embeddings = _model.encode(
        texts,
        show_progress_bar=True,
        convert_to_numpy=True
    )
    return embeddings.astype("float32")


def get_embedding(text):
    """
    Generate embedding for a single query string.
    Returns: np.ndarray (float32)
    """
    embedding = _model.encode(
        text,
        convert_to_numpy=True
    )
    return embedding.astype("float32")
