"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Share2, Check, Home, Users, TrendingUp } from "lucide-react";

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Loading poll...</p>
        </div>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center max-w-md">
          <div className="text-6xl mb-4">😕</div>
          <h2 className="text-2xl font-bold mb-2">Poll Not Found</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <button
            onClick={() => router.push("/")}
            className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700"
          >
            Create a New Poll
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 py-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-3xl mx-auto">

        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="text-slate-600 hover:text-slate-900 mb-6 flex items-center gap-2"
        >
          <Home className="w-4 h-4" />
          Create New Poll
        </button>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-slate-800 mb-2">
              {poll?.question}
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{totalVotes} {totalVotes === 1 ? "vote" : "votes"}</span>
              </div>
              {hasVoted && (
                <div className="flex items-center gap-1 text-green-600">
                  <Check className="w-4 h-4" />
                  <span>You voted</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={copyShareLink}
            className="flex items-center gap-2 bg-white border border-slate-200 px-4 py-2 rounded-xl text-sm hover:bg-slate-50"
          >
            {copied ? <><Check className="w-4 h-4" />Copied!</> : <><Share2 className="w-4 h-4" />Share</>}
          </button>
        </div>

        {/* Error */}
        {error && poll && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Options */}
        <div className="space-y-3">
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
                    ? "border-slate-200 bg-white"
                    : "border-slate-200 bg-white hover:border-blue-400"
                }`}
              >
                {/* Progress bar */}
                {hasVoted && totalVotes > 0 && (
                  <div
                    className="absolute left-0 top-0 h-full bg-blue-100 transition-all duration-700 ease-out"
                    style={{ width: `${percentage}%` }}
                  />
                )}

                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {!hasVoted ? (
                      <button
                        onClick={() => submitVote(option.id)}
                        disabled={voting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                      >
                        {voting ? "..." : "Vote"}
                      </button>
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isSelected ? "bg-blue-600 text-white" : "bg-slate-100"
                      }`}>
                        {isSelected && <Check className="w-4 h-4" />}
                      </div>
                    )}
                    <span className="font-medium text-slate-800">{option.text}</span>
                  </div>

                  {hasVoted && (
                    <div className="flex items-center gap-3 text-right">
                      <span className="text-sm text-slate-500">
                        {option.votes_count} {option.votes_count === 1 ? "vote" : "votes"}
                      </span>
                      <span className="text-base font-bold text-blue-600 w-12 text-right">
                        {percentage}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Status */}
        <div className={`mt-6 p-4 rounded-xl text-center text-sm border ${
          hasVoted
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-blue-50 border-blue-200 text-blue-700"
        }`}>
          {voting && (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              Submitting...
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
              Vote recorded • Watch results update live
            </span>
          )}
        </div>

      </div>
    </div>
  );
}