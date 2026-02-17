"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"
import { Plus, X, BarChart3, Zap, TrendingUp, Users, Trash2 } from "lucide-react";

type PollData = {
  id: string;
  question: string;
  created_at: string;
  options: Array<{
    id: string;
    text: string;
    votes_count: number;
  }>;
};

export default function HomePage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [polls, setPolls] = useState<PollData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch past polls
  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const { data: pollsData, error: pollsError } = await supabase
          .from("polls")
          .select("id, question, created_at")
          .order("created_at", { ascending: false })
          .limit(10);

        if (pollsError) throw pollsError;

        // Fetch options for each poll
        const pollsWithOptions = await Promise.all(
          (pollsData || []).map(async (poll) => {
            const { data: optionsData } = await supabase
              .from("options")
              .select("id, text, votes_count")
              .eq("poll_id", poll.id)
              .order("created_at", { ascending: true });

            return {
              ...poll,
              options: optionsData || [],
            };
          })
        );

        setPolls(pollsWithOptions);
      } catch (err) {
        console.error("Error fetching polls:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPolls();
  }, []);

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const createPoll = async () => {
    setError("");

    // Validation
    if (!question.trim()) {
      setError("Please enter a question");
      return;
    }

    const validOptions = options.filter((opt) => opt.trim());
    if (validOptions.length < 2) {
      setError("Please provide at least 2 options");
      return;
    }

    setIsCreating(true);

    try {
      // Create poll
      const { data: poll, error: pollError } = await supabase
        .from("polls")
        .insert({ question: question.trim() })
        .select()
        .single();

      if (pollError) throw pollError;

      // Create options
      const optionsData = validOptions.map((text) => ({
        poll_id: poll.id,
        text: text.trim(),
        votes_count: 0,
      }));

      const { error: optionsError } = await supabase
        .from("options")
        .insert(optionsData);

      if (optionsError) throw optionsError;

      // Navigate directly to the poll page
      router.push(`/poll/${poll.id}`);
      
      // Reset form
      setQuestion("");
      setOptions(["", ""]);
    } catch (err) {
      console.error("Error creating poll:", err);
      setError("Failed to create poll. Please try again.");
      setIsCreating(false);
    }
  };

  const deletePoll = async (pollId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Are you sure you want to delete this poll?")) {
      return;
    }

    try {
      // Delete votes first
      await supabase
        .from("votes")
        .delete()
        .eq("poll_id", pollId);

      // Delete options
      await supabase
        .from("options")
        .delete()
        .eq("poll_id", pollId);

      // Delete poll
      const { error } = await supabase
        .from("polls")
        .delete()
        .eq("id", pollId);

      if (error) throw error;

      // Remove from local state
      setPolls(polls.filter(p => p.id !== pollId));
    } catch (err) {
      console.error("Error deleting poll:", err);
      alert("Failed to delete poll");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-blue-50 to-white">
      {/* Navigation Header */}
      <div className="bg-white border-b border-blue-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-blue-600">PollSync</h1>
            </div>
            <p className="text-sm text-slate-600">Real-time instant polls</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Create & Share Polls
          </h2>
          <p className="text-lg text-slate-600">
            Fast, simple polling with real-time results
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Create Poll Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 sticky top-24">
              <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Create Poll
              </h3>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Question Input */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Question
                  </label>
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    placeholder="What's on your mind?"
                    className="w-full px-4 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black placeholder-gray-500"
                    maxLength={500}
                  />
                  <p className="text-xs text-slate-500 mt-1">{question.length}/500</p>
                </div>

                {/* Options */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Options
                  </label>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {options.map((option, index) => (
                      <div key={index} className="flex gap-2">
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(index, e.target.value)}
                          placeholder={`Option ${index + 1}`}
                          className="flex-1 px-3 py-2 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-black placeholder-gray-500"
                          maxLength={100}
                        />
                        {options.length > 2 && (
                          <button
                            onClick={() => removeOption(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {options.length < 10 && (
                    <button
                      onClick={addOption}
                      className="mt-2 w-full flex items-center justify-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm py-2 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                      type="button"
                    >
                      <Plus className="w-4 h-4" />
                      Add Option
                    </button>
                  )}
                </div>

                {/* Create Button */}
                <button
                  onClick={createPoll}
                  disabled={isCreating}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 rounded-lg transition-colors disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create Poll
                    </>
                  )}
                </button>


              </div>
            </div>
          </div>

          {/* Right Column - Past Polls */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Recent Polls
              </h3>
              {polls.length > 0 && (
                <span className="text-sm text-slate-500">{polls.length} polls</span>
              )}
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="w-10 h-10 border-3 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                  <p className="text-slate-600">Loading polls...</p>
                </div>
              </div>
            ) : polls.length === 0 ? (
              <div className="bg-white rounded-2xl border border-blue-100 p-8 text-center">
                <BarChart3 className="w-12 h-12 text-blue-200 mx-auto mb-3" />
                <p className="text-slate-600">No polls yet. Create one to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map((poll) => {
                  const totalVotes = poll.options.reduce(
                    (sum, opt) => sum + opt.votes_count,
                    0
                  );

                  return (
                    <div
                      key={poll.id}
                      onClick={() => router.push(`/poll/${poll.id}`)}
                      className="bg-white rounded-2xl shadow-sm border border-blue-100 hover:border-blue-300 hover:shadow-md p-6 cursor-pointer transition-all relative"
                    >
                      {/* Delete Button */}
                      <button
                        onClick={(e) => deletePoll(poll.id, e)}
                        className="absolute top-4 right-4 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete poll"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Poll Question */}
                      <h4 className="text-lg font-semibold text-slate-800 mb-4 line-clamp-2 pr-8">
                        {poll.question}
                      </h4>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mb-4 text-sm text-slate-600">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4 text-blue-600" />
                          <span>{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-4 h-4 text-blue-600" />
                          <span>{poll.options.length} options</span>
                        </div>
                      </div>

                      {/* Options Preview */}
                      <div className="space-y-2">
                        {poll.options.map((option) => {
                          const percentage =
                            totalVotes > 0
                              ? Math.round((option.votes_count / totalVotes) * 100)
                              : 0;

                          return (
                            <div key={option.id} className="space-y-1">
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-slate-700 truncate flex-1">
                                  {option.text}
                                </span>
                                <span className="text-blue-600 font-semibold ml-2">
                                  {percentage}%
                                </span>
                              </div>
                              <div className="w-full bg-blue-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-300"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* View Button */}
                      <button className="mt-4 w-full py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium rounded-lg transition-colors">
                        View & Vote
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}