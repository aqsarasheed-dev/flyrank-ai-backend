// pages/api/agent.js
import { Portkey } from 'portkey-ai';
import { z } from 'zod';

// ------------------------------------------------------------
// 1. OUR "OWN DATA" (A Fake Database)
// ------------------------------------------------------------
const fakeDatabase = {
  users: [
    { id: 1, name: 'Alice', role: 'Engineer', salary: 85000, city: 'New York' },
    { id: 2, name: 'Bob', role: 'Manager', salary: 105000, city: 'London' },
    { id: 3, name: 'Charlie', role: 'Designer', salary: 65000, city: 'Berlin' },
    { id: 4, name: 'Diana', role: 'Engineer', salary: 92000, city: 'Tokyo' },
  ],
  products: [
    { id: 101, name: 'Laptop', price: 1200, inStock: true },
    { id: 102, name: 'Mouse', price: 25, inStock: true },
    { id: 103, name: 'Keyboard', price: 80, inStock: false },
  ]
};

// ------------------------------------------------------------
// 2. TOOL CONTEXT (Shared State)
// ------------------------------------------------------------
const ToolContext = {
  db: fakeDatabase,
  callCount: 0,
  log: (message) => console.log(`[Tool Log] ${message}`),
};

// ------------------------------------------------------------
// 3. ZOD SCHEMAS FOR TOOL INPUT VALIDATION
// ------------------------------------------------------------
const GetUserSchema = z.object({
  userId: z.number().min(1, 'User ID must be at least 1'),
});

const GetUserByRoleSchema = z.object({
  role: z.enum(['Engineer', 'Manager', 'Designer']),
});

const GetProductSchema = z.object({
  productName: z.string().min(1, 'Product name is required'),
});

// ------------------------------------------------------------
// 4. THE TOOL FACTORY (FIXED FORMAT)
//    ✅ Added 'type: "function"' 
//    ✅ Wrapped name/desc/params inside 'function: {...}'
// ------------------------------------------------------------
function createTools(context) {
  // Tool 1: Get a user by ID
  const getUser = {
    type: 'function', // 👈 REQUIRED by Groq/OpenAI
    function: {       // 👈 REQUIRED wrapper
      name: 'get_user_by_id',
      description: 'Get a user from the database by their ID. Returns the user\'s name, role, salary, and city.',
      parameters: {
        type: 'object',
        properties: {
          userId: { type: 'number', description: 'The ID of the user (e.g., 1, 2, 3, 4)' },
        },
        required: ['userId'],
      },
    },
    // Our custom executor (stays outside the 'function' block)
    execute: (args) => {
      const validated = GetUserSchema.parse(args);
      const user = context.db.users.find(u => u.id === validated.userId);
      context.callCount += 1;
      context.log(`get_user_by_id called. Total calls: ${context.callCount}`);
      if (!user) {
        return { error: `User with ID ${validated.userId} not found` };
      }
      return user;
    }
  };

  // Tool 2: Get users by role
  const getUsersByRole = {
    type: 'function',
    function: {
      name: 'get_users_by_role',
      description: 'Get all users who have a specific job role.',
      parameters: {
        type: 'object',
        properties: {
          role: { type: 'string', enum: ['Engineer', 'Manager', 'Designer'], description: 'The job role' },
        },
        required: ['role'],
      },
    },
    execute: (args) => {
      const validated = GetUserByRoleSchema.parse(args);
      const users = context.db.users.filter(u => u.role === validated.role);
      context.callCount += 1;
      context.log(`get_users_by_role called. Total calls: ${context.callCount}`);
      if (users.length === 0) {
        return { error: `No users found with role ${validated.role}` };
      }
      return users;
    }
  };

  // Tool 3: Get product details by name
  const getProduct = {
    type: 'function',
    function: {
      name: 'get_product_by_name',
      description: 'Get product details (price and stock status) by product name.',
      parameters: {
        type: 'object',
        properties: {
          productName: { type: 'string', description: 'The name of the product (e.g., Laptop, Mouse, Keyboard)' },
        },
        required: ['productName'],
      },
    },
    execute: (args) => {
      const validated = GetProductSchema.parse(args);
      const product = context.db.products.find(
        p => p.name.toLowerCase() === validated.productName.toLowerCase()
      );
      context.callCount += 1;
      context.log(`get_product_by_name called. Total calls: ${context.callCount}`);
      if (!product) {
        return { error: `Product "${validated.productName}" not found` };
      }
      return product;
    }
  };

  return [getUser, getUsersByRole, getProduct];
}

// ------------------------------------------------------------
// 5. THE ACTUAL API ENDPOINT
// ------------------------------------------------------------
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST requests are allowed' });
  }

  try {
    const portkey = new Portkey({
      apiKey: process.env.PORTKEY_API_KEY,
    });

    const tools = createTools(ToolContext);
    const userQuestion = req.body.question;

    // First call: Ask Claude to answer, giving it the tools
    const response = await portkey.chat.completions.create({
      model: '@groq-prod/llama-3.3-70b-versatile', // 👈 YOUR GROQ SLUG
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant with access to tools.
          You can use tools to look up information from the company database.
          If a user asks about users, roles, salaries, or products, USE THE TOOLS.
          Never guess information — use the tools to get accurate data.`
        },
        { role: 'user', content: userQuestion }
      ],
      tools: tools, // 👈 Pass the tools (now in the correct format!)
      tool_choice: 'auto',
      max_tokens: 500,
    });

    const message = response.choices[0].message;

    // Check: Did Claude ask to use a tool?
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const toolName = toolCall.function.name;
      const toolArgs = JSON.parse(toolCall.function.arguments);

      // Find the tool by its function name (fixed this lookup)
      const tool = tools.find(t => t.function.name === toolName);
      if (!tool) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      // Execute the tool
      const toolResult = await tool.execute(toolArgs);

      // Second call: Send the tool result back to Claude
      const finalResponse = await portkey.chat.completions.create({
        model: '@groq-prod/llama-3.3-70b-versatile',
        messages: [
          { role: 'user', content: userQuestion },
          message, // Claude's first response (with the tool call)
          {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(toolResult),
          },
        ],
        tools: tools,
        max_tokens: 500,
      });

      return res.status(200).json({
        success: true,
        answer: finalResponse.choices[0].message.content,
        toolUsed: toolName,
        toolResult: toolResult,
        totalToolsCalled: ToolContext.callCount,
      });
    }

    // If Claude didn't use a tool
    res.status(200).json({
      success: true,
      answer: message.content,
      toolUsed: null,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}