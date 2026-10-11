---
name: NexusChat Firebase security
description: Security expectations for future Firebase Authentication and Firestore integration.
---

Do not use permissive or unauthenticated Firestore access rules. Keep Firebase credentials out of client code.

**Why:** The user explicitly said never to use insecure database rules.

**How to apply:** When adding Firebase to NexusChat, scope reads and writes to authenticated conversation participants and verify unauthorized access is denied before live use.
