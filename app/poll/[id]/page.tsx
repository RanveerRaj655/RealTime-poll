"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Share2, Check, Home, Users, TrendingUp, BarChart3 } from "lucide-react";

type Option = {
  id: string;
  text: string;
  votes_count: number;
};

export default function PollPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [poll, setPoll] = useState<{ question: string } | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Check localStorage if already voted
  useEffect(() => {
    if (!id) return;
    const voted = localStorage.getItem(`poll_voted_${id}`);
    if (voted) {
      setHasVoted(true);
      setSelectedOption(voted);
    }
  }, [id]);

  // Load poll data
  const loadPoll = useCallback(async () => {
    if (!id) return;
    try {
      const { data: pollData, error: pollError } = await supabase
        .from("polls")
        .select("question")
        .eq("id", id)
        .single();

      if (pollError) throw pollError;

      const { data: optionsData, error: optionsError } = await supabase
        .from("options")
        .select("id, text, votes_count")
        .eq("poll_id", id)
        .order("created_at", { ascending: true });

      if (optionsError) throw optionsError;

      setPoll(pollData);
      setOptions(
        (optionsData || []).map((o) => ({
          ...o,
          votes_count: Number(o.votes_count) || 0,
        }))
      );
    } catch (err) {
      console.error("Error loading poll:", err);
      setError("Failed to load poll");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadPoll();
  }, [loadPoll]);

  // Realtime subscription
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`realtime-poll-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "options",
          filter: `poll_id=eq.${id}`,
        },
        (payload) => {
          console.log("Realtime update received:", payload.new);
          setOptions((prev) =>
            prev.map((opt) =>
              opt.id === payload.new.id
                ? { ...opt, votes_count: Number(payload.new.votes_count) || 0 }
                : opt
            )
          );
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const submitVote = async (optionId: string) => {
    if (hasVoted || voting) return;

    setVoting(true);
    setError("");

    try {
      console.log("Submitting vote:", { pollId: id, optionId });

      const response = await fetch(`/api/poll/${id}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_id: optionId }),
      });

      const data = await response.json();
      console.log("API response:", data);

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit vote");
      }

      // Save to localStorage
      localStorage.setItem(`poll_voted_${id}`, optionId);
      setHasVoted(true);
      setSelectedOption(optionId);

      // Update count directly from API response
      if (data.newCount !== undefined) {
        console.log("Updating count to:", data.newCount);
        setOptions((prev) =>
          prev.map((opt) =>
            opt.id === optionId
              ? { ...opt, votes_count: data.newCount }
              : opt
          )
        );
      } else {
        // Fallback: reload from database
        await loadPoll();
      }
    } catch (err: any) {
      console.error("Vote error:", err);
      setError(err.message || "Failed to submit vote");
    } finally {
      setVoting(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate total and percentages
  const totalVotes = options.reduce((sum, opt) => sum + opt.votes_count, 0);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-blue-50 to-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading poll...</p>
        </div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-white via-blue-50 to-white">
        <div className="bg-white rounded-2xl shadow-md border border-blue-100 p-8 text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-2 text-slate-900">Poll Not Found</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            View Other Polls
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 py-8 bg-gradient-to-b from-white via-blue-50 to-white">
      {/* Navigation Header */}
      <div className="bg-white border-b border-blue-100 fixed top-0 left-0 right-0 z-50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/")}
            className="text-slate-600 hover:text-slate-900 flex items-center gap-2 font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2 text-blue-600">
            <BarChart3 className="w-4 h-4" />
            <span className="text-sm font-medium">PollSync</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto mt-20">
        {/* Header */}
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">
            {poll?.question}
          </h1>
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-medium">
                {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
              </span>
            </div>
            {hasVoted && (
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <Check className="w-5 h-5" />
                <span>You voted</span>
              </div>
            )}
            <button
              onClick={copyShareLink}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-blue-600 font-medium transition-colors ml-auto"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4" />
                  Share
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && poll && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Options */}
        <div className="space-y-3 mb-8">
          {options.map((option) => {
            const percentage =
              totalVotes > 0
                ? Math.round((option.votes_count / totalVotes) * 100)
                : 0;
            const isSelected = selectedOption === option.id;

            return (
              <div
                key={option.id}
                className={`relative overflow-hidden rounded-xl border-2 p-5 transition-all ${
                  isSelected
                    ? "border-blue-500 bg-blue-50"
                    : hasVoted
                    ? "border-blue-100 bg-white"
                    : "border-blue-200 bg-white hover:border-blue-400 hover:shadow-md cursor-pointer"
                }`}
              >
                {/* Progress bar */}
                {hasVoted && totalVotes > 0 && (
                  <div
                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-100 to-blue-50 transition-all duration-700 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3 flex-1">
                    {!hasVoted ? (
                      <button
                        onClick={() => submitVote(option.id)}
                        disabled={voting}
                        className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors disabled:cursor-not-allowed"
                      >
                        {voting ? "..." : "Vote"}
                      </button>
                    ) : (
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : "bg-blue-100"
                        }`}
                      >
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    )}
                    <span className="font-medium text-slate-800">
                      {option.text}
                    </span>
                  </div>

                  {hasVoted && (
                    <div className="flex items-center gap-3 text-right flex-shrink-0">
                      <div>
                        <div className="text-sm font-semibold text-blue-600">
                          {percentage}%
                        </div>
                        <div className="text-xs text-slate-500">
                          {option.votes_count}{" "}
                          {option.votes_count === 1 ? "vote" : "votes"}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status Bar */}
        <div
          className={`p-4 rounded-xl text-center text-sm border animate-fade-in ${
            hasVoted
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-blue-50 border-blue-200 text-blue-700"
          }`}
        >
          {voting && (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Submitting your vote...
            </span>
          )}
          {!hasVoted && !voting && (
            <span className="flex items-center justify-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Select an option to vote • Results update in real-time
            </span>
          )}
          {hasVoted && !voting && (
            <span className="flex items-center justify-center gap-2">
              <Check className="w-4 h-4" />
              Thank you for voting! Results update live
            </span>
          )}
        </div>
      </div>
    </div>
  );
}