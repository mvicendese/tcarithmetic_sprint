import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

interface PrivateRouteProps {
    allowedRoles: Role[];
    checkAdmin?: boolean;
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles, checkAdmin }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (!allowedRoles.includes(user.role)) {
        // Redirect based on their actual role
        if (user.role === 'student') return <Navigate to="/student" replace />;
        if (user.role === 'teacher') return <Navigate to="/teacher" replace />;
        return <Navigate to="/" replace />;
    }

    if (checkAdmin) {
        if (user.role === 'teacher' && !(user as any).isAdmin) {
            return <Navigate to="/teacher" replace />;
        }
    }

    return <Outlet />;
};

export default PrivateRoute;
