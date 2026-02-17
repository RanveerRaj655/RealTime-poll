// Browser-side fingerprinting using localStorage
export const getBrowserFingerprint = (): string => {
  if (typeof window === "undefined") return "";

  const storedId = localStorage.getItem("browser_fingerprint");
  if (storedId) return storedId;

  // Generate a new fingerprint
  const fingerprint = `fp_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  localStorage.setItem("browser_fingerprint", fingerprint);
  return fingerprint;
};

export const hasVotedInPoll = (pollId: string): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(`poll_voted_${pollId}`) === "true";
};

export const markPollAsVoted = (pollId: string): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(`poll_voted_${pollId}`, "true");
};

// Server-side IP hashing
export const hashIP = async (ip: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
};

// Get client IP from request headers
export const getClientIP = (request: Request): string => {
  const headers = [
    "x-forwarded-for",
    "x-real-ip",
    "cf-connecting-ip",
    "x-client-ip",
  ];

  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      const ip = value.split(",")[0].trim();
      if (ip) return ip;
    }
  }

  return "unknown";
};
