import React, { useState, useEffect } from 'react';
import { StudentUser, TestAttempt, Class } from '../types';
import * as api from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import StudentTest from './StudentTest';
import ResultsScreen from './ResultsScreen';
import ResultsModal from './ResultsModal';
import { ThemeToggle } from './ThemeToggle';
import ChangePasswordModal from './ChangePasswordModal';
import ProgressChart from './ProgressChart';
import { TrendingUp, FileText, Play } from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const currentUser = user as StudentUser;

  const [gameState, setGameState] = useState<'idle' | 'testing'>('idle');
  const [showResults, setShowResults] = useState(false);
  const [lastAttempt, setLastAttempt] = useState<TestAttempt | null>(null);
  const [testHistory, setTestHistory] = useState<TestAttempt[]>([]);
  const [enrolledClasses, setEnrolledClasses] = useState<Class[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const RESULTS_PER_PAGE = 6; // Adjusted for better fit with new layout

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser?.id) {
        try {
          // Fetch Test History
          const history = await api.getStudentTestResults(currentUser.id);
          setTestHistory(history);

          // Fetch Enrolled Classes
          const allClasses = await api.getAllClasses();
          // Filter classes where this student is enrolled
          const myClasses = allClasses.filter(c =>
            (c.studentIds || []).includes(currentUser.id) ||
            (currentUser.classIds || []).includes(c.id)
          );
          setEnrolledClasses(myClasses);

        } catch (error) {
          console.error("Failed to load student data:", error);
        }
      }
    };

    fetchData();
  }, [currentUser?.id]);

  const handleTestComplete = async (attempt: TestAttempt) => {
    try {
      await api.saveTestResult(currentUser.id, attempt);
      // Refresh history
      const history = await api.getStudentTestResults(currentUser.id);
      setTestHistory(history);
      setLastAttempt(attempt);

      // Refresh user profile to get new level
      await refreshUser();

      setGameState('idle');
      setShowResults(true);

      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.log(err));
      }
    } catch (error) {
      console.error("Failed to save test results:", error);
    }
  };

  const startTest = () => {
    if (currentUser.locked) {
      alert("Your account is currently locked by the teacher.");
      return;
    }
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
      elem.requestFullscreen().catch(err => {
        console.log("Fullscreen denied:", err);
      });
    }
    setGameState('testing');
  };

  if (gameState === 'testing') {
    return (
      <div className="fixed inset-0 bg-white dark:bg-slate-900 z-50 overflow-hidden">
        <StudentTest
          level={currentUser.currentLevel}
          onComplete={handleTestComplete}
        />
      </div>
    );
  }

  // Pagination logic & Date Parsing
  const sortedHistory = [...testHistory].sort((a, b) => {
    const dateA = a.date && typeof (a.date as any).toDate === 'function' ? (a.date as any).toDate() : new Date(a.date);
    const dateB = b.date && typeof (b.date as any).toDate === 'function' ? (b.date as any).toDate() : new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });

  const totalPages = Math.ceil(sortedHistory.length / RESULTS_PER_PAGE);
  const paginatedHistory = sortedHistory.slice((currentPage - 1) * RESULTS_PER_PAGE, currentPage * RESULTS_PER_PAGE);

  // Chart Data Preparation
  const chartData = [...testHistory]
    .map(attempt => {
      let date: Date;
      try {
        if (attempt.date && typeof (attempt.date as any).toDate === 'function') {
          date = (attempt.date as any).toDate();
        } else if (attempt.date) {
          date = new Date(attempt.date);
        } else {
          date = new Date();
        }
        if (isNaN(date.getTime())) date = new Date();
      } catch (e) {
        date = new Date();
      }
      return { ...attempt, dateObj: date };
    })
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .map(attempt => {
      const date = attempt.dateObj;
      return {
        dateStr: date.toLocaleDateString(),
        shortDate: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        score: attempt.score,
        level: attempt.level,
        fullDate: date,
        timestamp: date.getTime(),
        uniqueId: attempt.id
      };
    });

  const formatTimeRemaining = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-sans transition-colors duration-200">
      {/* Gradient Ribbon Bar */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500" />
      {/* Header Banner */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-6 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {currentUser.firstName} {currentUser.surname}
            </h1>
          </div>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <button
              onClick={() => setShowChangePassword(true)}
              className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white underline"
            >
              Change Password
            </button>
            <button
              onClick={logout}
              className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 font-medium ml-2"
            >
              Sign Out
            </button>
          </div >
        </div >
      </div >

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT COLUMN: Student Information (lg:col-span-1) */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-full">
            <div className="space-y-4 flex-grow">
              {/* Enrolled Classes (Inline) */}
              <div>
                {enrolledClasses.length === 0 ? (
                  <p className="text-slate-500 italic text-sm">Not enrolled in any classes</p>
                ) : (
                  <div className="space-y-1">
                    {enrolledClasses.map(c => (
                      <p key={c.id} className="text-xl font-bold text-slate-800 dark:text-slate-200">
                        {c.name}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              {/* General AI Summary */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Summary</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 leading-relaxed min-h-[80px]">
                  {currentUser.aiSummary ? (
                    currentUser.aiSummary
                  ) : (
                    <span className="text-slate-400 italic">No summary available.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Start Test Button (Primary Action) */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={startTest}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>Start Level {currentUser.currentLevel || 1} Test</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Results Table (lg:col-span-5) */}
        <div className="lg:col-span-1 h-full">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">Results</h3>
              <div className="flex gap-2">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30"
                >
                  &lt;
                </button>
                <span className="text-slate-500 dark:text-slate-400 font-mono text-sm">{currentPage} / {Math.max(1, totalPages)}</span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="p-1 text-slate-400 hover:text-slate-800 dark:hover:text-white disabled:opacity-30"
                >
                  &gt;
                </button>
              </div>
            </div>

            <div className="overflow-x-auto flex-grow">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-3 font-medium w-1/4">Date</th>
                    <th className="text-left py-3 font-medium w-1/4">Level</th>
                    <th className="text-left py-3 font-medium w-1/4">Correct</th>
                    <th className="text-right py-3 font-medium w-1/4">Time Left</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedHistory.length === 0 ? (
                    <tr><td colSpan={4} className="py-8 text-center text-slate-500">No results yet</td></tr>
                  ) : (
                    paginatedHistory.map((result, idx) => {
                      const dateObj = result.date && typeof (result.date as any).toDate === 'function'
                        ? (result.date as any).toDate()
                        : new Date(result.date);
                      const shortDate = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                      return (
                        <tr
                          key={idx}
                          onClick={() => {
                            setLastAttempt(result);
                            setShowResults(true);
                          }}
                          className="border-b border-slate-100 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3">{shortDate}</td>
                          <td className="py-3">Level {result.level}</td>
                          <td className="py-3 font-bold text-slate-900 dark:text-white">
                            {result.answeredQuestions ? result.answeredQuestions.filter((q: any) => q.isCorrect).length : 0}
                          </td>
                          <td className="py-3 font-mono text-slate-500 dark:text-slate-400 text-right">{formatTimeRemaining(result.timeRemaining)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: Progress Chart (col-span-full) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Performance History
          </h3>
          <div className="h-48 w-full">
            <ProgressChart data={chartData} />
          </div>
        </div>

      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />

      <ResultsModal
        isOpen={showResults}
        onClose={() => setShowResults(false)}
        attempt={lastAttempt}
      />
    </div >
  );
};

export default StudentDashboard;