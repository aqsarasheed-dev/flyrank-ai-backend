import { findAllPosts, getPostAndIncrementViews } from '@/repositories/postRepository';

// 1. Get all posts
export async function getAllPosts() {
  console.log("📋 Service: Getting all posts...");
  return await findAllPosts();
}

// 2. Get a single post by ID (with view count logic)
export async function getPostById(id) {
  console.log(`📋 Service: Processing post ID ${id}...`);

  // Call the repository (THIS DOES THE VIEW INCREMENT)
  const post = await getPostAndIncrementViews(id);
  
  if (!post) {
    throw new Error('Post not found');
  }

  // BUSINESS LOGIC: Check if views exceed threshold (3)
  const THRESHOLD = 3;
  if (post.view_count >= THRESHOLD) {
    // This is the "Notification" logic required by the assignment!
    console.log(`🔥🔥🔥 NOTIFICATION: Post "${post.title}" has reached ${post.view_count} views!`);
  }

  return post;
}