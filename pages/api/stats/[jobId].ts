import { NextApiRequest, NextApiResponse } from "next";
import { createPagesServerClient } from "@supabase/auth-helpers-nextjs";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow GET requests
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Get job ID from the URL
  const { jobId } = req.query;

  if (!jobId || Array.isArray(jobId)) {
    return res.status(400).json({ error: "Invalid job ID" });
  }

  // Create Supabase server client
  const supabase = createPagesServerClient({ req, res });

  // Check if user is authenticated
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // Fetch stats for the specific job
    const { data, error } = await supabase
      .from("log_stats")
      .select("*")
      .eq("job_id", jobId)
      .eq("user_id", session.user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Job not found" });
      }
      throw error;
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching job stats:", error);
    return res.status(500).json({ error: "Failed to fetch job statistics" });
  }
}
