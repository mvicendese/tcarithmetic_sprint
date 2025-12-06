import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './components/ThemeContext';
import AppRouter from './AppRouter';

const App: React.FC = () => {
  console.log("App rendering");
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppRouter />
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
