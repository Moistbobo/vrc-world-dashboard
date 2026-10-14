import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { DashboardPage } from './pages/dashboard';
import { WorldsPage } from './pages/worlds';
import { AssistantPage } from './pages/assistant';
import { TagsPage } from './pages/tags';
import { ListsPage } from './pages/lists';
import { ListDetailPage } from './pages/list-detail';
import { WorldDetailPage } from './pages/world-detail';
import { SettingsPage } from './pages/settings';
import { NotFoundPage } from './pages/not-found';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/worlds" element={<WorldsPage />} />
          <Route path="/assistant" element={<AssistantPage />} />
          <Route path="/worlds/:worldId" element={<WorldDetailPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/lists/:listId" element={<ListDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
