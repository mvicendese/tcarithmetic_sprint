import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import LoginScreen from './components/LoginScreen';
import StudentDashboard from './components/StudentDashboard';
import TeacherDashboard from './components/TeacherDashboard';
import AdminDashboard from './components/AdminDashboard';
import PrivateRoute from './components/PrivateRoute';

// Wrapper for TeacherDashboard to handle navigation
const TeacherDashboardWrapper: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <TeacherDashboard
            user={user?.role === 'teacher' ? undefined : (user as any)}
            onSwitchToAdminView={
                user?.role === 'teacher' && (user as any).isAdmin ? () => navigate('/admin') : undefined
            }
        />
    );
};

const AppRouter: React.FC = () => {
    const { user, loading } = useAuth();
    console.log("AppRouter rendering", { user, loading });

    if (loading) {
        return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">Loading Application...</div>;
    }

    return (
        <Router>
            <Routes>
                {/* Public Route: Login */}
                <Route path="/" element={
                    user ? (
                        user.role === 'student' ? <Navigate to="/student" replace /> :
                            user.role === 'teacher' ? (
                                (user as any).isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/teacher" replace />
                            ) :
                                <Navigate to="/login" replace />
                    ) : (
                        <LoginScreen />
                    )
                } />

                <Route path="/login" element={<Navigate to="/" replace />} />

                {/* Protected Routes */}
                <Route element={<PrivateRoute allowedRoles={['student']} />}>
                    <Route path="/student" element={<StudentDashboard />} />
                </Route>

                <Route element={<PrivateRoute allowedRoles={['teacher']} />}>
                    <Route path="/teacher" element={<TeacherDashboardWrapper />} />
                </Route>

                <Route element={<PrivateRoute allowedRoles={['teacher']} checkAdmin={true} />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                </Route>

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </Router>
    );
};

export default AppRouter;
