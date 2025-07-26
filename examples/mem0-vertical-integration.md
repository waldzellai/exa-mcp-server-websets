# Mem0 Vertical Integration

This document explores how the Exa Websets MCP server could be extended into a vertical using [Mem0](https://docs.mem0.ai) as the persistent memory layer.

Mem0 provides fast semantic memory with support for graph connections between stored items. The "Graph memory" capability explicitly allows you to "connect insights and entities across sessions".

## Storing Webset Rows as Memories

Mem0's `add` API lets you create memories from structured messages. A typical request using the Python SDK looks like:

```python
from mem0 import MemoryClient
client = MemoryClient(api_key="your_api_key")
messages = [
    {"role": "user", "content": "<user-message>"},
    {"role": "assistant", "content": "<assistant-response>"}
]
client.add(messages, user_id="<user-id>", version="v2")
```

The response returns an ID for each new memory.

To make the websets server a Mem0 vertical, each webset row could be converted to a structured message array and stored via this endpoint. Including the webset ID and row metadata in the message allows Mem0 to organize data per collection.

## Building a Knowledge Graph

When memories are added with consistent references (e.g., webset ID, related entities), Mem0's graph features can automatically link them. The client can then query Mem0 to retrieve related memories, effectively producing a knowledge graph of the webset contents. The existing prompts such as `iterative_intelligence` already track relationships between websets and could pass these links to Mem0 as part of each memory.

## Proposed Steps

1. **Add Mem0 client dependency** – install the `mem0ai` package and configure an API key.
2. **Create a new tool** in `src/tools` to send webset rows to the Mem0 API when they are created or updated.
3. **Update prompts** to use Mem0 for cross-webset relationships instead of (or in addition to) the current registry mechanism.
4. **Leverage Mem0's graph queries** to fetch related rows for a given entity, enabling richer analysis workflows.

Integrating Mem0 would give the server persistent memory, faster search over past websets, and automatic graph-based connections between them, turning this codebase into a Mem0 vertical.
