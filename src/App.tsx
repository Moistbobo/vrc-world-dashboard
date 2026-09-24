import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout';
import { DashboardPage } from './views/dashboard';
import { WorldsPage } from './views/worlds';
import { TagsPage } from './views/tags';
import { ListsPage } from './views/lists';
import { ListDetailPage } from './views/list-detail';
import { WorldDetailPage } from './views/world-detail';
import { SettingsPage } from './views/settings';

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/worlds" element={<WorldsPage />} />
          <Route path="/worlds/:worldId" element={<WorldDetailPage />} />
          <Route path="/tags" element={<TagsPage />} />
          <Route path="/lists" element={<ListsPage />} />
          <Route path="/lists/:listId" element={<ListDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
