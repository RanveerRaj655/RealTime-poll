"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient"
import { Plus, X, BarChart3, Zap } from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

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

      // Redirect to poll page
      router.push(`/poll/${poll.id}`);
    } catch (err) {
      console.error("Error creating poll:", err);
      setError("Failed to create poll. Please try again.");
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <div className="text-center mb-12 animate-fade-in">
        <div className="flex items-center justify-center gap-3 mb-4">
          <BarChart3 className="w-12 h-12 text-blue-600" />
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            PollSync
          </h1>
        </div>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto">
          Create instant polls and watch results update in real-time
        </p>
        <div className="flex items-center justify-center gap-6 mt-6 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" />
            <span>Real-time updates</span>
          </div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-500" />
            <span>Live results</span>
          </div>
        </div>
      </div>

      {/* Poll Creation Form */}
      <div className="w-full max-w-2xl card p-8 animate-slide-up">
        <h2 className="text-2xl font-bold mb-6 text-slate-800">
          Create a New Poll
        </h2>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="space-y-6">
          {/* Question Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Your Question
            </label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="What's your favorite programming language?"
              className="input-field"
              maxLength={200}
            />
          </div>

          {/* Options */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Answer Options
            </label>
            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="input-field"
                    maxLength={100}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => removeOption(index)}
                      className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                      type="button"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                onClick={addOption}
                className="mt-3 flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
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
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Creating...
              </span>
            ) : (
              "Create Poll"
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 text-center text-sm text-slate-500">
        <p>Share your poll link and watch votes come in live ✨</p>
      </div>
    </div>
  );
}