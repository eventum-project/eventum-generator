import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';

import Layout from './Layout';
import GeneratorsListPage from './pages/GeneratorInstances';
import { routes } from './routes/index';

function App() {
  return (
    <Router>
      <Routes>
        <Route
          path={routes.generatorInstances}
          element={
            <Layout>
              <GeneratorsListPage />
            </Layout>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
