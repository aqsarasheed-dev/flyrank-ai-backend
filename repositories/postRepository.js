import { supabase } from '@/lib/supabase';

// 1. Get all posts
export async function findAllPosts() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("Repository Error (findAll):", error);
    throw new Error(error.message);
  }
  return data;
}

// 2. Get a single post by ID and INCREMENT views (Safe method)
export async function getPostAndIncrementViews(id) {
  console.log(`📦 Repository: Fetching post ID ${id}...`);

  // Step A: Get the current post
  const { data: post, error: fetchError } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  
  if (fetchError) {
    console.error("Repository Error (fetch):", fetchError);
    throw new Error(fetchError.message);
  }
  
  if (!post) {
    console.log("Repository: Post not found.");
    return null;
  }

  // Step B: Calculate the new count
  const newCount = (post.view_count || 0) + 1;
  console.log(`📦 Repository: Updating view count to ${newCount}...`);

  // Step C: Update the database
  const { data: updatedPost, error: updateError } = await supabase
    .from('posts')
    .update({ view_count: newCount })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (updateError) {
    console.error("Repository Error (update):", updateError);
    throw new Error(updateError.message);
  }
  
  console.log(`📦 Repository: Update successful!`);
  return updatedPost;
}