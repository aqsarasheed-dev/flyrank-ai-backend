import { getAllPosts, getPostById } from '@/services/postService';

export async function GET(request) {
  console.log("🌐 Route: Incoming request to /api/posts");

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let result;

    if (id) {
      console.log(`🌐 Route: Fetching single post with ID ${id}`);
      result = await getPostById(parseInt(id));
    } else {
      console.log(`🌐 Route: Fetching all posts`);
      result = await getAllPosts();
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("🌐 Route Error:", error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}