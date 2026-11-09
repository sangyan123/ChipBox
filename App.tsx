import React from 'react';
import { HashRouter } from 'react-router-dom';
import AppShell from './components/AppShell';

const App: React.FC = () => {
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  );
};

export default App;
