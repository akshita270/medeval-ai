export interface ChatSource {
  id: string;
  docId: string;
  chunkId: string;
  snippet: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  blocked?: boolean;
}
