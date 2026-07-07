# FlyRank Backend AI Engineering Internship - Checkpoint 1

## Project Overview
This repository contains my submission for the **Backend AI Engineering** internship at **FlyRank AI**. I completed the AI Core assignment, which implements four essential patterns for building production-grade AI services.

## Technologies Used
- **Next.js** (API routes)
- **Portkey.ai** (AI Gateway for model routing)
- **Groq** (LLM provider)
- **Zod** (Schema validation)
- **JavaScript**

## What I Built (The 4 Patterns)

### 1. Gateway & Model Swap (`pages/api/ask.js`)
- Calls the AI model through a Portkey gateway
- Model can be swapped with **one line of code** (`@groq-prod/...` → `@anthropic/...`)
- Base endpoint for all AI interactions

 2. Structured Output & Flow Gate (`pages/api/structured.js`)
- Forces the AI to respond in a strict JSON format
- Uses **Zod** to validate the response shape
- Implements the `shouldContinue` flow gate - rejects invalid outputs

 3. Tools & Context (`pages/api/agent.js`)
- AI agent with **3 tools**:
  - `get_user_by_id` - fetch user details
  - `get_users_by_role` - filter by job role
  - `get_product_by_name` - check product stock and price
- Uses **ToolContext** (closures for shared state)
- Input validation at every tool boundary

### 4. Guardrail & Denylist (`pages/api/guarded.js`)
- Lexical guardrail for SQL injection protection
- Strip-before-check and denylist logic
- Blocks dangerous patterns like `DROP`, `DELETE`, `INSERT`
- Catches ~95% of malicious queries with minimal cost

## How to Run This Project

### 1. Clone the Repository
```bash
git clone https://github.com/aqsarasheed-dev/flyrank-ai-backend.git
cd flyrank-ai-backend
 