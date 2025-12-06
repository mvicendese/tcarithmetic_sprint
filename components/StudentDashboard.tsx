import React, { useState, useEffect } from 'react';
import { StudentUser, TestAttempt } from '../types';
import * as api from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';
import StudentTest from './StudentTest';
import ResultsScreen from './ResultsScreen';
import { ThemeToggle } from './ThemeToggle';
import ChangePasswordModal from './ChangePasswordModal';
import ProgressChart from './ProgressChart';
import { Trophy, Star, TrendingUp, Clock, Target, Award } from 'lucide-react';

const StudentDashboard: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const currentUser = user as StudentUser;

  const [gameState, setGameState] = useState<'idle' | 'testing' | 'results'>('idle');
  const [lastAttempt, setLastAttempt] = useState<TestAttempt | null>(null);
  const [testHistory, setTestHistory] = useState<TestAttempt[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);
  const [currentPage, setCurrentPage] = useState(1);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const RESULTS_PER_PAGE = 5;

  useEffect(() => {
    const fetchData = async () => {
      if (currentUser?.id) {
        try {
          const history = await api.getStudentTestResults(currentUser.id);
          setTestHistory(history);
        } catch (error) {
          console.error("Failed to load student data:", error);
        }
      }
    };

    fetchData();

    const onFullScreenChange = () => setIsFullScreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFullScreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullScreenChange);
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

      setGameState('results');
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

  if (gameState === 'results' && lastAttempt) {
    return (
      <ResultsScreen
        attempt={lastAttempt}
        onHome={() => setGameState('idle')}
      />
    );
  }

  // Calculate stats
  const totalTests = testHistory.length;
  const bestScore = testHistory.reduce((max, t) => Math.max(max, t.score), 0);
  const averageScore = totalTests > 0
    ? Math.round(testHistory.reduce((sum, t) => sum + t.score, 0) / totalTests)
    : 0;

  // Pagination logic
  const totalPages = Math.ceil(testHistory.length / RESULTS_PER_PAGE);
  const paginatedHistory = testHistory
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice((currentPage - 1) * RESULTS_PER_PAGE, currentPage * RESULTS_PER_PAGE);

  // Prepare chart data
  const chartData = testHistory
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()) // Oldest first for chart
    .map(attempt => {
      const date = new Date(attempt.date);
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-sans transition-colors duration-200">
      {/* Header Banner */}
      <div className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-md border-b border-slate-200 dark:border-slate-700 p-6 sticky top-0 z-10 transition-colors duration-200">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-500 bg-clip-text text-transparent">
              Welcome, {currentUser.firstName}!
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium">Ready to boost your math skills?</p>
          </div>
          <div className="flex gap-4 items-center">
            <ThemeToggle />
            <div className="bg-white dark:bg-slate-700 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-600 shadow-sm">
              <span className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Current Level</span>
              <div className="text-2xl font-black text-blue-600 dark:text-blue-400">{currentUser.currentLevel}</div>
            </div>
            <button
              onClick={() => setShowChangePassword(true)}
              className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-500 dark:text-slate-400"
              title="Change Password"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-shadow duration-200 group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-500/10 rounded-xl group-hover:scale-110 transition-transform duration-200">
                <Trophy className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Best Score</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{bestScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-shadow duration-200 group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 rounded-xl group-hover:scale-110 transition-transform duration-200">
                <TrendingUp className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Average</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-shadow duration-200 group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl group-hover:scale-110 transition-transform duration-200">
                <Target className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tests Taken</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalTests}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700 hover:shadow-xl transition-shadow duration-200 group">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-500/10 rounded-xl group-hover:scale-110 transition-transform duration-200">
                <Award className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Current Level</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{currentUser.currentLevel}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content - Left 2/3 */}
          <div className="lg:col-span-2 space-y-8">
            {/* Start Test Card */}
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl p-8 shadow-2xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors duration-500"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full -ml-12 -mb-12 blur-2xl"></div>

              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-4">Ready for a Challenge?</h2>
                <p className="text-blue-100 mb-8 max-w-lg text-lg">
                  Test your arithmetic skills and climb the leaderboard. You have 60 seconds to solve as many problems as you can!
                </p>
                <button
                  onClick={startTest}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-4 px-8 rounded-2xl shadow-lg transition-all transform hover:scale-105 hover:shadow-xl flex items-center gap-3 text-lg"
                >
                  <div className="p-1 bg-blue-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                  Start New Test
                </button>
              </div>
            </div>

            {/* Progress Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-500" />
                Progress Over Time
              </h3>
              <div className="h-80 w-full">
                <ProgressChart data={chartData} />
              </div>
            </div>
          </div>

          {/* Sidebar - Right 1/3 */}
          <div className="space-y-8">
            {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl border border-slate-200 dark:border-slate-700 h-full flex flex-col">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-500" />
                Recent Activity
              </h3>

              <div className="space-y-4 flex-grow">
                {paginatedHistory.length > 0 ? (
                  paginatedHistory.map((attempt, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-500/30 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${attempt.score >= 90 ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' :
                          attempt.score >= 70 ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' :
                            'bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                          }`}>
                          <Star className="w-5 h-5 fill-current" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white">{attempt.score}% Score</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(attempt.date).toLocaleDateString()} • Level {attempt.level}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                          {attempt.correctCount}/{attempt.totalQuestions}
                        </span>
                        {attempt.summary && (
                          <span className="ml-2 text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300">
                            ✨ AI
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    <p>No tests taken yet.</p>
                    <p className="text-sm mt-1">Start your first test above!</p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center gap-2 mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ←
                  </button>
                  <span className="py-2 px-4 text-sm font-medium text-slate-600 dark:text-slate-300">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div >
  );
};

export default StudentDashboard;