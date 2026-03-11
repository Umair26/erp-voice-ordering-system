
from sentence_transformers import SentenceTransformer
import faiss
import json
import numpy as np

# Load embedding model
model = SentenceTransformer('all-MiniLM-L6-v2')

# Load products
products = json.load(open('../voice/data/products.json'))

# Combine English + German titles
texts = [f"{p['item_title']} {p['item_title_DE']}" for p in products]

# Generate embeddings (float32)
embeddings = model.encode(texts).astype('float32')

# Build FAISS index
index = faiss.IndexFlatL2(embeddings.shape[1])
index.add(embeddings)

# Save index
faiss.write_index(index, '../voice/vector-db/products.index')

print(f'Index built: {len(products)} items')
