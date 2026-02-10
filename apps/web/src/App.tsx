import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import RepoPage from './pages/RepoPage';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/repos/:id" element={<RepoPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
