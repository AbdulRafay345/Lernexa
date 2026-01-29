import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase";
import { onAuthStateChanged } from "firebase/auth";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, Upload, FileText, X, Loader2 } from "lucide-react";
import QuizTaker from "./QuizTaker";

export default function QuizGenerator() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("upload");
  const [files, setFiles] = useState([]);
  const [documentContent, setDocumentContent] = useState("");
  const [title, setTitle] = useState("");
  const [quantity, setQuantity] = useState(5);
  const [quizType, setQuizType] = useState("mcq");
  const [difficulty, setDifficulty] = useState("medium");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) setUser(currentUser);
      else navigate("/auth");
    });
    return unsubscribe;
  }, [navigate]);

  const handleFileUpload = async (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    let newContent = documentContent;

    for (const file of selectedFiles) {
      if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        try {
          const text = await file.text();
          newContent += "\n\n" + text;
        } catch (error) {
          toast.error(`Failed to read ${file.name}`);
          console.error(error);
        }
      } else {
        toast.error(`${file.name} is not a supported file type`);
      }
    }

    setDocumentContent(newContent);
    setFiles((prev) => [...prev, ...selectedFiles]);
    toast.success(`${selectedFiles.length} file(s) added`);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    if (files.length === 1) setDocumentContent("");
  };

  const generateQuiz = async () => {
    if (!documentContent.trim()) {
      toast.error("Please upload at least one document");
      return;
    }

    if (documentContent.trim().length < 100) {
      toast.error("Document content is too short. Please upload more substantial content.");
      return;
    }

    setLoading(true);

    try {
      // ✅ FIXED: Added const keyword
      const response = await fetch("http://localhost:4000/generate-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          documentContent,
          quantity,
          quizType,
          difficulty,
        }),
      });

      const data = await response.json();

      // ✅ IMPROVED: Better error handling
      if (!response.ok) {
        console.error("API Error Response:", data);
        const errorMessage = data.error?.message || 
                           data.error || 
                           data.details?.message || 
                           "Failed to generate quiz";
        toast.error(errorMessage);
        return;
      }

      // ✅ Check if API call was successful
      if (data.success) {
        if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
          toast.error("No questions were generated. Please try again.");
          return;
        }

        setQuestions(data.questions);
        toast.success(`Quiz generated successfully! ${data.questions.length} questions created.`);
        setStep("quiz");
      } else {
        toast.error(data.error || "Failed to generate quiz");
      }

    } catch (err) {
      console.error("Quiz generation error:", err);
      
      // ✅ Better error messages
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        toast.error("Cannot connect to server. Make sure the backend is running on port 4000.");
      } else {
        toast.error(err.message || "Failed to generate quiz");
      }
      
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = (userAnswers, score) => {
    toast.success(`Quiz completed! Score: ${score}/${questions.length}`);
    // setTimeout(() => {
    //   setStep("upload");
    //   setQuestions([]);
    //   setDocumentContent("");
    //   setFiles([]);
    // }, 2000);
  };

  // ✅ Add a reset function
  const resetQuiz = () => {
    setStep("upload");
    setQuestions([]);
    setDocumentContent("");
    setFiles([]);
    setTitle("");
  };
  

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#D4C0E9] via-[#C3A6E0] to-[#CCB3E5]">
      {/* Header */}
      <header className="bg-white/40 backdrop-blur-md border-b border-[#68369B]/10 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between max-w-6xl">
          <button 
            onClick={step === "quiz" ? resetQuiz : () => navigate(-1)} 
            className="flex items-center gap-2 text-[#68369B] hover:text-[#9D64CF] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-semibold text-sm">
              {step === "quiz" ? "New Quiz" : "Back"}
            </span>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#68369B] to-[#9D64CF] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-[#161721]">Quiz Generator</span>
          </div>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        {step === "upload" && (
          <div className="space-y-5">
            {/* Hero */}
            <div className="text-center space-y-2 py-3">
              <h1 className="text-3xl font-bold text-[#161721]">Create Your Quiz</h1>
              <p className="text-sm text-[#68369B]">Upload study materials and customize your quiz settings</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-6 shadow border border-[#68369B]/10">
                  <Label htmlFor="title" className="text-[#161721] text-sm font-semibold mb-2 block">Quiz Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g., Biology Chapter 5 Quiz"
                    className="bg-white border-[#9D64CF]/30 text-[#161721] placeholder:text-[#9D64CF]/50 h-10 focus:border-[#68369B] focus:ring-1 focus:ring-[#68369B]/20 rounded-lg"
                  />
                </div>

                {/* File Upload */}
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow border border-[#68369B]/10">
                  <Label className="text-[#161721] text-sm font-semibold mb-3 block">Upload Study Materials</Label>
                  <label className="border-2 border-dashed border-[#9D64CF]/40 rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer hover:border-[#68369B] hover:bg-[#CCB3E5]/20 transition-all">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#68369B]/20 to-[#9D64CF]/20 flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-[#68369B]" />
                    </div>
                    <span className="text-[#161721] font-semibold text-sm mb-1">Drop files or click to browse</span>
                    <span className="text-xs text-[#68369B]">TXT, MD files supported</span>
                    <input 
                      type="file" 
                      multiple 
                      accept=".txt,.md,.text" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>

                  {files.length > 0 && (
                    <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                      {files.map((file, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-white/80 rounded-lg p-3 border border-[#9D64CF]/20">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#68369B] to-[#9D64CF] flex items-center justify-center">
                              <FileText className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[#161721] font-medium text-sm">{file.name}</span>
                              <span className="text-[#9D64CF] text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => removeFile(idx)} 
                            className="text-[#9D64CF] hover:text-red-500 transition-colors p-1"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Content Preview */}
                  {documentContent && (
                    <div className="mt-4">
                      <Label className="text-[#161721] text-xs font-semibold mb-2 block">
                        Content Preview ({documentContent.length} characters)
                      </Label>
                      <div className="bg-white/80 rounded-lg p-3 border border-[#9D64CF]/20 max-h-40 overflow-y-auto">
                        <p className="text-sm text-[#161721]">
                          {documentContent.length > 300 
                            ? documentContent.substring(0, 300) + "..." 
                            : documentContent}
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <Button
                  onClick={generateQuiz}
                  disabled={loading || files.length === 0}
                  className="w-full h-11 bg-gradient-to-r from-[#68369B] to-[#9D64CF] hover:from-[#68369B] hover:to-[#68369B] text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Generating Quiz...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Generate Quiz
                    </>
                  )}
                </Button>
              </div>

              {/* Right Column - Settings */}
              <div className="space-y-4">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 shadow border border-[#68369B]/10">
                  <h3 className="text-[#161721] font-bold text-base mb-4">Quiz Settings</h3>

                  <div className="space-y-4">
                    {/* Questions */}
                    <div>
                      <Label className="text-[#161721] text-xs font-semibold mb-2 block">Questions</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[5, 10, 15, 20].map(num => (
                          <button
                            key={num}
                            onClick={() => setQuantity(num)}
                            className={`py-2 rounded-lg font-semibold text-sm transition-all ${
                              quantity === num
                                ? 'bg-gradient-to-br from-[#68369B] to-[#9D64CF] text-white shadow'
                                : 'bg-white border border-[#9D64CF]/30 text-[#68369B] hover:border-[#68369B]'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Type */}
                    <div>
                      <Label className="text-[#161721] text-xs font-semibold mb-2 block">Type</Label>
                      <div className="space-y-2">
                        <button
                          onClick={() => setQuizType('mcq')}
                          className={`w-full py-2 rounded-lg font-medium text-sm transition-all ${
                            quizType === 'mcq'
                              ? 'bg-gradient-to-br from-[#68369B] to-[#9D64CF] text-white shadow'
                              : 'bg-white border border-[#9D64CF]/30 text-[#68369B] hover:border-[#68369B]'
                          }`}
                        >
                          Multiple Choice
                        </button>
                        <button
                          onClick={() => setQuizType('open-ended')}
                          className={`w-full py-2 rounded-lg font-medium text-sm transition-all ${
                            quizType === 'open-ended'
                              ? 'bg-gradient-to-br from-[#68369B] to-[#9D64CF] text-white shadow'
                              : 'bg-white border border-[#9D64CF]/30 text-[#68369B] hover:border-[#68369B]'
                          }`}
                        >
                          Open Ended
                        </button>
                      </div>
                    </div>

                    {/* Difficulty */}
                    <div>
                      <Label className="text-[#161721] text-xs font-semibold mb-2 block">Difficulty</Label>
                      <div className="space-y-2">
                        {['easy', 'medium', 'hard'].map(level => (
                          <button
                            key={level}
                            onClick={() => setDifficulty(level)}
                            className={`w-full py-2 rounded-lg font-medium text-sm capitalize transition-all ${
                              difficulty === level
                                ? 'bg-gradient-to-br from-[#68369B] to-[#9D64CF] text-white shadow'
                                : 'bg-white border border-[#9D64CF]/30 text-[#68369B] hover:border-[#68369B]'
                            }`}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Summary */}
                    <div className="pt-4 border-t border-[#9D64CF]/20">
                      <Label className="text-[#161721] text-xs font-semibold mb-2 block">Summary</Label>
                      <div className="text-sm text-[#68369B] space-y-1">
                        <p>• {quantity} questions</p>
                        <p>• {quizType === 'mcq' ? 'Multiple Choice' : 'Open Ended'}</p>
                        <p>• {difficulty} difficulty</p>
                        <p>• {files.length} file(s) uploaded</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quiz Step */}
        {step === "quiz" && questions.length > 0 && (
          <QuizTaker
            questions={questions}
            quizType={quizType}
            onComplete={handleQuizComplete}
            quizTitle={title}
          />
        )}
      </main>
    </div>
  );
}