import sys, json, faiss, numpy as np
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('all-MiniLM-L6-v2')
index = faiss.read_index('voice/vector-db/products.index')
products = json.load(open('voice/data/products.json'))

query = sys.argv[1]
vec = model.encode([query]).astype('float32')
D, I = index.search(vec, 1)
best = products[I[0][0]]
print(json.dumps({ **best, 'score': float(D[0][0]) }))