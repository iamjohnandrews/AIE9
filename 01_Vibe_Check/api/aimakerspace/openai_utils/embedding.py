from openai import AsyncOpenAI, OpenAI
from typing import List
import os
import asyncio


class EmbeddingModel:
    def __init__(self, embeddings_model_name: str = "text-embedding-3-small", batch_size: int = 1024):
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.async_client = AsyncOpenAI()
        self.client = OpenAI()

        if self.openai_api_key is None:
            raise ValueError(
                "OPENAI_API_KEY environment variable is not set. Please set it to your OpenAI API key."
            )
        self.embeddings_model_name = embeddings_model_name
        self.batch_size = batch_size

    async def async_get_embeddings(self, list_of_text: List[str]) -> List[List[float]]:
        batches = [list_of_text[i:i + self.batch_size] for i in range(0, len(list_of_text), self.batch_size)]
        
        async def process_batch(batch):
            embedding_response = await self.async_client.embeddings.create(
                input=batch, model=self.embeddings_model_name
            )
            return [embeddings.embedding for embeddings in embedding_response.data]
        
        results = await asyncio.gather(*[process_batch(batch) for batch in batches])
        return [embedding for batch_result in results for embedding in batch_result]

    async def async_get_embedding(self, text: str) -> List[float]:
        embedding = await self.async_client.embeddings.create(
            input=text, model=self.embeddings_model_name
        )
        return embedding.data[0].embedding

    def get_embeddings(self, list_of_text: List[str]) -> List[List[float]]:
        embedding_response = self.client.embeddings.create(
            input=list_of_text, model=self.embeddings_model_name
        )
        return [embeddings.embedding for embeddings in embedding_response.data]

    def get_embedding(self, text: str) -> List[float]:
        embedding = self.client.embeddings.create(
            input=text, model=self.embeddings_model_name
        )
        return embedding.data[0].embedding
