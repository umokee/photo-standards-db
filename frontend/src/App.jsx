import { BrowserRouter, Route, Routes } from "react-router-dom";
import Header from "./components/Header";
import CamerasPage from "./pages/CamerasPage";
import GroupsPage from "./pages/GroupsPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  // const [auth, setAuth] = useState(false);

  // if (!auth) {
  //   return <LoginPage onLogin={() => setAuth(true)} />;
  // }

  return (
    <BrowserRouter>
      <div className="app">
        <Header />
        <div className="page-body">
          <Routes>
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/cameras" element={<CamerasPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
